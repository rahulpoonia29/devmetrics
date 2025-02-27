import * as fs from 'fs'
import Loki from 'lokijs'
import { AnyLineChange } from 'parse-git-diff'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Uri } from 'vscode'
import {
    DatabaseError,
    DbChunkRange,
    DbFileChange,
    DbLineChange,
    DbMetricsRecord,
    LokiCollection,
    LokiObj,
    MetricsQueryOptions,
    MetricsRecord,
    MetricsStorageResult,
    Project,
} from '../types/DatabaseTypes'
import { CodeChanges, FileChange } from '../types/GitTypes'

// Type guard to make sure $loki exists (used in filters)
function hasLokiId<T extends LokiObj>(obj: T): obj is T & { $loki: number } {
    return obj.$loki !== undefined
}

/**
 * LokiJS-based implementation of the metrics database
 * Provides NoSQL document storage with full TypeScript type safety
 */
export class MetricsDatabase {
    private db!: Loki
    private projects!: LokiCollection<Project>
    private metricsRecords!: LokiCollection<DbMetricsRecord>
    private fileChanges!: LokiCollection<DbFileChange>
    private lineChanges!: LokiCollection<DbLineChange>
    private chunkRanges!: LokiCollection<DbChunkRange>
    private dbPath: string
    private initialized: boolean = false

