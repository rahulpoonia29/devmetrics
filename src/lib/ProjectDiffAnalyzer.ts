import * as crypto from 'crypto'
import * as path from 'path'
import { GitError } from 'simple-git'
import { window } from 'vscode'
import { Metric } from '../types/Metrics'
import { GitSnapshotManager } from './GitSnapshotManager'
import { MetricsStorage } from './MetricsStorage'

export class ProjectDiffAnalyzer {
    private storage: MetricsStorage
    private readonly gitManager: GitSnapshotManager
    private readonly intervalMs: number
    private analysisInterval: NodeJS.Timeout | null = null

    constructor(
        projectFolder: string,
        globalStoragePath: string,
        intervalMinutes: number = 0.5
    ) {
        this.intervalMs = intervalMinutes * 60 * 1000

        const sanitizedProjectFolderName = crypto
            .createHash('md5')
            .update(projectFolder)
            .digest('hex')

        const repoFolder = path.join(
            globalStoragePath,
            'tracked_projects',
            sanitizedProjectFolderName
        )
        this.gitManager = new GitSnapshotManager(projectFolder, repoFolder)
        this.storage = new MetricsStorage(
            globalStoragePath,
            sanitizedProjectFolderName
        )
    }

    public async init(): Promise<void> {
        try {
            await this.gitManager.init()
            this.startAnalysisInterval()
        } catch (error: unknown) {
            window.showErrorMessage((error as Error).message)
        }
    }

    private startAnalysisInterval(): void {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval)
        }
        this.analysisInterval = setInterval(async () => {
            await this.analyzeChanges()
        }, this.intervalMs)
    }

    public async analyzeChanges(): Promise<void> {
        try {
            const diff = await this.gitManager.takeSnapshot()

            if (!diff || diff.summary.filesChanged === 0) {
                return
            }

            const diffSummaryMessage = `Changed ${diff.summary.filesChanged} files with ${diff.summary.insertions} insertions and ${diff.summary.deletions} deletions`
            const changeInterval: Metric = {
                ...diff,
                diffSummaryMessage,
                startTime: Date.now() - this.intervalMs,
                endTime: Date.now(),
            }

            if (this.storage && this.storage instanceof MetricsStorage) {
                await this.storage.storeMetric(changeInterval)
            }

            window.showInformationMessage('Saved metric.')
        } catch (error: unknown) {
            if (error instanceof GitError) {
                window.showErrorMessage(`Git error: ${error.message}`)
            }
            return
        }
    }

    public async dispose(): Promise<void> {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval)
            this.analysisInterval = null
        }
        await this.analyzeChanges()
    }

    public restartAnalysisInterval(): void {
        this.startAnalysisInterval()
    }
}
