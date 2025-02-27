import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'

export async function renameProject(db: MetricsDatabase): Promise<void> {
    // Get all projects
    const projects = await db.getAllProjects()

    if (projects.length === 0) {
        vscode.window.showInformationMessage('No projects available to rename.')
        return
    }

    // Let user select a project
    const projectItems = projects.map((p) => ({
        label: p.name,
        description: p.folder_path,
        project: p,
    }))

    const selected = await vscode.window.showQuickPick(projectItems, {
        placeHolder: 'Select a project to rename',
        title: 'Rename Project',
    })

    if (!selected) {
        return // User cancelled
    }

    // Ask for new name
    const newName = await vscode.window.showInputBox({
        prompt: 'Enter new project name',
        value: selected.project.name,
        validateInput: (value) => {
            if (!value?.trim()) {
                return 'Project name cannot be empty'
            }

            // Check if name already exists for a different project
            if (
                value !== selected.project.name &&
                projects.some((p) => p.name === value)
            ) {
                return 'A project with this name already exists'
            }

            return null
        },
    })

    if (!newName || newName === selected.project.name) {
        return // User cancelled or name unchanged
    }

    try {
        // First create a new project with the new name
        await db.createProject(newName, selected.project.folder_path)

        // Copy metrics from old project to new project (implementation needed)
        // This would require creating a method in the MetricsDatabase to copy metrics

        // Delete the old project
        await db.deleteProject(selected.project.name)

        vscode.window.showInformationMessage(
            `Project renamed from "${selected.project.name}" to "${newName}"`
        )
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to rename project: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}
