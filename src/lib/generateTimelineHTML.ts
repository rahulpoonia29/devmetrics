import { readFileSync } from 'fs'
import { join } from 'path'
import { ExtensionContext, window } from 'vscode'
import { CodeChangeMetrics } from '../types/Metrics'

export default function generateTimelineHTML(
    metrics: CodeChangeMetrics[],
    context: ExtensionContext
): string {
    try {
        const filePath = context.asAbsolutePath(
            join('src', 'html', 'metrics.html')
        )
        let htmlTemplate = readFileSync(filePath, 'utf8')

        // Inject metrics data as JSON
        const metricsJson = JSON.stringify(metrics, null, 2)
        htmlTemplate = htmlTemplate.replace('__METRICS_DATA__', metricsJson)

        return htmlTemplate
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        window.showErrorMessage(
            `Failed to generate timeline HTML: ${errorMessage}`
        )
        throw error
    }
}
