import { createHash } from 'crypto'
import {
    ExtensionContext,
    ViewColumn,
    WebviewPanel,
    window,
    workspace,
} from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import getTimeLine from '../lib/generateTimelineHTML'

export default async function showMetrics(context: ExtensionContext) {
    const projectFolderPath = workspace
        .getConfiguration()
        .get('devmetrics.projectFolderPath') as string
    if (!projectFolderPath) {
        window.showErrorMessage('Project folder not selected.', {
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
        window.showInformationMessage('No metrics available.', {
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
