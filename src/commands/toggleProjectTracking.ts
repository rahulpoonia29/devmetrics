import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'

export async function toggleProjectTracking(
    projectName: string,
    enable: boolean,
    db: MetricsDatabase,
    monitors: Map<string, DevelopmentActivityMonitor>,
    globalStoragePath: string
): Promise<void> {
    try {
        const project = await db.getProject(projectName)
        if (!project) {
            vscode.window.showErrorMessage(`Project "${projectName}" not found`)
            return
        }

        if (enable) {
            // Start tracking
            let monitor = monitors.get(projectName)
            if (!monitor) {
                monitor = new DevelopmentActivityMonitor(
                    db,
                    projectName,
                    project.folder_path,
                    globalStoragePath
                )
                monitors.set(projectName, monitor)
            }

            await monitor.startTracking()
            await db.updateProjectTrackingStatus(projectName, true)
            vscode.window.showInformationMessage(
                `Started tracking project "${projectName}"`
            )
        } else {
            // Stop tracking
            const monitor = monitors.get(projectName)
            if (monitor) {
                await monitor.stopTracking()
                monitors.delete(projectName)
            }

            await db.updateProjectTrackingStatus(projectName, false)
            vscode.window.showInformationMessage(
                `Stopped tracking project "${projectName}"`
            )
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to change tracking status: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}
