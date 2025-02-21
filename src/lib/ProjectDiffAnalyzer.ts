import * as crypto from "crypto";
import * as path from "path";
import { window } from "vscode";
import { ChangeInterval } from "../types/Metrics";
import { GitDiffSummary, GitSnapshotManager } from "./GitSnapshotManager";
import { MetricsStorage } from "./MetricsStorage";

/**
 * Analyzes changes in a project folder using Git snapshot diffs at intervals.
 * This class manages the periodic analysis, interacts with GitSnapshotManager for git operations,
 * stores the metrics using MetricsStorage, and provides user feedback.
 */
export class ProjectDiffAnalyzer {
    private storage: MetricsStorage | null;
    private gitManager: GitSnapshotManager;
    private intervalMs: number;
    private analysisInterval: NodeJS.Timeout | null = null;
    private projectFolder: string; // Store project folder path

    /**
     * Constructor for ProjectDiffAnalyzer.
     * @param projectFolder The absolute path to the project folder being tracked.
     * @param storage MetricsStorage instance for persistent storage (optional for MVP v0.1).
     * @param globalStoragePath VS Code global storage path for the extension.
     * @param intervalMinutes Interval in minutes to perform analysis (default 10 mins).
     */
    constructor(
        projectFolder: string,
        storage: MetricsStorage | null,
        globalStoragePath: string,
        intervalMinutes: number = 10
    ) {
        this.projectFolder = projectFolder;
        this.storage = storage;
        this.intervalMs = intervalMinutes * 60 * 1000;

        // Create a unique repo folder name in global storage *based on projectFolder*.
        // This ensures each project gets its own isolated tracking repo without conflicts.
        const sanitizedProjectFolderName = crypto
            .createHash("md5")
            .update(projectFolder)
            .digest("hex");

        const repoFolder = path.join(
            globalStoragePath,
            "tracked_projects", // Consistent parent folder for all tracking repos
            sanitizedProjectFolderName // Unique, project-specific folder name
        );
        this.gitManager = new GitSnapshotManager(projectFolder, repoFolder);
    }

    /**
     * Initializes the ProjectDiffAnalyzer.
     * Sets up the Git repository and starts the periodic analysis interval.
     */
    public async init(): Promise<void> {
        await this.gitManager.init();
        this.startAnalysisInterval();
    }

    /**
     * Starts the interval timer to periodically analyze changes.
     * @private
     */
    private startAnalysisInterval() {
        if (this.analysisInterval) {
            // Clear any existing interval to prevent duplicates
            clearInterval(this.analysisInterval);
        }
        this.analysisInterval = setInterval(async () => {
            await this.analyzeChanges();
        }, this.intervalMs);
    }

    /**
     * Performs the change analysis by taking a Git snapshot diff and storing metrics.
     */
    public async analyzeChanges(): Promise<void> {
        const diff: GitDiffSummary | null =
            await this.gitManager.takeSnapshot(); // Take a snapshot and get diff summary

        if (!diff || diff.filesChanged === 0) {
            console.log("No significant changes detected since last snapshot.");
            return;
        }

        const summary = `Changed ${diff.filesChanged} files with ${diff.insertions} insertions and ${diff.deletions} deletions`;
        const changeInterval: ChangeInterval = {
            startTime: Date.now() - this.intervalMs,
            endTime: Date.now(),
            summary,
            filesChanged: diff.filesChanged,
            totalAdditions: diff.insertions,
            totalDeletions: diff.deletions,
        };

        // if (this.storage && this.storage instanceof MetricsStorage) {
        //     // Store the metrics in the MetricsStorage
        //     await this.storage.storeMetric(changeInterval);
        // }

        window.showInformationMessage(
            // Provide user feedback in VS Code
            `Git snapshot analysis complete for project '${path.basename(
                this.projectFolder
            )}': ${summary}`
        );
    }

    /**
     * Disposes of the ProjectDiffAnalyzer, clearing the analysis interval and performing a final analysis.
     */
    public async dispose(): Promise<void> {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval); // Clear the interval timer
            this.analysisInterval = null; // Reset analysisInterval
        }
        await this.analyzeChanges(); // Perform a final analysis before disposing
    }

    /**
     * Restarts the analysis interval, e.g., after configuration changes.
     */
    public restartAnalysisInterval(): void {
        this.startAnalysisInterval(); // Simply restart the interval timer
    }
}
