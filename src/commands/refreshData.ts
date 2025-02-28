import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { StatusBarItems, statusBarActions } from '../statusBar/index'
import { ProjectsTreeProvider } from '../views/ProjectsTreeProvider'

/**
 * Refreshes all UI components of the extension
 */
export async function refreshData(
    projectsProvider?: ProjectsTreeProvider,
    db?: MetricsDatabase
): Promise<void> {
    // Refresh the projects tree view
    if (projectsProvider) {
        projectsProvider.refresh()
    }

    // Update status bar info
    if (db && StatusBarItems.projectsStatus) {
        await statusBarActions.updateProjectsStatus(
            StatusBarItems.projectsStatus,
            db
        )
    }

    // Show confirmation
    vscode.window.setStatusBarMessage('DevMetrics data refreshed', 2000)
}
