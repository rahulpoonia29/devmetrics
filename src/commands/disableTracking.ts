import { ConfigurationTarget, window, workspace } from 'vscode'
import { CodeChangeTracker } from '../lib/CodeChangeTracker'

export default async function disableTracking(
    codeChangeTracker?: CodeChangeTracker
) {
    const isTrackingEnabled = workspace
        .getConfiguration()
        .get('devmetrics.trackingEnabled', ConfigurationTarget.Global)

    if (!isTrackingEnabled) {
        window.showInformationMessage('DevMetrics Tracking Status', {
            modal: true,
            detail: 'Tracking is already disabled. No action needed.',
        })
        return
    }

    await workspace
        .getConfiguration()
        .update('devmetrics.trackingEnabled', false, ConfigurationTarget.Global)

    if (codeChangeTracker) {
        await codeChangeTracker.stopTracking()
    }

    window.showInformationMessage('DevMetrics Tracking Disabled', {
        modal: true,
        detail: 'Your coding activity tracking has been stopped successfully. You can re-enable it at any time through settings.',
    })
}
