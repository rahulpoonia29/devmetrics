import { StatusBarAlignment, StatusBarItem, window, workspace } from 'vscode'

export const lastSavedStatus = window.createStatusBarItem(
    StatusBarAlignment.Right,
    99
)

export function updateLastSavedStatus(lastSavedStatus: StatusBarItem): void {
    const lastSavedTime = workspace
        .getConfiguration()
        .get<number>('devmetrics.lastSavedTime')

    if (
        lastSavedTime === undefined ||
        lastSavedTime === null ||
        lastSavedTime.toString() === '' ||
        isNaN(new Date(lastSavedTime).getTime())
    ) {
        lastSavedStatus.text = '$(sync) No saves'
        lastSavedStatus.tooltip = 'Start tracking to collect metrics'
    } else {
        const timeAgo = getTimeAgo(new Date(lastSavedTime))
        lastSavedStatus.text = `$(database) Saved ${timeAgo}`
        lastSavedStatus.tooltip = `Last metrics save: ${new Date(lastSavedTime).toLocaleString()}`
    }
    lastSavedStatus.command = 'devmetrics.showMetrics'
}

function getTimeAgo(date: Date): string {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}