    constructor(globalStorageUri: Uri) {
        this.dbPath = path.join(globalStorageUri.fsPath, 'devmetrics.db')

        // Make sure the directory exists
        const dbDir = path.dirname(this.dbPath)
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true })
        }
    }

    async initializeDb(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                this.db = new Loki(this.dbPath, {
                    autoload: true,
                    autoloadCallback: () => {
                        try {
                            // Initialize or get collections
                            this.projects =
                                this.db.getCollection<Project & LokiObj>(
                                    'projects'
                                ) ||
                                this.db.addCollection<Project & LokiObj>(
                                    'projects',
                                    {
                                        unique: ['name', 'folder_path'],
                                        indices: [
                                            'name',
                                            'folder_path',
                                            'is_tracking',
                                        ],
                                    }
                                )

                            this.metricsRecords =
                                this.db.getCollection<DbMetricsRecord>(
                                    'metrics_records'
                                ) ||
                                this.db.addCollection<DbMetricsRecord>(
                                    'metrics_records',
                                    {
                                        unique: ['id'],
                                        indices: ['project_name', 'timestamp'],
                                    }
                                )

                            this.fileChanges =
                                this.db.getCollection<DbFileChange>(
                                    'file_changes'
                                ) ||
                                this.db.addCollection<DbFileChange>(
                                    'file_changes',
                                    {
                                        indices: [
                                            'metrics_record_id',
                                            'file_path',
                                            'change_type',
                                        ],
                                    }
                                )

                            this.lineChanges =
                                this.db.getCollection<DbLineChange>(
                                    'line_changes'
                                ) ||
                                this.db.addCollection<DbLineChange>(
                                    'line_changes',
                                    {
                                        indices: [
                                            'file_change_id',
                                            'change_type',
                                        ],
                                    }
                                )

                            this.chunkRanges =
                                this.db.getCollection<DbChunkRange>(
                                    'chunk_ranges'
                                ) ||
                                this.db.addCollection<DbChunkRange>(
                                    'chunk_ranges',
                                    {
                                        indices: ['file_change_id'],
                                    }
                                )

                            this.initialized = true
                            resolve()
                        } catch (initError) {
                            reject(
                                new DatabaseError(
                                    `Database initialization failed: ${initError}`,
                                    'INIT_FAILED'
                                )
                            )
                        }
                    },
                    autosave: true,
                    autosaveInterval: 4000, // Save every 4 seconds if changed
                })
            } catch (error) {
                reject(
                    new DatabaseError(
                        `Failed to initialize database: ${error}`,
                        'INIT_FAILED'
                    )
                )
            }
        })
    }

    private checkInitialized(): void {
        if (!this.initialized) {
            throw new DatabaseError(
                'Database not initialized. Call initializeDb() first.',
                'NOT_INITIALIZED'
            )
        }
    }

    // Save database to disk explicitly
    public async persistToDisk(): Promise<void> {
        this.checkInitialized()

        return new Promise<void>((resolve, reject) => {
            this.db.saveDatabase((err) => {
                if (err) {
                    reject(
                        new DatabaseError(
                            `Failed to save database: ${err}`,
                            'SAVE_FAILED'
                        )
                    )
                } else {
                    resolve()
                }
            })
        })
    }

    // Clean up resources when done
    public async close(): Promise<void> {
        if (this.initialized) {
            await this.persistToDisk()
            this.db.close()
            this.initialized = false
        }
    }

    public async createProject(
        projectName: string,
        folderPath: string
    ): Promise<void> {
        this.checkInitialized()

        try {
            // Check if project already exists
            const existingProject = this.projects.findOne({
                $or: [{ name: projectName }, { folder_path: folderPath }],
            })

            if (existingProject) {
                throw new DatabaseError(
                    `Project with name ${projectName} or path ${folderPath} already exists`,
                    'CREATE_FAILED'
                )
            }

            // Create the project
            this.projects.insert({
                name: projectName,
                folder_path: folderPath,
                is_tracking: false,
                last_saved_time: -100,
            })

            await this.persistToDisk()
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error
            }

            throw new DatabaseError(
                `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
                'CREATE_FAILED'
            )
        }
    }

    public async getProject(projectName: string): Promise<Project | undefined> {
        this.checkInitialized()

        try {
            const project = this.projects.findOne({ name: projectName })

            if (!project) {
                return undefined
            }

            // Return clean copy without LokiJS metadata
            const { $loki, meta, ...cleanProject } = project
            return cleanProject as Project
        } catch (error) {
            console.error('Error getting project:', error)
            return undefined
        }
    }

    public async getAllProjects(): Promise<Project[]> {
        this.checkInitialized()

        try {
            // Return clean copies without LokiJS metadata
            return this.projects.find().map((project) => {
                const { $loki, meta, ...cleanProject } = project
                return cleanProject as Project
            })
        } catch (error) {
            console.error('Error getting all projects:', error)
            return []
        }
    }

    public async updateProjectTrackingStatus(
        projectName: string,
        isTracking: boolean
    ): Promise<void> {
        this.checkInitialized()

        try {
            const project = this.projects.findOne({ name: projectName })
            if (!project) {
                throw new DatabaseError(
                    `Project not found: ${projectName}`,
                    'NOT_FOUND'
                )
            }

            project.is_tracking = isTracking
            this.projects.update(project)
            await this.persistToDisk()
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error
            }

            throw new DatabaseError(
                `Failed to update tracking status: ${error instanceof Error ? error.message : String(error)}`,
                'UPDATE_FAILED'
            )
        }
    }

    public async updateProjectLastSavedTime(
        projectName: string,
        timestamp: number
    ): Promise<void> {
        this.checkInitialized()

        try {
            const project = this.projects.findOne({ name: projectName })
            if (!project) {
                throw new DatabaseError(
                    `Project not found: ${projectName}`,
                    'NOT_FOUND'
                )
            }

            project.last_saved_time = timestamp
            this.projects.update(project)
            await this.persistToDisk()
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error
            }

            throw new DatabaseError(
                `Failed to update last saved time: ${error instanceof Error ? error.message : String(error)}`,
                'UPDATE_FAILED'
            )
        }
    }

    public async deleteProject(projectName: string): Promise<void> {
        this.checkInitialized()

        try {
            // Find all metrics records for this project
            const metricsToDelete = this.metricsRecords.find({
                project_name: projectName,
            })

            // For each metrics record, delete related data
            for (const record of metricsToDelete) {
                await this.deleteMetricsRecordCascade(record.id)
            }

            // Delete the project
            this.projects.findAndRemove({ name: projectName })
            await this.persistToDisk()
        } catch (error) {
            throw new DatabaseError(
                `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`,
                'DELETE_FAILED'
            )
        }
    }

    private async deleteMetricsRecordCascade(recordId: string): Promise<void> {
        // Find all file changes for this metrics record
        const fileChangesToDelete = this.fileChanges.find({
            metrics_record_id: recordId,
        })

        // For each file change, delete related line changes and chunk ranges
        for (const fileChange of fileChangesToDelete) {
            if (hasLokiId(fileChange)) {
                this.lineChanges.findAndRemove({
                    file_change_id: fileChange.$loki,
                })
                this.chunkRanges.findAndRemove({
                    file_change_id: fileChange.$loki,
                })
            }
        }

        // Delete the file changes
        this.fileChanges.findAndRemove({ metrics_record_id: recordId })

        // Delete the metrics record
        this.metricsRecords.findAndRemove({ id: recordId })
    }

    public async saveMetrics(
        metrics: CodeChanges,
        projectName: string
    ): Promise<MetricsStorageResult> {
        this.checkInitialized()

        try {
            const metricsRecordId = uuidv4()
            const timestamp = Date.now()

            // Check if project exists
            const project = this.projects.findOne({ name: projectName })
            if (!project) {
                throw new DatabaseError(
                    `Project not found: ${projectName}`,
                    'NOT_FOUND'
                )
            }

            // 1. Insert metrics record
            this.metricsRecords.insert({
                id: metricsRecordId,
                project_name: projectName,
                metrics: metrics, // Store the entire CodeChanges object
                timestamp,
            })

            await this.persistToDisk()

            return {
                success: true,
                id: metricsRecordId,
            }
        } catch (error) {
            console.error('Failed to save metrics:', error)
            return {
                success: false,
                error: `Failed to save metrics: ${error instanceof Error ? error.message : String(error)}`,
            }
        }
    }

    public async loadMetrics(
        projectName: string,
        options?: MetricsQueryOptions
    ): Promise<MetricsRecord[]> {
        this.checkInitialized()

        try {
            // Check if project exists
            const project = this.projects.findOne({ name: projectName })
            if (!project) {
                return []
            }

            // Build query options
            const query: any = { project_name: projectName }

            if (options?.startDate) {
                query.timestamp = { $gte: options.startDate.getTime() }
            }

            if (options?.endDate) {
                if (query.timestamp) {
                    query.timestamp.$lte = options.endDate.getTime()
                } else {
                    query.timestamp = { $lte: options.endDate.getTime() }
                }
            }

            // Get metrics records
            let metricsRecords = this.metricsRecords.find(query)

            // Apply sorting
            metricsRecords = metricsRecords.sort(
                (a, b) => a.timestamp - b.timestamp
            )

            // Apply limit if specified
            if (options?.limit && options.limit > 0) {
                metricsRecords = metricsRecords.slice(0, options.limit)
            }

            // Build full metrics records
            const result: MetricsRecord[] = []

            for (const record of metricsRecords) {
                // Create complete MetricsRecord
                result.push({
                    id: record.id,
                    timestamp: record.timestamp,
                    data: record.metrics, // Access the stored CodeChanges object
                })
            }

            return result
        } catch (error) {
            console.error('Error loading metrics:', error)
            return []
        }
    }

    private async populateFileChanges(
        fileChanges: DbFileChange[]
    ): Promise<FileChange[]> {
        // Build populated file changes
        return Promise.all(
            fileChanges.map(async (fc) => {
                // Get line changes and chunk ranges only if we have a valid LokiJS ID
                if (!hasLokiId(fc)) {
                    // Return FileChange with empty arrays if no LokiJS ID
                    return {
                        filePath: fc.file_path,
                        oldFilePath: fc.old_file_path || undefined,
                        changeType: fc.change_type,
                        lineChanges: [],
                        addedLinesCount: fc.added_lines_count,
                        deletedLinesCount: fc.deleted_lines_count,
                        modifiedLinesCount: fc.modified_lines_count,
                        unchangedLinesCount: fc.unchanged_lines_count,
                        totalLinesCount: fc.total_lines_count,
                        originalLinesCount: fc.original_lines_count,
                        changeRatio: fc.change_ratio,
                        isBinary: fc.is_binary,
                        chunkRanges: [],
                    } satisfies FileChange
                }

                // Get line changes for this file change
                const lineChanges = this.lineChanges.find({
                    file_change_id: fc.$loki,
                })

                // Get chunk ranges for this file change
                const chunkRanges = this.chunkRanges.find({
                    file_change_id: fc.$loki,
                })

                // Map line changes to the expected type
                const mappedLineChanges: AnyLineChange[] = lineChanges.map(
                    (lc) => {
                        switch (lc.change_type) {
                            case 'AddedLine':
                                return {
                                    type: 'AddedLine',
                                    content: lc.content,
                                    lineAfter: lc.line_number ?? 0,
                                }
                            case 'DeletedLine':
                                return {
                                    type: 'DeletedLine',
                                    content: lc.content,
                                    lineBefore: lc.line_number ?? 0,
                                }
                            case 'UnchangedLine':
                                return {
                                    type: 'UnchangedLine',
                                    content: lc.content,
                                    lineBefore: lc.line_number ?? 0,
                                    lineAfter: lc.line_number ?? 0,
                                }
                            case 'MessageLine':
                            default:
                                return {
                                    type: 'MessageLine',
                                    content: lc.content,
                                }
                        }
                    }
                )

                // Map chunk ranges
                const mappedChunkRanges = chunkRanges.map((cr) => ({
                    start: cr.start_range,
                    lines: cr.lines,
                }))

                // Create FileChange object
                return {
                    filePath: fc.file_path,
                    oldFilePath: fc.old_file_path || undefined,
                    changeType: fc.change_type,
                    lineChanges: mappedLineChanges,
                    addedLinesCount: fc.added_lines_count,
                    deletedLinesCount: fc.deleted_lines_count,
                    modifiedLinesCount: fc.modified_lines_count,
                    unchangedLinesCount: fc.unchanged_lines_count,
                    totalLinesCount: fc.total_lines_count,
                    originalLinesCount: fc.original_lines_count,
                    changeRatio: fc.change_ratio,
                    isBinary: fc.is_binary,
                    chunkRanges: mappedChunkRanges,
                }
            })
        )
    }

    public async clearProjectMetrics(projectName: string): Promise<void> {
        this.checkInitialized()

        try {
            // Check if project exists
            const project = this.projects.findOne({ name: projectName })
            if (!project) {
                throw new DatabaseError(
                    `Project not found: ${projectName}`,
                    'NOT_FOUND'
                )
            }

            // Find all metrics records for this project
            const metricsToDelete = this.metricsRecords.find({
                project_name: projectName,
            })

            // Delete all related data for each metrics record
            for (const record of metricsToDelete) {
                await this.deleteMetricsRecordCascade(record.id)
            }

            await this.persistToDisk()
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error
            }

            throw new DatabaseError(
                `Failed to clear metrics: ${error instanceof Error ? error.message : String(error)}`,
                'CLEAR_FAILED'
            )
        }
    }
}
