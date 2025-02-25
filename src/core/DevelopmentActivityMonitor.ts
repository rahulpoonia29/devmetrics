import * as crypto from 'crypto'
import * as path from 'path'
import { GitError } from 'simple-git'
import { ConfigurationTarget, window, workspace } from 'vscode'
import { CodeChangeMetrics } from '../types/Metrics'
import { GitChangeRecorder } from '../lib/GitChangeRecorder'
import { MetricsDatabase } from '../lib/MetricsDatabase'

export class DevelopmentActivityMonitor {
    private metricsDatabase: MetricsDatabase
    private readonly changeRecorder: GitChangeRecorder
    private analysisTimer: NodeJS.Timeout | null = null
    private sessionStartTime: number = 0
    private readonly checkIntervalMs = 60000 // 1 minute

    constructor(projectFolderPath: string, globalStorageFolderPath: string) {
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
        this.metricsDatabase = new MetricsDatabase(
            globalStorageFolderPath,
            projectHash
        )
    }

    public async startTracking(): Promise<void> {
        try {
            await this.changeRecorder.initializeRepository()
            this.sessionStartTime = Date.now()
            this.beginChangeAnalysis()
        } catch (error: unknown) {
            window.showErrorMessage(
                `Failed to start tracking: ${(error as Error).message}`
            )
        }
    }

    private beginChangeAnalysis(): void {
        if (this.analysisTimer) {
            clearInterval(this.analysisTimer)
        }

        this.analysisTimer = setInterval(async () => {
            const analysisIntervalMilliseconds =
                this.getConfiguredIntervalInMilliseconds()

            const now = Date.now()
            const elapsedTime = now - this.sessionStartTime

            // *Record changes if the analysis interval has passed (Max deviation: 1 minute)
            if (elapsedTime >= analysisIntervalMilliseconds) {
                await this.recordChanges()
                this.sessionStartTime = now
            }
        }, this.checkIntervalMs)
    }

    private getConfiguredIntervalInMilliseconds(): number {
        const analysisIntervalMinutes: number = workspace
            .getConfiguration()
            .get('devmetrics.analysisIntervalMinutes', 15) as number
        return analysisIntervalMinutes * 60 * 1000
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
                startTime: this.sessionStartTime,
                endTime: Date.now(),
            }

            await this.metricsDatabase.saveMetrics(metrics)

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
        this.sessionStartTime = Date.now()
        this.beginChangeAnalysis()
    }
}
