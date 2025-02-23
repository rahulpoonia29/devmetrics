import * as crypto from 'crypto'
import * as vscode from 'vscode'
import { ProjectMetricsDatabase } from './lib/MetricsDB'
import { CodeChangeTracker } from './lib/CodeChangeTracker'
import { CodeChangeMetrics } from './types/Metrics'

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
            const folderURI = folder[0].fsPath
            await vscode.workspace
                .getConfiguration()
                .update(
                    'devmetrics.projectFolderPath',
                    folderURI,
                    vscode.ConfigurationTarget.Global
                )
            vscode.window.showInformationMessage(
                'Folder selected: ' + folderURI.split('/').pop()
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

            codeChangeTracker = new CodeChangeTracker(
                projectFolderPath,
                context.globalStorageUri.fsPath
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
                'Tracking enabled using git snapshot metric method'
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

            // Basic UI: Show metrics in a QuickPick
            // TODO: Have panel in future
            const quickPickItems = metrics.map((metric: CodeChangeMetrics) => ({
                label: `${metric.summary.filesChanged} files changed with ${metric.summary.insertions}+++ ${metric.summary.deletions}---`,
                metric: metric,
            }))

            vscode.window
                .showQuickPick(quickPickItems, {
                    placeHolder: 'Select a metric to view details',
                    canPickMany: false,
                })
                .then((selectedItem) => {
                    if (selectedItem) {
                        vscode.window.showInformationMessage(
                            `Details: ${JSON.stringify(
                                selectedItem.metric.diffSummaryMessage,
                                null,
                                2
                            )}`
                        )
                    }
                })
        }
    )

    context.subscriptions.push(
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
