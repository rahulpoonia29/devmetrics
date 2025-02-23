import * as fs from 'fs/promises'
import * as path from 'path'
import { CodeChangeMetrics } from '../types/Metrics'

export class ProjectMetricsDatabase {
    private readonly databaseFolderPath: string

    constructor(databaseFolderPath: string, projectName: string) {
        this.databaseFolderPath = path.join(databaseFolderPath, projectName)
        fs.mkdir(this.databaseFolderPath, { recursive: true }).catch(
            console.error
        )
    }

    public async saveMetrics(metrics: CodeChangeMetrics): Promise<void> {
        const timestamp = new Date(metrics.endTime)
            .toISOString()
            .replace(/:/g, '-')
        const filename = `${timestamp}.json`
        const filePath = path.join(this.databaseFolderPath, filename)
        await fs.writeFile(filePath, JSON.stringify(metrics, null, 2))
    }

    public async loadMetrics(): Promise<CodeChangeMetrics[]> {
        try {
            const files = await fs.readdir(this.databaseFolderPath)
            const metrics: CodeChangeMetrics[] = []
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.databaseFolderPath, file)
                    const fileContent = await fs.readFile(filePath, 'utf-8')
                    metrics.push(JSON.parse(fileContent))
                }
            }
            return metrics.sort((a, b) => a.endTime - b.endTime)
        } catch (error) {
            return []
        }
    }

    public async clearAllMetrics(): Promise<void> {
        try {
            const files = await fs.readdir(this.databaseFolderPath)
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.databaseFolderPath, file)
                    await fs.unlink(filePath)
                }
            }
        } catch (error) {
            console.error('Error clearing metrics:', error)
        }
    }
}
