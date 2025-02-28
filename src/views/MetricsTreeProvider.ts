import * as vscode from 'vscode'
import { MetricsDatabase } from '../DB/MetricsDatabase'
import { Project } from '../types/DatabaseTypes'

// Tree item for metrics data
export class MetricTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly value: string | number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode
            .TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState)
        this.description = `${value}`
        this.contextValue = 'metric'
        this.tooltip = `${label}: ${value}`
    }
}

// Tree item for a project that will contain metrics as children
export class MetricProjectItem extends vscode.TreeItem {
    constructor(
        public readonly project: Project,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode
            .TreeItemCollapsibleState.Collapsed
    ) {
        super(project.name, collapsibleState)
        this.description = project.is_tracking ? 'Active' : 'Inactive'
        this.contextValue = 'metric-project'
    }
}

// Tree item for time periods (Today, This Week, All Time, etc.)
export class MetricTimeframeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly projectName: string,
        public readonly timeframe: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode
            .TreeItemCollapsibleState.Collapsed
    ) {
        super(label, collapsibleState)
        this.contextValue = 'metric-timeframe'
    }
}

export class MetricsTreeProvider
    implements vscode.TreeDataProvider<vscode.TreeItem>
{
    private _onDidChangeTreeData: vscode.EventEmitter<
        vscode.TreeItem | undefined | null | void
    > = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>()
    readonly onDidChangeTreeData: vscode.Event<
        vscode.TreeItem | undefined | null | void
    > = this._onDidChangeTreeData.event

    constructor(private db: MetricsDatabase) {}

    refresh(): void {
        this._onDidChangeTreeData.fire()
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        // Root level - show all projects or just selected project
        if (!element) {
            const projects = await this.db.getAllProjects()
            if (projects.length === 0) {
                return [
                    new vscode.TreeItem(
                        'No projects found. Create a project to start tracking.'
                    ),
                ]
            }

            return projects.map((p) => new MetricProjectItem(p))
        }

        // Project level - show timeframes
        if (element instanceof MetricProjectItem) {
            return [
                new MetricTimeframeItem('Today', element.project.name, 'today'),
                new MetricTimeframeItem(
                    'This Week',
                    element.project.name,
                    'week'
                ),
                new MetricTimeframeItem(
                    'This Month',
                    element.project.name,
                    'month'
                ),
                new MetricTimeframeItem(
                    'All Time',
                    element.project.name,
                    'all'
                ),
            ]
        }

        // Timeframe level - show actual metrics
        if (element instanceof MetricTimeframeItem) {
            const projectName = element.projectName
            const timeframe = element.timeframe

            try {
                // Use the unified method with timeframe parameter
                const summary = await this.db.getMetricSummary(
                    projectName,
                    timeframe as 'today' | 'week' | 'month' | 'all'
                )

                if (!summary) {
                    return [
                        new vscode.TreeItem(
                            'No data available for this timeframe'
                        ),
                    ]
                }

                return [
                    new MetricTreeItem('Lines Added', summary.lines_added || 0),
                    new MetricTreeItem(
                        'Lines Removed',
                        summary.lines_removed || 0
                    ),
                    new MetricTreeItem(
                        'Files Modified',
                        summary.files_modified || 0
                    ),
                ]
            } catch (error) {
                console.error('Error fetching metrics:', error)
                return [new vscode.TreeItem('Error loading metrics')]
            }
        }

        return []
    }
}
