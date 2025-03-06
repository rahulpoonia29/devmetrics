import path from 'path'
import * as vscode from 'vscode'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { toggleProjectTracking } from './toggleProjectTracking'

export async function createProject(
    db: MetricsDatabase,
    monitors: Map<string, DevelopmentActivityMonitor>,
    globalStoragePath: string
): Promise<void> {
    // Ask user to select a folder
    const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select Project Folder',
        openLabel: 'Select Folder',
    })

    if (!folders || folders.length === 0) {
        return // User cancelled
    }

    const folderPath = folders[0].fsPath
    const folderName = path.basename(folderPath)

    // Check if a project with this folder already exists
    const projects = await db.getAllProjects()
    const existingProject = projects.find((p) => p.folder_path === folderPath)

    if (existingProject) {
        await vscode.window.showInformationMessage(
            `A project already exists for this folder: ${existingProject.name}`
        )
        return
    }

    // Ask user for project name
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter a name for this project',
        value: folderName,
        validateInput: (value) => {
            if (!value?.trim()) {
                return 'Project name cannot be empty'
            }

            // Check if name already exists
            if (projects.some((p) => p.name === value)) {
                return 'A project with this name already exists'
            }

            return null
        },
    })

    if (!projectName) {
        return // User cancelled
    }

    try {
        // Create project in database
        await db.createProject(projectName, folderPath)

        vscode.window.showInformationMessage(
            `Project "${projectName}" created successfully!`
        )

        // Ask if user wants to start tracking
        const startTracking = await vscode.window.showInformationMessage(
            'Do you want to start tracking this project now?',
            'Yes',
            'No'
        )

        if (startTracking === 'Yes') {
            await toggleProjectTracking(
                projectName,
                true,
                db,
                monitors,
                globalStoragePath
            )
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}
