import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { StatusBarItems, statusBarActions } from '../statusBar/index'
import { ProjectsTreeProvider } from '../views/ProjectsTreeProvider'
import { MetricsTreeProvider } from '../views/MetricsTreeProvider'

/**
 * Refreshes all UI components of the extension
 */
export async function refreshData(
    projectsProvider?: ProjectsTreeProvider,
    db?: MetricsDatabase,
    metricsProvider?: MetricsTreeProvider
): Promise<void> {
    // Refresh the projects tree view
    if (projectsProvider) {
        projectsProvider.refresh()
    }

    // Refresh the metrics tree view
    if (metricsProvider) {
        metricsProvider.refresh()
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
