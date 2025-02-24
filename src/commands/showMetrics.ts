import * as vscode from 'vscode'
import * as crypto from 'crypto'
import getTimeLine from '../lib/TimelineGenerator.ts'
import { MetricsDatabase } from '../lib/MetricsDatabase'

export async function showMetrics(context: vscode.ExtensionContext) {
    const projectFolderPath = vscode.workspace
        .getConfiguration()
        .get('devmetrics.projectFolderPath') as string
    if (!projectFolderPath) {
        vscode.window.showErrorMessage('Please select a project folder first.')
        return
    }

    const sanitizedProjectFolderName = crypto
        .createHash('md5')
        .update(projectFolderPath)
        .digest('hex')

    const metricsStorage = new MetricsDatabase(
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
