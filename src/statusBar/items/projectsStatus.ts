import {
    MarkdownString,
    StatusBarAlignment,
    StatusBarItem,
    ThemeColor,
    window,
} from 'vscode'
import { MetricsDatabase } from '../../DB/MetricsDatabase'

// Simplified color palette - only keeping essential status colors
const statusColorActive = '#4ec9b0;'
const statusColorInactive = '#f48771;'

const footerBackgroundColor = 'background-color:#2d2d2d;'
const footerTextColor = 'color:#3794ff;' // VS Code theme blue
const footerPadding = 'padding:8px;'
const footerMarginTop = 'margin-top:10px;'
const footerBorderRadius = 'border-radius:3px;'
const footerTextAlign = 'text-align:center;'

// Empty state styles
const createProjectButtonBackgroundColor = 'background-color:#333333;'
const createProjectButtonTextColor = 'color:#3794ff;' // VS Code theme blue
const createProjectButtonPadding = 'padding:8px;'
const createProjectButtonBorderRadius = 'border-radius:3px;'
const createProjectButtonMarginTop = 'margin-top:5px;'
const createProjectButtonFontWeight = 'font-weight:bold;'

export const projectsStatus = window.createStatusBarItem(
    StatusBarAlignment.Right,
    100
)

export async function updateProjectsStatus(
    statusItem: StatusBarItem,
    db: MetricsDatabase
): Promise<void> {
    // Get all projects
    const projects = await db.getAllProjects()
    const activeProjects = projects.filter((project) => project.is_tracking)

    if (projects.length === 0) {
        // No projects exist
        statusItem.text = '$(info) DevMetrics'
        statusItem.backgroundColor = new ThemeColor(
            'statusBarItem.warningBackground'
        )

        const tooltip = new MarkdownString()
        tooltip.supportHtml = true
        tooltip.isTrusted = true

        // Using mostly Markdown with minimal HTML
        tooltip.appendMarkdown(`## DevMetrics\n\n`)
        tooltip.appendMarkdown(`No projects created yet.\n\n`)

        // Using command links for better interactivity
        tooltip.appendMarkdown(
            `<div style="${createProjectButtonBackgroundColor}${createProjectButtonPadding}${footerTextAlign}${createProjectButtonBorderRadius}${createProjectButtonMarginTop}">`
        )
        tooltip.appendMarkdown(
            `<span style="${createProjectButtonTextColor}${createProjectButtonFontWeight}">+</span> `
        )
        tooltip.appendMarkdown(
            `<span style="${createProjectButtonTextColor}">[Create a project](command:devmetrics.createProject)</span>`
        )
        tooltip.appendMarkdown('</div>')

        statusItem.tooltip = tooltip
        statusItem.command = 'devmetrics.createProject'
        return
    }

    // Status bar text
    const icon =
        activeProjects.length > 0 ? '$(radio-tower)' : '$(circle-slash)'
    const activeColor =
        activeProjects.length > 0
            ? new ThemeColor('statusBarItem.prominentBackground')
            : undefined

    statusItem.text = `${icon} DevMetrics: ${activeProjects.length}/${projects.length}`
    statusItem.backgroundColor = activeColor

    // Create tooltip with Markdown
    const tooltip = new MarkdownString()
    tooltip.supportHtml = true
    tooltip.isTrusted = true // Allow command links and keep tooltip visible when hovering

    // Header in Markdown
    tooltip.appendMarkdown(`## DevMetrics Projects\n\n`)

    // Create a pure Markdown table with wider columns (using more spaces in header)
    tooltip.appendMarkdown(
        `| Project                | Status          | Last Activity     |\n`
    )
    tooltip.appendMarkdown(
        `| ---------------------- | :-------------: | ----------------: |\n`
    )

    // Add table rows
    for (const project of projects) {
        const statusText = project.is_tracking ? 'Active' : 'Inactive'
        // Only use HTML for colored status text
        const statusHtml = project.is_tracking
            ? `<span style="color:${statusColorActive}">${statusText}</span>`
            : `<span style="color:${statusColorInactive}">${statusText}</span>`

        let lastSaved = 'No data'
        if (project.last_saved_time && project.last_saved_time > 0) {
            lastSaved = getTimeAgo(new Date(project.last_saved_time))
        }

        // Pad content with spaces to maintain column width
        tooltip.appendMarkdown(
            `| **${project.name}** | ${statusHtml.padStart(16)} | ${lastSaved.padStart(16)} |\n`
        )
    }

    tooltip.appendMarkdown(`\n\n`)

    // Footer with action hint - using command links for better interactivity
    tooltip.appendMarkdown(
        `<div style="${footerMarginTop}${footerTextAlign}${footerPadding}${footerBackgroundColor}${footerBorderRadius}">`
    )
    tooltip.appendMarkdown(
        `<span style="${footerTextColor}">Click to manage projects</span>`
    )
    tooltip.appendMarkdown('</div>')

    statusItem.tooltip = tooltip
    statusItem.command = 'devmetrics.manageProjects'
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
