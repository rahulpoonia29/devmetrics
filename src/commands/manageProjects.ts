import * as vscode from 'vscode'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { changeProjectFolder } from './changeProjectFolder'
import { createProject } from './createProject'
import { deleteProject } from './deleteProject'
import { renameProject } from './renameProject'
import { toggleProjectTracking } from './toggleProjectTracking'
import { viewProjectMetrics } from './viewProjectMetrics'

export async function manageProjects(
    db: MetricsDatabase,
    monitors: Map<string, DevelopmentActivityMonitor>,
    globalStoragePath: string
): Promise<void> {
    // Get all projects
    const projects = await db.getAllProjects()

    if (projects.length === 0) {
        const result = await vscode.window.showInformationMessage(
            'No projects available. Would you like to create one?',
            'Create Project',
            'Cancel'
        )

        if (result === 'Create Project') {
            await createProject(db, monitors, globalStoragePath)
        }
        return
    }

    // Build project list with tracking status
    const projectItems = projects.map((p) => ({
        label: p.name,
        description: p.folder_path,
        detail: p.is_tracking ? '$(play) Tracking' : '$(stop) Not tracking',
        project: p,
    }))

    // Let user select a project to manage
    const selected = await vscode.window.showQuickPick(projectItems, {
        placeHolder: 'Select a project to manage',
        title: 'Manage Projects',
    })

    if (!selected) {
        return // User cancelled
    }

    // Show management options
    const actions = [
        selected.project.is_tracking ? 'Stop Tracking' : 'Start Tracking',
        'View Metrics',
        'Rename Project',
        'Change Folder',
        'Delete Project',
    ]

    const selectedAction = await vscode.window.showQuickPick(actions, {
        placeHolder: `Select action for "${selected.project.name}"`,
        title: 'Project Actions',
    })

    if (!selectedAction) {
        return // User cancelled
    }

    // Execute the selected action
    switch (selectedAction) {
        case 'Start Tracking':
            await toggleProjectTracking(
                selected.project.name,
                true,
                db,
                monitors,
                globalStoragePath
            )
            break
        case 'Stop Tracking':
            await toggleProjectTracking(
                selected.project.name,
                false,
                db,
                monitors,
                globalStoragePath
            )
            break
        case 'View Metrics':
            await viewProjectMetrics(selected.project.name, db)
            break
        case 'Rename Project':
            await renameProject(db)
            break
        case 'Change Folder':
            await changeProjectFolder(db, monitors)
            break
        case 'Delete Project':
            await deleteProject(selected.project.name, db, monitors)
            break
    }
}
