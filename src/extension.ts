import * as vscode from 'vscode'
import { CodeChangeTracker } from './lib/CodeChangeTracker'
import getTimeLine from './lib/TimelineGenerator.ts'
import { MetricsDatabase } from './lib/MetricsDatabase'
import {
    selectFolder,
    enableTracking,
    disableTracking,
    showMetrics,
} from './commands'
import path from 'path'

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

    const trackingStatus = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    )
    updateTrackingStatusBar(trackingStatus)
    trackingStatus.show()

    const lastSavedStatus = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    )
    updateLastSavedStatus(lastSavedStatus)
    lastSavedStatus.show()

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('devmetrics.trackingEnabled')) {
            updateTrackingStatusBar(trackingStatus)
        }
        if (event.affectsConfiguration('devmetrics.lastSavedTime')) {
            updateLastSavedStatus(lastSavedStatus)
        }
    })

    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        updateTrackingStatusBar(trackingStatus)
        updateLastSavedStatus(lastSavedStatus)
    })

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
        // Status bar Item
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
                    await codeChangeTracker.stopTracking()
                }
            },
        }
    )
}

function updateTrackingStatusBar(trackingStatus: vscode.StatusBarItem) {
    const isTrackingEnabled = vscode.workspace
        .getConfiguration()
        .get('devmetrics.trackingEnabled', vscode.ConfigurationTarget.Global)

    trackingStatus.text = `$(${isTrackingEnabled ? 'radio-tower' : 'circle-slash'}) DevMetrics $(${
        isTrackingEnabled ? 'check' : 'x'
    }) ${isTrackingEnabled ? 'Active' : 'Inactive'}`
    trackingStatus.tooltip = isTrackingEnabled
        ? 'DevMetrics is actively tracking code changes'
        : 'DevMetrics tracking is disabled'
    trackingStatus.command = isTrackingEnabled
        ? 'devmetrics.stopTracking'
        : 'devmetrics.startTracking'
}

function updateLastSavedStatus(lastSavedStatus: vscode.StatusBarItem) {
    const lastSavedTime = vscode.workspace
        .getConfiguration()
        .get('devmetrics.lastSavedTime', vscode.ConfigurationTarget.Global)

    if (
        lastSavedTime === undefined ||
        null ||
        lastSavedTime.toString() === '' ||
        isNaN(new Date(lastSavedTime).getTime())
    ) {
        lastSavedStatus.text = '$(sync) No saves'
        lastSavedStatus.tooltip = 'Start tracking to collect metrics'
    } else {
        const timeAgo = getTimeAgo(new Date(lastSavedTime))
        lastSavedStatus.text = `$(database) Saved ${timeAgo}`
        lastSavedStatus.tooltip = `Last metrics save: ${new Date(lastSavedTime).toLocaleString()}`
    }
    lastSavedStatus.command = 'devmetrics.showMetrics'
}

function getTimeAgo(date: Date): string {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}
