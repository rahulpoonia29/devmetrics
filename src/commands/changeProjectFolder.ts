import * as vscode from 'vscode'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'
import { MetricsDatabase } from '../DB/MetricsDatabase'

export async function changeProjectFolder(
    db: MetricsDatabase,
    monitors: Map<string, DevelopmentActivityMonitor>
): Promise<void> {
    // Get all projects
    const projects = await db.getAllProjects()

    if (projects.length === 0) {
        vscode.window.showInformationMessage('No projects available to modify.')
        return
    }

    // Let user select a project
    const projectItems = projects.map((p) => ({
        label: p.name,
        description: p.folder_path,
        project: p,
    }))

    const selected = await vscode.window.showQuickPick(projectItems, {
        placeHolder: 'Select a project to update folder',
        title: 'Change Project Folder',
    })

    if (!selected) {
        return // User cancelled
    }

    // Check if project is being tracked
    if (selected.project.is_tracking) {
        const result = await vscode.window.showWarningMessage(
            'This project is currently being tracked. Changing the folder requires stopping tracking first.',
            'Stop tracking & continue',
            'Cancel'
        )

        if (result !== 'Stop tracking & continue') {
            return
        }

        // Stop tracking and record the changes for the old folder
        const monitor = monitors.get(selected.project.name)
        if (monitor) {
            await monitor.stopTracking()
            await monitor.recordChanges()
        }
        await db.updateProjectTrackingStatus(selected.project.name, false)
        monitors.delete(selected.project.name)
    }

    // Let user select new folder
    const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select New Project Folder',
        openLabel: 'Select Folder',
    })

    if (!folders || folders.length === 0) {
        return // User cancelled
    }

    const newFolderPath = folders[0].fsPath

    // Check if another project is already using this folder
    const existingProject = projects.find(
        (p) =>
            p.name !== selected.project.name && p.folder_path === newFolderPath
    )

    if (existingProject) {
        vscode.window.showErrorMessage(
            `Folder is already used by project "${existingProject.name}"`
        )
        return
    }

    try {
        // Update project in database
        await db.changeProjectFolder(selected.project.name, newFolderPath)

        vscode.window.showInformationMessage(
            `Project "${selected.project.name}" folder updated to ${newFolderPath}`
        )
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to update project folder: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}
