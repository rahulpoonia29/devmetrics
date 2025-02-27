import {
    MarkdownString,
    StatusBarAlignment,
    StatusBarItem,
    ThemeColor,
    window,
} from 'vscode'
import { MetricsDatabase } from '../../DB/MetricsDatabase'

const COLOR_ACTIVE = '#4ec9b0;'
const COLOR_INACTIVE = '#f48771;'

export const projectsStatus = window.createStatusBarItem(
    StatusBarAlignment.Right,
    100
)

export async function updateProjectsStatus(
    statusItem: StatusBarItem,
    db: MetricsDatabase
): Promise<void> {
    const projects = await db.getAllProjects()
    const activeProjects = projects.filter((project) => project.is_tracking)

    statusItem.text = getStatusText(activeProjects.length, projects.length)
    statusItem.backgroundColor = getStatusColor(activeProjects.length)
    statusItem.tooltip = createTooltip(projects)
    statusItem.command =
        projects.length === 0
            ? 'devmetrics.createProject'
            : 'devmetrics.manageProjects'
}

function getStatusText(activeCount: number, totalCount: number): string {
    const icon = activeCount > 0 ? '$(radio-tower)' : '$(circle-slash)'
    return `${icon} DevMetrics: ${activeCount}/${totalCount}`
}

function getStatusColor(activeCount: number): ThemeColor | undefined {
    return activeCount > 0
        ? new ThemeColor('statusBarItem.prominentBackground')
        : undefined
}

function createTooltip(projects: any[]): MarkdownString {
    const tooltip = new MarkdownString()
    tooltip.supportHtml = true
    tooltip.isTrusted = true
    tooltip.supportThemeIcons = true

    if (projects.length === 0) {
        tooltip.appendMarkdown(`## DevMetrics\n\n`)
        tooltip.appendMarkdown(`No projects created yet.\n\n`)
        tooltip.appendMarkdown(
            `[$(add) Create a project](command:devmetrics.createProject)`
        )
    } else {
        tooltip.appendMarkdown(`## DevMetrics Projects\n\n`)
        tooltip.appendMarkdown(
            `| <th style="width: 40%;">Project</th> | <th style="width: 30%;">Status</th> | <th style="width: 30%;">Last Activity</th> |\n` // Width on TH (header)
        )
        tooltip.appendMarkdown(
            `| :-------------------------------- | :----------------------------: | -----------------------: |\n`
        )

        for (const project of projects) {
            const statusText = project.is_tracking ? 'Active' : 'Inactive'
            const statusIcon = project.is_tracking
                ? '$(check)'
                : '$(circle-slash)'
            const statusHtml = project.is_tracking
                ? `<span style="color:${COLOR_ACTIVE}">${statusIcon} ${statusText}</span>`
                : `<span style="color:${COLOR_INACTIVE}">${statusIcon} ${statusText}</span>`
            const lastSaved =
                project.last_saved_time && project.last_saved_time > 0
                    ? getTimeAgo(new Date(project.last_saved_time))
                    : 'No data'
            const projectNameCell = `**${project.name}**`

            tooltip.appendMarkdown(
                `| <td style="width: 40%;">${projectNameCell}</td> | <td style="width: 30%; text-align:center;">${statusHtml}</td> | <td style="width: 30%; text-align:left;">${lastSaved}</td> |\n` // Width on TD (data cells) + alignment
            )
        }

        tooltip.appendMarkdown(`\n\n`)
        tooltip.appendMarkdown(
            `[$(gear) Manage Projects](command:devmetrics.manageProjects)`
        )
    }

    return tooltip
}

function getTimeAgo(date: Date): string {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 30) return 'Just now'
    if (seconds < 60) return `${seconds}s ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`

    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`

    const years = Math.floor(days / 365)
    return `${years}y ago`
}
