import fs from 'fs'
import path from 'path'
import { ExtensionContext } from 'vscode'
import { CodeChangeMetrics } from '../types/Metrics'

export default function getTimeLine(
    metrics: CodeChangeMetrics[],
    context: ExtensionContext
): string {
    const filePath = context.asAbsolutePath(
        path.join('src', 'html', 'metrics.html')
    )
    let htmlTemplate = fs.readFileSync(filePath, 'utf8')

    // Inject metrics data as JSON
    const metricsJson = JSON.stringify(metrics)
    htmlTemplate = htmlTemplate.replace('__METRICS_DATA__', metricsJson)

    return htmlTemplate
}
