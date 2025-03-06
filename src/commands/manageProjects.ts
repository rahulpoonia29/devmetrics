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
            { modal: true },
            'Create Project',
            'Cancel'
        )

        if (result === 'Create Project') {
            await createProject(db, monitors, globalStoragePath)
        }
        return
    }

    // Add a "Create New Project" option to the list
    const projectItems = projects.map((p) => ({
        label: `$(repo) ${p.name}`,
        description: p.folder_path,
        detail: p.is_tracking
            ? '$(check) Tracking active'
            : '$(circle-outline) Tracking inactive',
        buttons: [
            {
                iconPath: new vscode.ThemeIcon(
                    p.is_tracking ? 'debug-stop' : 'debug-start'
                ),
                tooltip: p.is_tracking ? 'Stop tracking' : 'Start tracking',
            },
            {
                iconPath: new vscode.ThemeIcon('graph'),
                tooltip: 'View metrics',
            },
        ],
        project: p,
    }))

    // Let user select a project to manage with enhanced UI
    const quickPick = vscode.window.createQuickPick()
    quickPick.items = projectItems
    quickPick.placeholder = 'Select a project to manage or create a new one'
    quickPick.title = 'Project Manager'
    quickPick.matchOnDescription = true
    quickPick.matchOnDetail = true

    return new Promise<void>((resolve) => {
        quickPick.onDidAccept(async () => {
            const selection = quickPick.selectedItems[0]
            quickPick.hide()

            // @ts-ignore - we know project exists on our items
            const selectedProject = selection.project

            if (!selectedProject) {
                resolve()
                return
            }

            // Show management options in a more visual way
            const actions = [
                {
                    label: selectedProject.is_tracking
                        ? '$(stop-circle) Stop Tracking'
                        : '$(play-circle) Start Tracking',
                    description: selectedProject.is_tracking
                        ? 'Pause tracking for this project'
                        : 'Begin tracking activities',
                    action: selectedProject.is_tracking
                        ? 'Stop Tracking'
                        : 'Start Tracking',
                },
                {
                    label: '$(graph) View Metrics',
                    description: 'See statistics and development metrics',
                    action: 'View Metrics',
                },
                {
                    label: '$(edit) Rename Project',
                    description: 'Change the project name',
                    action: 'Rename Project',
                },
                {
                    label: '$(folder) Change Folder',
                    description: 'Update the project folder path',
                    action: 'Change Folder',
                },
                {
                    label: '$(trash) Delete Project',
                    description: 'Remove this project and its data',
                    action: 'Delete Project',
                },
            ]

            const selectedActionItem = await vscode.window.showQuickPick(
                actions,
                {
                    placeHolder: `Select action for "${selectedProject.name}"`,
                    title: 'Project Actions',
                }
            )

            if (!selectedActionItem) {
                resolve()
                return
            }

            // Execute the selected action
            switch (selectedActionItem.action) {
                case 'Start Tracking':
                    await toggleProjectTracking(
                        selectedProject.name,
                        true,
                        db,
                        monitors,
                        globalStoragePath
                    )
                    break
                case 'Stop Tracking':
                    await toggleProjectTracking(
                        selectedProject.name,
                        false,
                        db,
                        monitors,
                        globalStoragePath
                    )
                    break
                case 'View Metrics':
                    await viewProjectMetrics(selectedProject.name, db)
                    break
                case 'Rename Project':
                    await renameProject(db)
                    break
                case 'Change Folder':
                    await changeProjectFolder(db, monitors)
                    break
                case 'Delete Project':
                    await deleteProject(selectedProject.name, db, monitors)
                    break
            }
            resolve()
        })

        quickPick.onDidTriggerItemButton(async (event) => {
            // @ts-ignore - we know project exists on our items
            const project = event.item.project

            if (!project) {
                return
            }

            // First button is for toggling tracking
            if (event.button === event.item.buttons![0]) {
                await toggleProjectTracking(
                    project.name,
                    !project.is_tracking,
                    db,
                    monitors,
                    globalStoragePath
                )
            }
            // Second button is for viewing metrics
            else if (event.button === event.item.buttons![1]) {
                quickPick.hide()
                await viewProjectMetrics(project.name, db)
            }

            quickPick.hide()
            resolve()
        })

        quickPick.onDidHide(() => resolve())
        quickPick.show()
    })
}
