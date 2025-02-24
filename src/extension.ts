import * as crypto from 'crypto'
import * as vscode from 'vscode'
import { CodeChangeTracker } from './lib/CodeChangeTracker'
import getTimeLine from './lib/getTimeline'
import { ProjectMetricsDatabase } from './lib/MetricsDB'
import path from 'path'

export async function activate(context: vscode.ExtensionContext) {
    let codeChangeTracker: CodeChangeTracker | null = null

    const selectFolderDisposable = vscode.commands.registerCommand(
        'devmetrics.selectFolder',
        async () => {
            const folder = await vscode.window.showOpenDialog({
                title: 'Select a folder to track metrics',
                openLabel: 'Select Folder',
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                defaultUri: vscode.workspace.workspaceFolders
                    ? vscode.workspace.workspaceFolders[0].uri
                    : undefined,
            })

            if (!folder) {
                await vscode.window.showErrorMessage('No folder selected')
                return
            }
            const folderURI = path.basename(folder[0].fsPath)
            await vscode.workspace
                .getConfiguration()
                .update(
                    'devmetrics.projectFolderPath',
                    folderURI,
                    vscode.ConfigurationTarget.Global
                )
            vscode.window.showInformationMessage(
                'Folder selected: ' + folderURI
            )
        }
    )

    const enableTrackingDisposable = vscode.commands.registerCommand(
        'devmetrics.startTracking',
        async () => {
            const projectFolderPath = (await vscode.workspace
                .getConfiguration()
                .get('devmetrics.projectFolderPath')) as string

            if (!projectFolderPath) {
                await vscode.window.showErrorMessage(
                    'No folder selected. Please select a folder to track metrics.'
                )
                await vscode.commands.executeCommand('devmetrics.selectFolder')
                return
            }

            const isTrackingEnabled = vscode.workspace
                .getConfiguration()
                .get(
                    'devmetrics.trackingEnabled',
                    vscode.ConfigurationTarget.Global
                )

            if (isTrackingEnabled) {
                vscode.window.showInformationMessage(
                    'Tracking is already enabled.'
                )
                return
            }

            const analysisInterval =
                Number(
                    vscode.workspace
                        .getConfiguration()
                        .get('devmetrics.analysisIntervalMinutes')
                ) || 60

            codeChangeTracker = new CodeChangeTracker(
                projectFolderPath,
                context.globalStorageUri.fsPath,
                analysisInterval
            )
            await codeChangeTracker.startTracking()

            await vscode.workspace
                .getConfiguration()
                .update(
                    'devmetrics.trackingEnabled',
                    true,
                    vscode.ConfigurationTarget.Global
                )

            vscode.window.showInformationMessage(
                'Tracking enabled for ' +
                    path.basename(projectFolderPath).toUpperCase()
            )
        }
    )

    const disableTrackingDisposable = vscode.commands.registerCommand(
        'devmetrics.stopTracking',
        async () => {
            const isTrackingEnabled = vscode.workspace
                .getConfiguration()
                .get(
                    'devmetrics.trackingEnabled',
                    vscode.ConfigurationTarget.Global
                )

            if (!isTrackingEnabled) {
                vscode.window.showInformationMessage(
                    'Tracking is not currently enabled.'
                )
                return
            }

            await vscode.workspace
                .getConfiguration()
                .update(
                    'devmetrics.trackingEnabled',
                    false,
                    vscode.ConfigurationTarget.Global
                )

            if (codeChangeTracker) {
                await codeChangeTracker.stopTracking()
            }

            vscode.window.showInformationMessage('Tracking disabled.')
        }
    )

    const showMetricsDisposable = vscode.commands.registerCommand(
        'devmetrics.showMetrics',
        async () => {
            const projectFolderPath = vscode.workspace
                .getConfiguration()
                .get('devmetrics.projectFolderPath') as string
            if (!projectFolderPath) {
                vscode.window.showErrorMessage(
                    'Please select a project folder first.'
                )
                return
            }

            const sanitizedProjectFolderName = crypto
                .createHash('md5')
                .update(projectFolderPath)
                .digest('hex')

            const metricsStorage = new ProjectMetricsDatabase(
                context.globalStorageUri.fsPath,
                sanitizedProjectFolderName
            )
            const metrics = await metricsStorage.loadMetrics()

            if (metrics.length === 0) {
                vscode.window.showInformationMessage('No metrics available.')
                return
            }

            // Create and show WebView panel
            const panel = vscode.window.createWebviewPanel(
                'metricsTimeline',
                'Timeline',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                }
            )
            panel.webview.html = getTimeLine(metrics, context)
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
