import { basename } from 'path'
import {
    ConfigurationTarget,
    ExtensionContext,
    commands,
    window,
    workspace,
} from 'vscode'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'

export default async function enableTracking(
    context: ExtensionContext,
    existingMonitor: DevelopmentActivityMonitor | null = null
): Promise<DevelopmentActivityMonitor | null> {
    const projectFolderPath = (await workspace
        .getConfiguration()
        .get('devmetrics.projectFolderPath')) as string

    if (!projectFolderPath) {
        window.showErrorMessage('Project folder not set up.', {
            modal: true,
            detail: 'DevMetrics needs a project folder to track metrics. Please select a folder to continue.',
        })
        await commands.executeCommand('devmetrics.selectFolder')
        return null
    }

    const isTrackingEnabled = workspace
        .getConfiguration()
        .get('devmetrics.trackingEnabled', ConfigurationTarget.Global)

    if (isTrackingEnabled) {
        window.showInformationMessage('DevMetrics Tracking Status', {
            detail: 'Metrics tracking is already active for this project.',
        })
        return null
    }

    const codeChangeTracker =
        existingMonitor ||
        new DevelopmentActivityMonitor(
            projectFolderPath,
            context.globalStorageUri.fsPath
        )
    await codeChangeTracker.startTracking()

    await workspace
        .getConfiguration()
        .update('devmetrics.trackingEnabled', true, ConfigurationTarget.Global)

    window.showInformationMessage('DevMetrics Tracking is now active.', {
        detail: `Now tracking metrics for ${basename(projectFolderPath).toUpperCase()}.`,
    })
    return codeChangeTracker
}
