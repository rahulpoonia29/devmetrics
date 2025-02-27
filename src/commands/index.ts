import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'
import { changeProjectFolder } from './changeProjectFolder'
import { createProject } from './createProject'
import { manageProjects } from './manageProjects'
import { recordMetricsNow } from './projectCommands'
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
        () => createProject(db, monitors, globalStoragePath)
    )

    const manageProjectsCmd = vscode.commands.registerCommand(
        'devmetrics.manageProjects',
        () => manageProjects(db, monitors, globalStoragePath)
    )

    const renameProjectCmd = vscode.commands.registerCommand(
        'devmetrics.renameProject',
        () => renameProject(db)
    )

    const changeProjectFolderCmd = vscode.commands.registerCommand(
        'devmetrics.changeProjectFolder',
        () => changeProjectFolder(db, monitors)
    )

    const startTrackingCmd = vscode.commands.registerCommand(
        'devmetrics.startTracking',
        async () => {
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
                placeHolder: 'Select a project to start tracking',
                title: 'Start Tracking',
            })

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
            )
        }
    )

    const stopTrackingCmd = vscode.commands.registerCommand(
        'devmetrics.stopTracking',
        async () => {
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
                placeHolder: 'Select a project to stop tracking',
                title: 'Stop Tracking',
            })

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
            )
        }
    )

    const recordMetricsNowCmd = vscode.commands.registerCommand(
        'devmetrics.recordMetricsNow',
        async () => {
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
                placeHolder:
                    'Select a project to record metrics for immediately',
                title: 'Record Metrics Now',
            })

            if (!selected) {
                return // User cancelled
            }

            const projectName = selected.project.name
            recordMetricsNow(projectName, monitors)
        }
    )

    const viewProjectMetricsCmd = vscode.commands.registerCommand(
        'devmetrics.viewProjectMetrics',
        async () => {
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
            viewProjectMetrics(projectName, db)
        }
    )

    return [
        createProjectCmd,
        manageProjectsCmd,
        renameProjectCmd,
        changeProjectFolderCmd,
        startTrackingCmd,
        stopTrackingCmd,
        recordMetricsNowCmd,
        viewProjectMetricsCmd,
    ]
}
