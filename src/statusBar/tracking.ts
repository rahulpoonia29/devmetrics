import {
    ConfigurationTarget,
    StatusBarAlignment,
    StatusBarItem,
    window,
    workspace,
} from 'vscode'

export const trackingStatus = window.createStatusBarItem(
    StatusBarAlignment.Right,
    100
)

export function updateTrackingStatusBar(trackingStatus: StatusBarItem) {
    const isTrackingEnabled = workspace
        .getConfiguration()
        .get('devmetrics.trackingEnabled', ConfigurationTarget.Global)

    trackingStatus.text = `$(${isTrackingEnabled ? 'radio-tower' : 'circle-slash'}) DevMetrics $(${
        isTrackingEnabled ? 'check' : 'x'
    }) ${isTrackingEnabled ? 'Active' : 'Inactive'}`
    trackingStatus.tooltip = isTrackingEnabled
        ? 'DevMetrics is actively tracking code changes'
        : 'DevMetrics tracking is disabled'
    trackingStatus.command = isTrackingEnabled
        ? 'devmetrics.stopTracking'
        : 'devmetrics.startTracking'
}
