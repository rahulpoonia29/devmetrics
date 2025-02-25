import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import {
    DatabaseError,
    MetricsQueryOptions,
    MetricsRecord,
    MetricsStorageResult,
} from '../types/DatabaseTypes'
import { CodeChanges } from '../types/GitTypes'

/**
 * Manages storage and retrieval of code metrics data
 */
export class MetricsDatabase {
    private readonly databaseFolderPath: string
    private readonly indexPath: string
    private metricsIndex: Map<string, { timestamp: number; filename: string }> =
        new Map()

    constructor(databaseFolderPath: string, projectName: string) {
        this.databaseFolderPath = path.join(databaseFolderPath, projectName)
        this.indexPath = path.join(this.databaseFolderPath, 'index.json')
        this.initialize()
    }

    private async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.databaseFolderPath, { recursive: true })

            // Try to load existing index
            try {
                const indexContent = await fs.readFile(this.indexPath, 'utf-8')
                const indexData = JSON.parse(indexContent)
                this.metricsIndex = new Map(Object.entries(indexData))
            } catch (error) {
                // If index doesn't exist or is invalid, create a new one
                this.metricsIndex = new Map()
                await this.rebuildIndex()
            }
        } catch (error) {
            console.error('Failed to initialize database:', error)
        }
    }

    private async rebuildIndex(): Promise<void> {
        try {
            const files = await fs.readdir(this.databaseFolderPath)
            this.metricsIndex.clear()

            for (const file of files) {
                if (file.endsWith('.json') && file !== 'index.json') {
                    try {
                        const filePath = path.join(
                            this.databaseFolderPath,
                            file
                        )
                        const content = await fs.readFile(filePath, 'utf-8')
                        const data = JSON.parse(content)

                        if (data.id && data.timestamp) {
                            this.metricsIndex.set(data.id, {
                                timestamp: data.timestamp,
                                filename: file,
                            })
                        }
                    } catch {
                        // Skip invalid files
                    }
                }
            }

            await this.saveIndex()
        } catch (error) {
            throw new DatabaseError(
                `Failed to rebuild index: ${error instanceof Error ? error.message : String(error)}`,
                'INDEX_REBUILD_FAILED'
            )
        }
    }

    private async saveIndex(): Promise<void> {
        try {
            const indexObject = Object.fromEntries(this.metricsIndex)
            await fs.writeFile(
                this.indexPath,
                JSON.stringify(indexObject, null, 2)
            )
        } catch (error) {
            throw new DatabaseError(
                `Failed to save index: ${error instanceof Error ? error.message : String(error)}`,
                'INDEX_SAVE_FAILED'
            )
        }
    }

    public async saveMetrics(
        metrics: CodeChanges
    ): Promise<MetricsStorageResult> {
        try {
            const id = uuidv4()
            const timestamp = Date.now()

            const record: MetricsRecord = {
                id,
                timestamp,
                data: metrics,
            }

            const filename = `${id}.json`
            const filePath = path.join(this.databaseFolderPath, filename)

            await fs.writeFile(filePath, JSON.stringify(record, null, 2))

            // Update index
            this.metricsIndex.set(id, { timestamp, filename })
            await this.saveIndex()

            return { success: true, id }
        } catch (error) {
            return {
                success: false,
                error: `Failed to save metrics: ${error instanceof Error ? error.message : String(error)}`,
            }
        }
    }

    public async getMetricsById(id: string): Promise<MetricsRecord | null> {
        try {
            const indexEntry = this.metricsIndex.get(id)
            if (!indexEntry) return null

            const filePath = path.join(
                this.databaseFolderPath,
                indexEntry.filename
            )
            const content = await fs.readFile(filePath, 'utf-8')
            return JSON.parse(content)
        } catch {
            return null
        }
    }

    public async loadMetrics(
        options?: MetricsQueryOptions
    ): Promise<MetricsRecord[]> {
        try {
            // Convert index to array and apply filters
            let records = Array.from(this.metricsIndex.entries()).map(
                ([id, info]) => ({
                    id,
                    timestamp: info.timestamp,
                    filename: info.filename,
                })
            )

            // Apply date filters if provided
            if (options?.startDate) {
                records = records.filter(
                    (r) => r.timestamp >= options.startDate!.getTime()
                )
            }

            if (options?.endDate) {
                records = records.filter(
                    (r) => r.timestamp <= options.endDate!.getTime()
                )
            }

            // Sort by timestamp
            records.sort((a, b) => a.timestamp - b.timestamp)

            // Apply limit if provided
            if (options?.limit && options.limit > 0) {
                records = records.slice(0, options.limit)
            }

            // Load actual data
            const result: MetricsRecord[] = []
            for (const record of records) {
                try {
                    const filePath = path.join(
                        this.databaseFolderPath,
                        record.filename
                    )
                    const content = await fs.readFile(filePath, 'utf-8')
                    result.push(JSON.parse(content))
                } catch {
                    // Skip invalid files
                }
            }

            return result
        } catch (error) {
            console.error('Error loading metrics:', error)
            return []
        }
    }

    public async clearAllMetrics(): Promise<void> {
        try {
            const files = await fs.readdir(this.databaseFolderPath)
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(
                            this.databaseFolderPath,
                            file
                        )
                        await fs.unlink(filePath)
                    } catch (error) {
                        console.error(`Failed to delete ${file}:`, error)
                    }
                }
            }

            // Clear index and save empty index
            this.metricsIndex.clear()
            await this.saveIndex()
        } catch (error) {
            throw new DatabaseError(
                `Failed to clear metrics: ${error instanceof Error ? error.message : String(error)}`,
                'CLEAR_FAILED'
            )
        }
    }

    public async getStatistics(): Promise<{
        count: number
        oldestTimestamp: number | null
        newestTimestamp: number | null
    }> {
        const timestamps = Array.from(this.metricsIndex.values()).map(
            (entry) => entry.timestamp
        )

        if (timestamps.length === 0) {
            return {
                count: 0,
                oldestTimestamp: null,
                newestTimestamp: null,
            }
        }

        return {
            count: timestamps.length,
            oldestTimestamp: Math.min(...timestamps),
            newestTimestamp: Math.max(...timestamps),
        }
    }
}
