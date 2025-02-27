import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'

export async function viewProjectMetrics(
    projectName: string,
    db: MetricsDatabase
): Promise<void> {
    // TODO: Implement metrics viewing
    // This would typically:
    // 1. Load metrics from database
    // 2. Display them in a webview or in the editor

    // For now, show a placeholder message
    vscode.window.showInformationMessage(
        `Metrics for "${projectName}" will be displayed here`
    )

    // const panel = vscode.window.createWebviewPanel(
    //     'projectMetrics',
    //     `Metrics: ${projectName}`,
    //     vscode.ViewColumn.One,
    //     {}
    // );

    // const metrics = await db.loadMetrics(projectName);
    // panel.webview.html = createMetricsHTML(metrics);
}
