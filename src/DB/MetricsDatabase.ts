import * as fs from 'fs'
import Loki from 'lokijs'
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
    MetricSummary,
    Project,
} from '../types/DatabaseTypes'
import { CodeChanges } from '../types/GitTypes'

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
                                        unique: ['id', 'name', 'folder_path'],
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
                                        unique: ['id', 'timestamp'],
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

            if (existingProject?.name === projectName) {
                throw new DatabaseError(
                    `Project with name ${projectName} already exists`,
                    'CREATE_FAILED'
                )
            }
            if (existingProject?.folder_path === folderPath) {
                throw new DatabaseError(
                    `Project with folder path ${folderPath} already exists`,
                    'CREATE_FAILED'
                )
            }

            // Create the project
            this.projects.insert({
                id: uuidv4(),
                name: projectName,
                folder_path: folderPath,
                is_tracking: false,
                last_saved_time: Date.now(),
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

            // 2. Update last saved time for the project
            this.projects.findAndUpdate({ name: projectName }, (project) => {
                project.last_saved_time = timestamp
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

    public async getMetricSummary(
        projectName: string,
        timeframe: 'today' | 'week' | 'month' | 'all' = 'all'
    ): Promise<MetricSummary | null> {
        try {
            // Find project
            const project = await this.getProject(projectName)

            if (!project) {
                return null
            }

            // Set up date filters based on timeframe
            const endDate = new Date()
            let startDate = new Date()

            switch (timeframe) {
                case 'today':
                    // Set to beginning of today (midnight)
                    startDate.setHours(0, 0, 0, 0)
                    endDate.setHours(23, 59, 59, 999)
                    break
                case 'week':
                    // Set to beginning of the week
                    const dayOfWeek = startDate.getDay() // 0 = Sunday, 1 = Monday, etc.
                    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                    startDate.setDate(startDate.getDate() - diff)
                    startDate.setHours(0, 0, 0, 0)
                    break
                case 'month':
                    // Set to beginning of current month
                    startDate.setDate(1)
                    startDate.setHours(0, 0, 0, 0)
                    break
                case 'all':
                default:
                    // No start date filter for all-time
                    startDate = new Date(0) // Use a very old date
                    break
            }

            const metrics = await this.loadMetrics(projectName, {
                startDate: startDate,
                endDate: endDate,
            })

            const dateRange =
                timeframe === 'today'
                    ? 'Today'
                    : timeframe === 'week'
                      ? 'This Week'
                      : timeframe === 'month'
                        ? 'This Month'
                        : 'All Time'

            if (!metrics || metrics.length === 0) {
                return {
                    project_name: project.name,
                    lines_added: 0,
                    lines_removed: 0,
                    files_modified: 0,
                    date_range: dateRange,
                } satisfies MetricSummary
            }

            // Aggregate metric values
            let totalLinesAdded = 0
            let totalLinesRemoved = 0
            let totalFilesModified = 0

            metrics.forEach((record) => {
                const data = record.data

                if (data) {
                    totalLinesAdded += data.insertions || 0
                    totalLinesRemoved += data.deletions || 0
                    totalFilesModified += data.filesChanged
                }
            })

            return {
                project_name: project.name,
                lines_added: totalLinesAdded,
                lines_removed: totalLinesRemoved,
                files_modified: totalFilesModified,
                date_range: dateRange,
            }
        } catch (error) {
            console.error('Error getting metric summary:', error)
            return null
        }
    }

    public async renameProject(
        oldName: string,
        newName: string
    ): Promise<void> {
        this.checkInitialized()

        try {
            // Check if project already exists
            const existingProject = this.projects.findOne({
                name: newName,
            })

            if (existingProject) {
                throw new DatabaseError(
                    `Project with name ${newName} already exists`,
                    'RENAME_FAILED'
                )
            }

            // Update the project name
            this.projects.findAndUpdate({ name: oldName }, (project) => {
                project.name = newName
            })

            // Update project name in metrics records
            this.metricsRecords.findAndUpdate(
                { project_name: oldName },
                (record) => {
                    record.project_name = newName
                }
            )

            await this.persistToDisk()
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error
            }

            throw new DatabaseError(
                `Failed to rename project: ${error instanceof Error ? error.message : String(error)}`,
                'RENAME_FAILED'
            )
        }
    }

    public async changeProjectFolder(
        projectName: string,
        newFolderPath: string
    ): Promise<void> {
        try {
            // Check if another project is already using this folder
            const existingProject = this.projects.findOne({
                name: { $ne: projectName },
                folder_path: newFolderPath,
            })

            if (existingProject) {
                throw new DatabaseError(
                    `Folder is already used by project "${existingProject.name}"`,
                    'FOLDER_IN_USE'
                )
            }

            // Update project in database
            this.projects.findAndUpdate({ name: projectName }, (project) => {
                project.folder_path = newFolderPath
            })

            await this.persistToDisk()
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error
            }

            throw new DatabaseError(
                `Failed to update project folder: ${error instanceof Error ? error.message : String(error)}`,
                'FOLDER_UPDATE_FAILED'
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
}
