import { createHash } from 'crypto'
import {
    ExtensionContext,
    ViewColumn,
    WebviewPanel,
    window,
    workspace,
} from 'vscode'
import getTimeLine from '../lib/generateTimelineHTML'
import { MetricsDatabase } from '../lib/MetricsDatabase'

export default async function showMetrics(context: ExtensionContext) {
    const projectFolderPath = workspace
        .getConfiguration()
        .get('devmetrics.projectFolderPath') as string
    if (!projectFolderPath) {
        await window.showErrorMessage('Project Folder Not Selected', {
            modal: true,
            detail: 'Please configure a project folder in settings to view metrics.',
        })
        return
    }

    const sanitizedProjectFolderName = createHash('md5')
        .update(projectFolderPath)
        .digest('hex')

    const metricsStorage = new MetricsDatabase(
        context.globalStorageUri.fsPath,
        sanitizedProjectFolderName
    )
    const metrics = await metricsStorage.loadMetrics()

    if (metrics.length === 0) {
        await window.showInformationMessage('No Metrics Available', {
            detail: 'Start coding to generate metrics data.',
        })
        return
    }

    // Create and show WebView panel
    const panel: WebviewPanel = window.createWebviewPanel(
        'metricsTimeline',
        'Developer Metrics Timeline',
        ViewColumn.One,
        {
            enableScripts: true,
        }
    )
    panel.webview.html = getTimeLine(metrics, context)
}
