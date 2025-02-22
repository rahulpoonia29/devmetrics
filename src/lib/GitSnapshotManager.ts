import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";

import parseGitDiff from "parse-git-diff";
import simpleGit, { GitError, SimpleGit } from "simple-git";

interface GitDiffSummary {
    filesChanged: number;
    insertions: number;
    deletions: number;
}

interface LineChange {
    changeType: "Added" | "Deleted" | "Modified" | "Unchanged";
    content: string;
}

interface FileChange {
    filePath: string;
    changeType: "DeletedFile" | "ChangedFile" | "AddedFile" | "RenamedFile";
    lineChanges: LineChange[];
    addedLinesCount: number;
    deletedLinesCount: number;
    modifiedLinesCount: number;
}

export interface DiffData {
    summary: GitDiffSummary;
    changes: FileChange[];
}

export class GitSnapshotManager {
    private readonly sourceFolderPath: string;
    private readonly repoFolderPath: string;
    private prevCommitHash: string | null = null;
    private readonly git: SimpleGit;

    constructor(sourceFolderPath: string, repoFolderPath: string) {
        this.sourceFolderPath = sourceFolderPath;
        this.repoFolderPath = repoFolderPath;
        fse.ensureDirSync(this.repoFolderPath);
        this.git = simpleGit(this.repoFolderPath);
    }

    public async init(): Promise<void> {
        if (!fs.existsSync(this.sourceFolderPath)) {
            throw new Error("Source folder does not exist.");
        }

        if (!fs.statSync(this.sourceFolderPath).isDirectory()) {
            throw new Error("Source path is not a directory.");
        }

        fse.ensureDirSync(this.repoFolderPath);
        const gitDir: string = path.join(this.repoFolderPath, ".git");

        if (!fs.existsSync(gitDir)) {
            try {
                await this.git.init();
                await fse.copy(this.sourceFolderPath, this.repoFolderPath, {
                    overwrite: true,
                    filter: this.excludeDotGitFolder,
                });

                const files: string[] = await fse.readdir(this.repoFolderPath);
                if (files.length === 0) {
                    throw new Error("No files in source folder to track");
                }

                await this.git.add("./*");
                await this.git.commit("Initial commit");
            } catch (error: unknown) {
                if (error instanceof GitError) {
                    error.message = `Git error: ${error.message}`;
                    throw new Error(error.message);
                }
                throw new Error(
                    `Init failed: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
        }

        try {
            this.prevCommitHash = await this.git.revparse(["HEAD"]);
        } catch (error) {
            this.prevCommitHash = null;
        }
    }

    public async takeSnapshot(): Promise<DiffData | void> {
        try {
            await fse.copy(this.sourceFolderPath, this.repoFolderPath, {
                overwrite: true,
                filter: this.excludeDotGitFolder,
            });

            await this.git.add(".");

            try {
                await this.git.commit(`Snapshot at ${Date.now()}`);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message.includes("nothing to commit")
                ) {
                    return;
                }
                throw error;
            }

            const newCommitHash = await this.git.revparse(["HEAD"]);

            if (!this.prevCommitHash || this.prevCommitHash === newCommitHash) {
                this.prevCommitHash = newCommitHash;
                return;
            }

            // Get detailed diff string
            const diffString = await this.git.diff([
                this.prevCommitHash,
                newCommitHash,
            ]);
            const diffSummary = await this.git.diffSummary([
                this.prevCommitHash,
                newCommitHash,
            ]);
            const diffObject = parseGitDiff(diffString);

            const summary: GitDiffSummary = {
                filesChanged: diffSummary.files.length,
                insertions: diffSummary.insertions,
                deletions: diffSummary.deletions,
            };

            const lineChanges = this.extractFileChanges(diffObject);

            this.prevCommitHash = newCommitHash;
            return {
                summary,
                changes: lineChanges,
            };
        } catch (error: unknown) {
            if (error instanceof GitError) {
                error.message = `Git error: ${error.message}`;
                throw new Error(error.message);
            }
            throw new Error(
                `Take snapshot failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    private extractFileChanges(diffJson: any): FileChange[] {
        const fileChanges: FileChange[] = diffJson.files.map((file: any) => {
            const lineChanges: LineChange[] = [];

            let addedLinesCount = 0,
                deletedLinesCount = 0,
                modifiedLinesCount = 0;

            file.chunks.map((chunk: any) => {
                chunk.changes.forEach(
                    (change: {
                        type: "AddedLine" | "DeletedLine" | "ModifiedLine";
                        content: string;
                        lineBefore: number;
                    }) => {
                        const lineChange: LineChange = {
                            changeType:
                                change.type === "AddedLine"
                                    ? "Added"
                                    : change.type === "DeletedLine"
                                    ? "Deleted"
                                    : "Modified",
                            content: change.content,
                        };
                        lineChanges.push(lineChange);

                        if (change.type === "AddedLine") {
                            addedLinesCount++;
                        } else if (change.type === "DeletedLine") {
                            deletedLinesCount++;
                        } else if (change.type === "ModifiedLine") {
                            modifiedLinesCount++;
                        }
                    }
                );
            });

            return {
                filePath: file.path,
                changeType: file.type, //DeletedFile, ChangedFile, AddedFile, RenamedFile (From parse-git-diff)
                lineChanges,
                addedLinesCount,
                deletedLinesCount,
                modifiedLinesCount,
            };
        });

        return fileChanges;
    }

    private excludeDotGitFolder(src: string, dest: string): boolean {
        return (
            !src.includes(path.sep + ".git" + path.sep) &&
            src !== path.join(dest, ".git")
        );
    }
}
