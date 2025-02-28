import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'
import { ProjectTreeItem } from '../views/ProjectsTreeProvider'
import { changeProjectFolder } from './changeProjectFolder'
import { createProject } from './createProject'
import { deleteProject } from './deleteProject'
import { manageProjects } from './manageProjects'
import { renameProject } from './renameProject'
import { toggleProjectTracking } from './toggleProjectTracking'
import { viewProjectMetrics } from './viewProjectMetrics'

export async function registerCommands(
    db: MetricsDatabase,
    monitors: Map<string, DevelopmentActivityMonitor>,
    globalStoragePath: string
): Promise<vscode.Disposable[]> {
    const createProjectCmd = vscode.commands.registerCommand(
        'devmetrics.createProject',
        () =>
            createProject(db, monitors, globalStoragePath).then(() => {
                vscode.commands.executeCommand('devmetrics.refreshData')
            })
    )

    const deleteProjectCmd = vscode.commands.registerCommand(
        'devmetrics.deleteProject',
        async (treeItem?: ProjectTreeItem) => {
            if (treeItem && treeItem.project) {
                // Called from tree view (Fetch project name from tree item)
                const projectName = treeItem.project.name
                await deleteProject(projectName, db, monitors)
                vscode.commands.executeCommand('devmetrics.refreshData')
                return
            } else {
                // Get all projects
                const projects = await db.getAllProjects()

                if (projects.length === 0) {
                    vscode.window.showInformationMessage(
                        'No projects available. Please create a project first.'
                    )
                    return
                }

                // Build project list
                const projectItems = projects.map((p) => ({
                    label: p.name,
                    description: p.folder_path,
                    project: p,
                }))

                // Let user select a project
                const selected = await vscode.window.showQuickPick(
                    projectItems,
                    {
                        placeHolder: 'Select a project to delete',
                        title: 'Delete Project',
                    }
                )

                if (!selected) {
                    return // User cancelled
                }

                const projectName = selected.project.name
                deleteProject(projectName, db, monitors).then(() =>
                    vscode.commands.executeCommand('devmetrics.refreshData')
                )
            }
        }
    )

    const manageProjectsCmd = vscode.commands.registerCommand(
        'devmetrics.manageProjects',
        () =>
            manageProjects(db, monitors, globalStoragePath).then(() => {
                vscode.commands.executeCommand('devmetrics.refreshData')
            })
    )

    const renameProjectCmd = vscode.commands.registerCommand(
        'devmetrics.renameProject',
        () =>
            renameProject(db).then(() => {
                vscode.commands.executeCommand('devmetrics.refreshData')
            })
    )

    const changeProjectFolderCmd = vscode.commands.registerCommand(
        'devmetrics.changeProjectFolder',
        () =>
            changeProjectFolder(db, monitors).then(() => {
                vscode.commands.executeCommand('devmetrics.refreshData')
            })
    )

    const startTrackingCmd = vscode.commands.registerCommand(
        'devmetrics.startTracking',
        async (treeItem?: ProjectTreeItem) => {
            if (treeItem && treeItem.project) {
                // Called from tree view (Fetch project name from tree item)
                const projectName = treeItem.project.name
                await toggleProjectTracking(
                    projectName,
                    true,
                    db,
                    monitors,
                    globalStoragePath
                )
                vscode.commands.executeCommand('devmetrics.refreshData')
                return
            } else {
                // Get all projects
                const projects = await db.getAllProjects()

                if (projects.length === 0) {
                    vscode.window.showInformationMessage(
                        'No projects available. Please create a project first.'
                    )
                    return
                }

                // Build project list
                const projectItems = projects.map((p) => ({
                    label: p.name,
                    description: p.folder_path,
                    project: p,
                }))

                // Let user select a project
                const selected = await vscode.window.showQuickPick(
                    projectItems,
                    {
                        placeHolder: 'Select a project to start tracking',
                        title: 'Start Tracking',
                    }
                )

                if (!selected) {
                    return // User cancelled
                }

                const projectName = selected.project.name
                toggleProjectTracking(
                    projectName,
                    true,
                    db,
                    monitors,
                    globalStoragePath
                ).then(() =>
                    vscode.commands.executeCommand('devmetrics.refreshData')
                )
            }
        }
    )

    const stopTrackingCmd = vscode.commands.registerCommand(
        'devmetrics.stopTracking',
        async (treeItem?: ProjectTreeItem) => {
            if (treeItem && treeItem.project) {
                // Called from tree view (Fetch project name from tree item)
                const projectName = treeItem.project.name
                await toggleProjectTracking(
                    projectName,
                    false,
                    db,
                    monitors,
                    globalStoragePath
                )
                vscode.commands.executeCommand('devmetrics.refreshData')
                return
            } else {
                // Get all projects
                const projects = await db.getAllProjects()

                if (projects.length === 0) {
                    vscode.window.showInformationMessage(
                        'No projects available. Please create a project first.'
                    )
                    return
                }

                // Build project list
                const projectItems = projects.map((p) => ({
                    label: p.name,
                    description: p.folder_path,
                    project: p,
                }))

                // Let user select a project
                const selected = await vscode.window.showQuickPick(
                    projectItems,
                    {
                        placeHolder: 'Select a project to stop tracking',
                        title: 'Stop Tracking',
                    }
                )

                if (!selected) {
                    return // User cancelled
                }

                const projectName = selected.project.name
                toggleProjectTracking(
                    projectName,
                    false,
                    db,
                    monitors,
                    globalStoragePath
                ).then(() =>
                    vscode.commands.executeCommand('devmetrics.refreshData')
                )
            }
        }
    )

    const viewProjectMetricsCmd = vscode.commands.registerCommand(
        'devmetrics.viewProjectMetrics',
        async (treeItem?: any) => {
            if (treeItem && treeItem.project) {
                // Called from tree view
                const projectName = treeItem.project.name
                await viewProjectMetrics(projectName, db)
                vscode.commands.executeCommand('devmetrics.refreshData')
                return
            }

            // Get all projects
            const projects = await db.getAllProjects()

            if (projects.length === 0) {
                vscode.window.showInformationMessage(
                    'No projects available. Please create a project first.'
                )
                return
            }

            // Build project list
            const projectItems = projects.map((p) => ({
                label: p.name,
                description: p.folder_path,
                project: p,
            }))

            // Let user select a project
            const selected = await vscode.window.showQuickPick(projectItems, {
                placeHolder: 'Select a project to view metrics for',
                title: 'View Project Metrics',
            })

            if (!selected) {
                return // User cancelled
            }

            const projectName = selected.project.name
            viewProjectMetrics(projectName, db).then(() =>
                vscode.commands.executeCommand('devmetrics.refreshData')
            )
        }
    )

    return [
        createProjectCmd,
        deleteProjectCmd,
        manageProjectsCmd,
        renameProjectCmd,
        changeProjectFolderCmd,
        startTrackingCmd,
        stopTrackingCmd,
        viewProjectMetricsCmd,
    ]
}
