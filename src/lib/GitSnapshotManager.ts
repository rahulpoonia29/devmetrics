import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import simpleGit, { DiffResult, SimpleGit } from "simple-git";

/**
 * Summary of Git diff statistics.
 */
export interface GitDiffSummary {
    filesChanged: number;
    insertions: number;
    deletions: number;
}

/**
 * Manages Git snapshots of a project folder in a separate tracking repository.
 * This class handles git repository initialization, copying project files, committing snapshots,
 * and calculating diff summaries between snapshots.
 */
export class GitSnapshotManager {
    private sourceFolder: string; // Path to the user's project folder being tracked
    private repoFolder: string; // Path to the separate hidden git repo folder in extension storage
    private prevCommit: string | null = null; // Hash of the previous commit for diffing
    private git: SimpleGit;

    /**
     * Constructor for GitSnapshotManager.
     * @param sourceFolder The absolute path to the user's project folder.
     * @param repoFolder The absolute path to the dedicated git repository folder in extension storage.
     */
    constructor(sourceFolder: string, repoFolder: string) {
        this.sourceFolder = sourceFolder;
        this.repoFolder = repoFolder;
        this.git = simpleGit(this.repoFolder);
    }

    /**
     * Initializes the tracking repository.
     * If the repository doesn't exist, it's created and the initial state of the source folder is copied and committed.
     * If it exists, it ensures the repository is initialized for use.
     */
    public async init(): Promise<void> {
        await fse.ensureDir(this.repoFolder); // Ensure the repo folder exists in global storage

        const gitDir = path.join(this.repoFolder, ".git");

        if (!fs.existsSync(gitDir)) {
            // Initialize a new git repository *only if it doesn't exist*
            await this.git.init();

            // Copy all files from the source folder to the tracking repo folder for the initial snapshot
            await fse.copy(this.sourceFolder, this.repoFolder, {
                overwrite: true,
                filter: this.excludeDotGitFolder,
            });

            await this.git.add("./*"); // Stage all copied files in the tracking repo
            await this.git.commit("Initial commit - Copy of source folder"); // Create the initial commit
        } // else - if .git folder exists, assume repo is already initialized and ready to use.

        // Get the HEAD commit hash after initialization or if repo existed.
        try {
            this.prevCommit = await this.git.revparse(["HEAD"]); // Get the current commit hash
        } catch (error) {
            console.warn(
                "Warning: Could not get HEAD commit after init.",
                error
            );
            this.prevCommit = null; // Handle case where no commits yet (though unlikely after init)
        }
    }

    /**
     * Takes a snapshot of the current project folder, commits changes to the tracking repo, and computes the diff.
     * @returns GitDiffSummary | null - Summary of changes, or null if no significant changes or error.
     */
    public async takeSnapshot(): Promise<GitDiffSummary | null> {
        try {
            // Refresh repo contents by copying current source files, overwriting tracked files in the hidden repo.
            await fse.copy(this.sourceFolder, this.repoFolder, {
                overwrite: true,
                filter: this.excludeDotGitFolder,
            });

            await this.git.add("."); // Stage all changes

            try {
                await this.git.commit(`Snapshot at ${Date.now()}`);
            } catch (commitError: unknown) {
                // Explicitly type commitError as any to access includes method
                if (String(commitError).includes("nothing to commit")) {
                    console.warn("No changes to commit since last snapshot.");
                    return null; // Gracefully return null if no changes in the project folder.
                } else {
                    throw commitError; // Re-throw other commit errors for handling
                }
            }

            const newCommitHash = await this.git.revparse(["HEAD"]); // Get the hash of the *new* commit

            if (!this.prevCommit || this.prevCommit === newCommitHash) {
                // No actual changes committed, or first snapshot.
                this.prevCommit = newCommitHash; // Update prevCommit even if no changes for next diff.
                return null;
            }

            let diffSummary: GitDiffSummary = this.createEmptyDiffSummary();
            try {
                // Calculate diff summary stats between the previous and new commits.
                const diffOutput: DiffResult = await this.git.diffSummary([
                    "--shortstat",
                    this.prevCommit,
                    newCommitHash,
                ]);
                diffSummary = this.parseDiffShortStat(
                    diffOutput.files.join("\n")
                );
            } catch (diffError: any) {
                console.error("Error getting diff summary:", diffError);
                return this.createEmptyDiffSummary();
            }

            this.prevCommit = newCommitHash;
            return diffSummary;
        } catch (error) {
            console.error("Error taking git snapshot:", error);
            return null;
        }
        // return {
        //     filesChanged: 0,
        //     insertions: 0,
        //     deletions: 0,
        // };
    }

    /**
     * Parses the output of `git diff --shortstat` to extract GitDiffSummary metrics.
     * @param diffOutput String output from git diff --shortstat.
     * @returns GitDiffSummary - Parsed diff summary object.
     * @private
     */
    private parseDiffShortStat(diffOutput: string): GitDiffSummary {
        const regex =
            /(\d+)\s+files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/;
        const match = diffOutput.match(regex);
        if (match) {
            return {
                filesChanged: parseInt(match[1], 10),
                insertions: match[2] ? parseInt(match[2], 10) : 0,
                deletions: match[3] ? parseInt(match[3], 10) : 0,
            };
        }
        return this.createEmptyDiffSummary();
    }

    /**
     * Creates and returns an empty GitDiffSummary object (all metrics set to 0).
     * @returns GitDiffSummary - Empty diff summary.
     * @private
     */
    private createEmptyDiffSummary(): GitDiffSummary {
        return { filesChanged: 0, insertions: 0, deletions: 0 };
    }

    /**
     * Filter function to exclude .git directories during file copy operations.
     * Prevents copying the tracking repo into itself and avoids issues.
     * @param src The path of the file/directory being copied.
     * @param dest The destination path.
     * @returns boolean - True if the item should be copied, false if excluded.
     * @private
     */
    private excludeDotGitFolder(src: string, dest: string): boolean {
        return (
            !src.includes(path.sep + ".git" + path.sep) &&
            src !== path.join(dest, ".git")
        );
    }
}
