import * as vscode from 'vscode'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'
import { MetricsDatabase } from '../DB/MetricsDatabase'

export async function deleteProject(
    projectName: string,
    db: MetricsDatabase,
    monitors: Map<string, DevelopmentActivityMonitor>
): Promise<void> {
    // Confirm deletion
    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete project "${projectName}"? All metrics data will be permanently lost.`,
        { modal: true },
        'Delete',
        'Cancel'
    )

    if (confirm !== 'Delete') {
        return // User cancelled
    }

    try {
        // Stop tracking if active
        const monitor = monitors.get(projectName)
        if (monitor) {
            await monitor.stopTracking()
            monitors.delete(projectName)
        }

        // Delete project from database
        await db.deleteProject(projectName)

        vscode.window.showInformationMessage(
            `Project "${projectName}" has been deleted`
        )
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}
