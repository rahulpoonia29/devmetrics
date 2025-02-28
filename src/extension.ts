import * as vscode from 'vscode'
import { registerCommands } from './commands'
import { refreshData } from './commands/refreshData'
import { DevelopmentActivityMonitor } from './core/DevelopmentActivityMonitor'
import { MetricsDatabase } from './DB/MetricsDatabase'
import { StatusBarItems, statusBarActions } from './statusBar/index'
import { MetricsTreeProvider } from './views/MetricsTreeProvider'
import { ProjectsTreeProvider } from './views/ProjectsTreeProvider'

export async function activate(context: vscode.ExtensionContext) {
    // Set up the database
    const DB = new MetricsDatabase(context.globalStorageUri)
    await DB.initializeDb()

    const projects = await DB.getAllProjects()

    // Map to store monitor instances for each project
    const monitorInstances = new Map<string, DevelopmentActivityMonitor>()

    projects.forEach((project) => {
        const development_activity_monitor_instance =
            new DevelopmentActivityMonitor(
                DB,
                project.name,
                project.folder_path,
                context.globalStorageUri.fsPath
            )

        // Start tracking for all the projects
        development_activity_monitor_instance.startTracking()

        monitorInstances.set(
            project.name,
            development_activity_monitor_instance
        )
    })

    // Initialize project tree view
    const projectsProvider = new ProjectsTreeProvider(DB)
    const projectsTreeView = vscode.window.createTreeView(
        'devmetrics.projectsView',
        {
            treeDataProvider: projectsProvider,
            showCollapseAll: false,
        }
    )

    // Initialize metrics tree view
    const metricsProvider = new MetricsTreeProvider(DB)
    const metricsTreeView = vscode.window.createTreeView(
        'devmetrics.metricsView',
        {
            treeDataProvider: metricsProvider,
            showCollapseAll: true,
        }
    )

    // Register the refresh command
    const refreshCommand = vscode.commands.registerCommand(
        'devmetrics.refreshData',
        () => refreshData(projectsProvider, DB, metricsProvider)
    )
    context.subscriptions.push(refreshCommand)

    // Register other commands
    const commandDisposables = await registerCommands(
        DB,
        monitorInstances,
        context.globalStorageUri.fsPath
    )

    // Initialize status bar with project status indicator
    await statusBarActions.updateProjectsStatus(
        StatusBarItems.projectsStatus,
        DB
    )
    StatusBarItems.projectsStatus.show()

    // Set up periodic status bar updates
    const statusUpdateInterval = setInterval(async () => {
        await statusBarActions.updateProjectsStatus(
            StatusBarItems.projectsStatus,
            DB
        )
    }, 60000 * 5) // Update every 5 minutes

    // Add all disposables to context
    context.subscriptions.push(
        ...commandDisposables,
        StatusBarItems.projectsStatus,
        { dispose: () => clearInterval(statusUpdateInterval) },
        { dispose: async () => await DB.close() },
        projectsTreeView,
        metricsTreeView,
        {
            dispose: () => {
                // Dispose all active monitors
                for (const monitor of monitorInstances.values()) {
                    monitor.stopTracking()
                }
            },
        }
    )
}

export function deactivate() {
    // Cleanup will be handled by the disposable in the activate function
}
