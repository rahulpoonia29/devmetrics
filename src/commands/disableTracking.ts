import { ConfigurationTarget, window, workspace } from 'vscode'
import { DevelopmentActivityMonitor } from '../core/DevelopmentActivityMonitor'

export default async function disableTracking(
    developmentActivityMonitor: DevelopmentActivityMonitor
) {
    const isTrackingEnabled = workspace
        .getConfiguration()
        .get('devmetrics.trackingEnabled', true)

    if (!isTrackingEnabled) {
        window.showInformationMessage('Tracking is already turned off.', {
            detail: 'You can enable it to start tracking your coding activity.',
            modal: true,
        })
        return
    }

    await workspace
        .getConfiguration()
        .update('devmetrics.trackingEnabled', false, ConfigurationTarget.Global)

    await developmentActivityMonitor.stopTracking()

    window.showInformationMessage('Tracking has been turned off.', {
        detail: 'You can view your metrics by running the "Show Metrics" command.',
        modal: true,
    })
}
