import * as crypto from 'crypto'
import * as vscode from 'vscode'
import { MetricsStorage } from './lib/MetricsStorage'
import { ProjectDiffAnalyzer } from './lib/ProjectDiffAnalyzer'
import { Metric } from './types/Metrics'

export async function activate(context: vscode.ExtensionContext) {
    let diffAnalyzer: ProjectDiffAnalyzer | null = null

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
            console.log(projectFolderPath)

            if (!projectFolderPath) {
                await vscode.window.showErrorMessage(
                    'No folder selected. Please select a folder to track metrics.'
                )
                await vscode.commands.executeCommand('devmetrics.selectFolder')
                return
            }

            diffAnalyzer = new ProjectDiffAnalyzer(
                projectFolderPath,
                context.globalStorageUri.fsPath
            )
            await diffAnalyzer.init()

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

            const metricsStorage = new MetricsStorage(
                context.globalStorageUri.fsPath,
                sanitizedProjectFolderName
            )
            const metrics = await metricsStorage.getMetrics()

            if (metrics.length === 0) {
                vscode.window.showInformationMessage('No metrics available.')
                return
            }

            // Basic UI: Show metrics in a QuickPick
            // TODO: Have panel in future
            const quickPickItems = metrics.map((metric: Metric) => ({
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
        showMetricsDisposable,
        {
            dispose: async () => {
                if (diffAnalyzer) {
                    await diffAnalyzer.dispose()
                }
            },
        }
    )
}
