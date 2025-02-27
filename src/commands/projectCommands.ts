import * as path from 'path'
import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'

/**
 * Create a new project by selecting a folder
 */

/**
 * Rename an existing project
 */

/**
 * Change a project's folder path
 */

/**
 * List all projects and manage their tracking status
 */

/**
 * Delete a project
 */

/**
 * Toggle tracking status for a project
 */

/**
 * List projects and activate one
 */

/**
 * View metrics for a project
 */

/**
 * Force a manual check for changes and record metrics
 */
export async function recordMetricsNow(
    projectName: string,
    monitors: Map<string, DevelopmentActivityMonitor>
): Promise<void> {
    const monitor = monitors.get(projectName)

    if (!monitor) {
        vscode.window.showErrorMessage(
            `No active monitor for project "${projectName}"`
        )
        return
    }

    try {
        vscode.window.showInformationMessage(
            `Recording metrics for "${projectName}"...`
        )
        await monitor.recordChanges()
        vscode.window.showInformationMessage(
            `Successfully recorded metrics for "${projectName}"`
        )
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to record metrics: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}
