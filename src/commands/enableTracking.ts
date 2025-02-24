import * as vscode from 'vscode'
import { CodeChangeTracker } from '../lib/CodeChangeTracker'
import path from 'path'

export async function enableTracking(
    context: vscode.ExtensionContext,
    existingCodeChangeTracker: CodeChangeTracker | null = null
): Promise<{ codeChangeTracker: CodeChangeTracker } | void> {
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
        .get('devmetrics.trackingEnabled', vscode.ConfigurationTarget.Global)

    if (isTrackingEnabled) {
        vscode.window.showInformationMessage('Tracking is already enabled.')
        return
    }

    const analysisInterval =
        Number(
            vscode.workspace
                .getConfiguration()
                .get('devmetrics.analysisIntervalMinutes')
        ) || 60

    const codeChangeTracker =
        existingCodeChangeTracker ||
        new CodeChangeTracker(
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
        'Tracking enabled for ' + path.basename(projectFolderPath).toUpperCase()
    )
    return { codeChangeTracker }
}
