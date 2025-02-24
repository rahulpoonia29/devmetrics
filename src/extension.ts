import * as vscode from 'vscode'
import {
    disableTracking,
    enableTracking,
    selectFolder,
    showMetrics,
} from './commands'
import { CodeChangeTracker } from './lib/CodeChangeTracker'
import { lastSavedStatus, updateLastSavedStatus } from './statusBar/lastSaved'
import { trackingStatus, updateTrackingStatusBar } from './statusBar/tracking'

export async function activate(context: vscode.ExtensionContext) {
    let codeChangeTracker: CodeChangeTracker | null = null

    const selectFolderDisposable = vscode.commands.registerCommand(
        'devmetrics.selectFolder',
        async () => {
            await selectFolder()
        }
    )

    const enableTrackingDisposable = vscode.commands.registerCommand(
        'devmetrics.startTracking',
        async () => {
            const result = await enableTracking(context, codeChangeTracker)
            if (result && result.codeChangeTracker) {
                codeChangeTracker = result.codeChangeTracker
            }
        }
    )

    const disableTrackingDisposable = vscode.commands.registerCommand(
        'devmetrics.stopTracking',
        async () => {
            if (codeChangeTracker) {
                await disableTracking(codeChangeTracker)
                codeChangeTracker = null
            } else {
                await disableTracking()
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
    updateTrackingStatusBar(trackingStatus)
    trackingStatus.show()
    updateLastSavedStatus(lastSavedStatus)
    lastSavedStatus.show()

    // Update status bar items on configuration change
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('devmetrics.trackingEnabled')) {
            updateTrackingStatusBar(trackingStatus)
        }
        if (event.affectsConfiguration('devmetrics.lastSavedTime')) {
            updateLastSavedStatus(lastSavedStatus)
        }
    })

    // Update status bar items on workspace change
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        updateTrackingStatusBar(trackingStatus)
        updateLastSavedStatus(lastSavedStatus)
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
        trackingStatus,
        lastSavedStatus,
        // Disposables
        selectFolderDisposable,
        enableTrackingDisposable,
        disableTrackingDisposable,
        showMetricsDisposable,
        {
            dispose: async () => {
                if (codeChangeTracker) {
                    // Gather and save metrics before deactivating
                    await codeChangeTracker.stopTracking()
                }
            },
        }
    )
}
