import * as vscode from 'vscode'
import { CodeChangeTracker } from '../lib/CodeChangeTracker'

export async function disableTracking(codeChangeTracker?: CodeChangeTracker) {
    const isTrackingEnabled = vscode.workspace
        .getConfiguration()
        .get('devmetrics.trackingEnabled', vscode.ConfigurationTarget.Global)

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
