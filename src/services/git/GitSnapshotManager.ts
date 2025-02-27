import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'

import parseGitDiff from 'parse-git-diff'
import simpleGit, { GitError, SimpleGit } from 'simple-git'
import { CodeChanges } from '../../types/GitTypes'
import { processFileChange } from './GitDiffParser'

/**
 * Manages Git snapshots for tracking code changes
 */
export class GitSnapshotManager {
    private readonly sourceFolderPath: string
    private readonly repositoryFolderPath: string
    private previousCommitHash: string | null = null
    private readonly git: SimpleGit

    constructor(sourceFolderPath: string, repositoryFolderPath: string) {
        this.sourceFolderPath = sourceFolderPath
        this.repositoryFolderPath = repositoryFolderPath
        fse.ensureDirSync(this.repositoryFolderPath)
        this.git = simpleGit(this.repositoryFolderPath)
    }

    public async initializeRepository(): Promise<void> {
        this.validateSourceFolder()
        await this.setupGitRepository()
        await this.trackInitialCommit()
    }

    public async captureChanges(): Promise<CodeChanges | void> {
        try {
            // Copy current source files
            await fse.copy(this.sourceFolderPath, this.repositoryFolderPath, {
                overwrite: true,
                filter: this.excludeGitFolder,
            })

            await this.git.add('.')

            // Try to commit changes
            const hasChanges = await this.createCommit()
            if (!hasChanges) return

            // Get diff from previous commit
            const newCommitHash = await this.git.revparse(['HEAD'])
            if (
                !this.previousCommitHash ||
                this.previousCommitHash === newCommitHash
            ) {
                this.previousCommitHash = newCommitHash
                return
            }

            const changes = await this.getDiffBetweenCommits(
                this.previousCommitHash,
                newCommitHash
            )
            this.previousCommitHash = newCommitHash
            return changes
        } catch (error) {
            this.handleGitError(error, 'Failed to capture changes')
        }
    }

    private validateSourceFolder(): void {
        if (!fs.existsSync(this.sourceFolderPath)) {
            throw new Error('Source folder does not exist.')
        }

        if (!fs.statSync(this.sourceFolderPath).isDirectory()) {
            throw new Error('Source path is not a directory.')
        }
    }

    private async setupGitRepository(): Promise<void> {
        fse.ensureDirSync(this.repositoryFolderPath)
        const gitDirectory = path.join(this.repositoryFolderPath, '.git')

        if (!fs.existsSync(gitDirectory)) {
            try {
                await this.git.init()
            } catch (error) {
                this.handleGitError(
                    error,
                    'Failed to initialize Git repository'
                )
            }
        }
    }

    private async trackInitialCommit(): Promise<void> {
        try {
            // For existing repos, get the current HEAD
            this.previousCommitHash = await this.git
                .revparse(['HEAD'])
                .catch(() => null)

            // If no commits exist, create initial snapshot
            if (!this.previousCommitHash) {
                await fse.copy(
                    this.sourceFolderPath,
                    this.repositoryFolderPath,
                    {
                        overwrite: true,
                        filter: this.excludeGitFolder,
                    }
                )

                const files = await fse.readdir(this.repositoryFolderPath)
                if (files.length === 0) {
                    throw new Error('No files in source folder to track')
                }

                await this.git.add('./*')
                await this.git.commit('Initial commit')
                this.previousCommitHash = await this.git.revparse(['HEAD'])
            }
        } catch (error) {
            this.handleGitError(error, 'Failed to create initial snapshot')
        }
    }

    private async createCommit(): Promise<boolean> {
        try {
            await this.git.commit(`Snapshot at ${Date.now()}`)
            return true
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes('nothing to commit')
            ) {
                return false
            }
            throw error
        }
    }

    private async getDiffBetweenCommits(
        oldCommit: string,
        newCommit: string
    ): Promise<CodeChanges> {
        const diffString = await this.git.diff([oldCommit, newCommit])
        const diffSummary = await this.git.diffSummary([oldCommit, newCommit])
        const diffObject = parseGitDiff(diffString)

        // Process each file change from the diffObject
        const changes = diffObject.files.map((fileChange) =>
            processFileChange(fileChange)
        )
        const summary = `Changes between ${oldCommit} and ${newCommit}`

        return {
            summary,
            filesChanged: diffSummary.files.length,
            insertions: diffSummary.insertions,
            deletions: diffSummary.deletions,
            changes,
        } satisfies CodeChanges
    }

    private handleGitError(error: unknown, contextMessage: string): never {
        if (error instanceof GitError) {
            throw new Error(`${contextMessage}: ${error.message}`)
        }
        throw new Error(
            `${contextMessage}: ${error instanceof Error ? error.message : String(error)}`
        )
    }

    private excludeGitFolder(src: string, dest: string): boolean {
        return (
            !src.includes(path.sep + '.git' + path.sep) &&
            src !== path.join(dest, '.git')
        )
    }
}
