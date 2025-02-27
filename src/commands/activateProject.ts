import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'

export async function activateProject(
    projectName: string,
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

        await vscode.workspace
            .getConfiguration()
            .update(
                'devmetrics.activeProject',
                projectName,
                vscode.ConfigurationTarget.Global
            )

        vscode.window.showInformationMessage(
            `Activated project "${projectName}"`
        )

        // If project is set to track, ensure monitor is running
        if (project.is_tracking && !monitors.has(projectName)) {
            const monitor = new DevelopmentActivityMonitor(
                db,
                projectName,
                project.folder_path,
                globalStoragePath
            )

            await monitor.startTracking()
            monitors.set(projectName, monitor)
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to activate project: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}
