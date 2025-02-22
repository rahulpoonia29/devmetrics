// metricsStorage.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import { Metric } from '../types/Metrics'

export class MetricsStorage {
    private readonly storageFolderPath: string

    constructor(storageFolderPath: string, projectName: string) {
        this.storageFolderPath = path.join(storageFolderPath, projectName)
        fs.mkdir(this.storageFolderPath, { recursive: true }).catch(
            console.error
        ) // Ensure directory exists
    }

    public async storeMetric(metric: Metric): Promise<void> {
        const timestamp = new Date(metric.endTime)
            .toISOString()
            .replace(/:/g, '-')
        const filename = `${timestamp}.json`
        const filePath = path.join(this.storageFolderPath, filename)
        await fs.writeFile(filePath, JSON.stringify(metric, null, 2))
    }

    public async getMetrics(): Promise<Metric[]> {
        try {
            const files = await fs.readdir(this.storageFolderPath)
            const metrics: Metric[] = []
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.storageFolderPath, file)
                    const fileContent = await fs.readFile(filePath, 'utf-8')
                    metrics.push(JSON.parse(fileContent))
                }
            }
            return metrics.sort((a, b) => a.endTime - b.endTime) // Sort by timestamp
        } catch (error) {
            return []
        }
    }

    public async clearMetrics(): Promise<void> {
        try {
            const files = await fs.readdir(this.storageFolderPath)
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.storageFolderPath, file)
                    await fs.unlink(filePath)
                }
            }
        } catch (error) {
            console.error('Error clearing metrics:', error)
        }
    }
}
