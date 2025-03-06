import * as crypto from 'crypto'
import * as path from 'path'
import { GitError } from 'simple-git'
import { ConfigurationTarget, window, workspace } from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { GitSnapshotManager } from '../services/git/GitSnapshotManager'
import { Project } from '../types/DatabaseTypes'

export class DevelopmentActivityMonitor {
    private readonly gitSnapshotManager: GitSnapshotManager
    private analysisTimer: NodeJS.Timeout | null = null
    private sessionStartTime: number = 0
    private readonly checkIntervalMs = 60000 // 1 minute
    constructor(
        private metricsDatabase: MetricsDatabase,
        private project: Project,
        globalStorageFolderPath: string
    ) {
        const projectHash = crypto
            .createHash('md5')
            .update(project.id)
            .digest('hex')

        const trackedRepositoryFolder = path.join(
            globalStorageFolderPath,
            'tracked_projects',
            projectHash
        )
        this.gitSnapshotManager = new GitSnapshotManager(
            project.folder_path,
            trackedRepositoryFolder
        )
    }

    public async startTracking(): Promise<void> {
        try {
            if (!this.project || !this.project.folder_path) {
                throw new Error('Invalid project or project folder path')
            }

            await this.gitSnapshotManager.initializeRepository()
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
            // *Check if the project is still being tracked
            const project = await this.metricsDatabase.getProject(
                this.project.name
            )
            if (!project) return
            if (!project.is_tracking) return

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
        const analysisIntervalMinutes = workspace
            .getConfiguration()
            .get<number>('devmetrics.analysisIntervalMinutes', 15)
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

            const changes = await this.gitSnapshotManager.captureChanges()

            if (!changes || changes.filesChanged === 0) {
                return
            }

            await this.metricsDatabase.saveMetrics(changes, this.project.name)

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
