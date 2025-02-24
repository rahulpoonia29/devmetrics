import * as crypto from 'crypto'
import * as path from 'path'
import { GitError } from 'simple-git'
import { ConfigurationTarget, window, workspace } from 'vscode'
import { CodeChangeMetrics } from '../types/Metrics'
import { GitChangeRecorder } from './GitChangeRecorder'
import { ProjectMetricsDatabase } from './MetricsDB'

export class CodeChangeTracker {
    private metricsDatabase: ProjectMetricsDatabase
    private readonly changeRecorder: GitChangeRecorder
    private readonly analysisIntervalMilliseconds: number
    private analysisTimer: NodeJS.Timeout | null = null

    constructor(
        projectFolderPath: string,
        globalStorageFolderPath: string,
        analysisIntervalMinutes: number
    ) {
        this.analysisIntervalMilliseconds = analysisIntervalMinutes * 60 * 1000

        const projectHash = crypto
            .createHash('md5')
            .update(projectFolderPath)
            .digest('hex')

        const trackedRepositoryFolder = path.join(
            globalStorageFolderPath,
            'tracked_projects',
            projectHash
        )
        this.changeRecorder = new GitChangeRecorder(
            projectFolderPath,
            trackedRepositoryFolder
        )
        this.metricsDatabase = new ProjectMetricsDatabase(
            globalStorageFolderPath,
            projectHash
        )
    }

    public async startTracking(): Promise<void> {
        try {
            await this.changeRecorder.initializeRepository()
            this.beginChangeAnalysis()
        } catch (error: unknown) {
            window.showErrorMessage((error as Error).message)
        }
    }

    private beginChangeAnalysis(): void {
        if (this.analysisTimer) {
            clearInterval(this.analysisTimer)
        }
        this.analysisTimer = setInterval(async () => {
            await this.recordChanges()
        }, this.analysisIntervalMilliseconds)
    }

    public async recordChanges(): Promise<void> {
        try {
            await workspace
                .getConfiguration()
                .update(
                    'devmetrics.lastSavedTime',
                    Date.now(),
                    ConfigurationTarget.Global
                )

            const changes = await this.changeRecorder.captureChanges()

            if (!changes || changes.summary.filesChanged === 0) {
                return
            }

            const diffSummaryMessage = `Changed ${changes.summary.filesChanged} files with ${changes.summary.insertions} insertions and ${changes.summary.deletions} deletions`
            const metrics: CodeChangeMetrics = {
                ...changes,
                diffSummaryMessage,
                startTime: Date.now() - this.analysisIntervalMilliseconds,
                endTime: Date.now(),
            }

            if (
                this.metricsDatabase &&
                this.metricsDatabase instanceof ProjectMetricsDatabase
            ) {
                await this.metricsDatabase.saveMetrics(metrics)
            }

            window.showInformationMessage('Saved code change metrics.')
        } catch (error: unknown) {
            if (error instanceof GitError) {
                window.showErrorMessage(`Git error: ${error.message}`)
            }
            return
        }
    }

    public async stopTracking(): Promise<void> {
        if (this.analysisTimer) {
            clearInterval(this.analysisTimer)
            this.analysisTimer = null
        }
        await this.recordChanges()
    }

    public restartTracking(): void {
        this.beginChangeAnalysis()
    }
}
