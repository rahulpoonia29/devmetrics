import { basename } from 'path'
import {
    ConfigurationTarget,
    ExtensionContext,
    commands,
    window,
    workspace,
} from 'vscode'
import { CodeChangeTracker } from '../lib/CodeChangeTracker'

export default async function enableTracking(
    context: ExtensionContext,
    existingCodeChangeTracker: CodeChangeTracker | null = null
): Promise<{ codeChangeTracker: CodeChangeTracker } | void> {
    const projectFolderPath = (await workspace
        .getConfiguration()
        .get('devmetrics.projectFolderPath')) as string

    if (!projectFolderPath) {
        await window.showErrorMessage('Project folder not configured', {
            modal: true,
            detail: 'DevMetrics requires a project folder to track metrics. Please select a folder to continue.',
        })
        await commands.executeCommand('devmetrics.selectFolder')
        return
    }

    const isTrackingEnabled = workspace
        .getConfiguration()
        .get('devmetrics.trackingEnabled', ConfigurationTarget.Global)

    if (isTrackingEnabled) {
        await window.showInformationMessage('DevMetrics Tracking Status', {
            detail: 'Metrics tracking is already active for this project.',
        })
        return
    }

    const analysisInterval =
        Number(
            workspace
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

    await workspace
        .getConfiguration()
        .update('devmetrics.trackingEnabled', true, ConfigurationTarget.Global)

    await window.showInformationMessage('DevMetrics Tracking Enabled', {
        detail: `Now tracking metrics for ${basename(projectFolderPath).toUpperCase()}. Analysis interval: ${analysisInterval} minutes.`,
    })
    return { codeChangeTracker }
}
