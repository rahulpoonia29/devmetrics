import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { Project } from '../types/DatabaseTypes'

// Define tree item types for Projects tree view
export class ProjectTreeItem extends vscode.TreeItem {
    constructor(
        public readonly project: Project,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(project.name, collapsibleState)

        // Add folder path as description
        this.description = project.folder_path

        // Set context value for proper commands to be available
        this.contextValue = project.is_tracking
            ? 'project-active'
            : 'project-inactive'

        // Set icon based on tracking status
        this.iconPath = new vscode.ThemeIcon(
            project.is_tracking ? 'record' : 'circle-outline',
            project.is_tracking
                ? new vscode.ThemeColor('charts.green')
                : new vscode.ThemeColor('charts.gray')
        )

        // Set tooltip with project details
        const tooltip = new vscode.MarkdownString()
        tooltip.supportThemeIcons = true
        tooltip.supportHtml = true
        tooltip.appendMarkdown(`**Project:** ${project.name}  `)
        tooltip.appendMarkdown(`<br>`)
        tooltip.appendMarkdown(`**Path:** ${project.folder_path}  `)
        tooltip.appendMarkdown(`<br>`)
        tooltip.appendMarkdown(
            `**Status:** ${project.is_tracking ? 'Active' : 'Inactive'}  `
        )
        tooltip.appendMarkdown(`<br>`)
        tooltip.appendMarkdown(`Right-click to see available commands.`) // Show available commands using context

        this.tooltip = tooltip
    }
}

export class ProjectsTreeProvider
    implements vscode.TreeDataProvider<ProjectTreeItem>
{
    private _onDidChangeTreeData: vscode.EventEmitter<
        ProjectTreeItem | undefined | null | void
    > = new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>()
    readonly onDidChangeTreeData: vscode.Event<
        ProjectTreeItem | undefined | null | void
    > = this._onDidChangeTreeData.event

    constructor(private db: MetricsDatabase) {}

    // Refresh the tree view on any command run
    /**
     * Refreshes the tree view, triggering a re-render of the tree data.
     * This method should be called whenever the underlying data changes,
     * ensuring the view reflects the most current state.
     *
     * @returns void
     */
    refresh(): void {
        this._onDidChangeTreeData.fire()
    }

    getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
        return element
    }

    async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
        if (element) {
            return [] // No children for project items
        } else {
            // Root level - show projects
            const projects = await this.db.getAllProjects()

            if (!projects || projects.length === 0) {
                return []
            }

            return projects.map((project) => {
                return new ProjectTreeItem(
                    project,
                    vscode.TreeItemCollapsibleState.None
                )
            })
        }
    }
}
