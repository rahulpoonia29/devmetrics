import * as vscode from 'vscode'

export class ExtensionConfig {
    static async getProjectPath(): Promise<string | undefined> {
        return vscode.workspace
            .getConfiguration('devmetrics')
            .get<string>('projectFolderPath')
    }

    static async setProjectPath(path: string): Promise<void> {
        await vscode.workspace
            .getConfiguration('devmetrics')
            .update(
                'projectFolderPath',
                path,
                vscode.ConfigurationTarget.Global
            )
    }

    static async getAnalysisInterval(): Promise<number> {
        return vscode.workspace
            .getConfiguration('devmetrics')
            .get<number>('analysisIntervalMinutes', 10)
    }

    static async setTrackingEnabled(enabled: boolean): Promise<void> {
        await vscode.workspace
            .getConfiguration('devmetrics')
            .update(
                'trackingEnabled',
                enabled,
                vscode.ConfigurationTarget.Global
            )
    }

    static getExcludedPaths(): string[] {
        return vscode.workspace
            .getConfiguration('devmetrics')
            .get<string[]>('excludedPaths', ['node_modules/**', '.git/**'])
    }
}
