import * as vscode from 'vscode'
import {
    disableTracking,
    enableTracking,
    selectFolder,
    showMetrics,
} from './commands'
import { DevelopmentActivityMonitor } from './core/DevelopmentActivityMonitor'
import { StatusBarItems, statusBarActions } from './statusBar/index'

export async function activate(context: vscode.ExtensionContext) {
    let developmentActivityMonitor: DevelopmentActivityMonitor | null = null

    const selectFolderDisposable = vscode.commands.registerCommand(
        'devmetrics.selectFolder',
        async () => {
            await selectFolder()
        }
    )

    const enableTrackingDisposable = vscode.commands.registerCommand(
        'devmetrics.startTracking',
        async () => {
            const result = await enableTracking(
                context,
                developmentActivityMonitor
            )
            if (result) {
                developmentActivityMonitor = result
            }
        }
    )

    const disableTrackingDisposable = vscode.commands.registerCommand(
        'devmetrics.stopTracking',
        async () => {
            if (developmentActivityMonitor) {
                await disableTracking(developmentActivityMonitor)
                developmentActivityMonitor = null
            } else {
                vscode.window.showInformationMessage(
                    'Tracking is not currently active.',
                    {
                        detail: 'You can enable it to start tracking your coding activity.',
                    }
                )
            }
        }
    )

    const showMetricsDisposable = vscode.commands.registerCommand(
        'devmetrics.showMetrics',
        async () => {
            await showMetrics(context)
        }
    )

    // Initialize status bar items
    statusBarActions.updateTrackingStatus(StatusBarItems.trackingStatus)
    statusBarActions.updateLastSavedTime(StatusBarItems.lastSavedTime)
    StatusBarItems.trackingStatus.show()
    StatusBarItems.lastSavedTime.show()

    // Update status bar items on configuration change
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('devmetrics.trackingEnabled')) {
            statusBarActions.updateTrackingStatus(StatusBarItems.trackingStatus)
        }
        if (event.affectsConfiguration('devmetrics.lastSavedTime')) {
            statusBarActions.updateLastSavedTime(StatusBarItems.lastSavedTime)
        }
    })

    // Update status bar items on workspace change
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        statusBarActions.updateTrackingStatus(StatusBarItems.trackingStatus)
        statusBarActions.updateLastSavedTime(StatusBarItems.lastSavedTime)
    })

    // Start tracking on startup if enabled in settings
    if (
        vscode.workspace
            .getConfiguration()
            .get(
                'devmetrics.trackingEnabled',
                vscode.ConfigurationTarget.Global
            )
    )
        vscode.commands.executeCommand('devmetrics.startTracking')

    context.subscriptions.push(
        // Status bar Items
        StatusBarItems.trackingStatus,
        StatusBarItems.lastSavedTime,
        // Disposables
        selectFolderDisposable,
        enableTrackingDisposable,
        disableTrackingDisposable,
        showMetricsDisposable,
        {
            dispose: async () => {
                if (developmentActivityMonitor) {
                    // Gather and save metrics before deactivating
                    await developmentActivityMonitor.stopTracking()
                }
            },
        }
    )
}
