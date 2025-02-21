import * as vscode from "vscode";
import { MetricsStorage } from "./lib/MetricsStorage";
import { ProjectDiffAnalyzer } from "./lib/ProjectDiffAnalyzer";

export async function activate(context: vscode.ExtensionContext) {
    // const metricsStorage = new MetricsStorage(context.globalStorageUri.fsPath);
    // await metricsStorage.initialize();

    // let diffAnalyzer: ProjectDiffAnalyzer | null = null;

    console.log('Congratulations, your extension "devmetrics" is now active!');

    const selectFolderDisposable = vscode.commands.registerCommand(
        "devmetrics.selectFolder",
        async () => {
            const folder = await vscode.window.showOpenDialog({
                title: "Select a folder to track metrics",
                openLabel: "Select Folder",
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                defaultUri: vscode.workspace.workspaceFolders
                    ? vscode.workspace.workspaceFolders[0].uri
                    : undefined,
            });

            if (!folder) {
                await vscode.window.showErrorMessage("No folder selected");
                return;
            }
            const folderURI = folder[0].fsPath;
            await vscode.workspace
                .getConfiguration()
                .update(
                    "devmetrics.projectFolderPath",
                    folderURI,
                    vscode.ConfigurationTarget.Global
                );
            vscode.window.showInformationMessage(
                "Folder selected: " + folderURI
            );
        }
    );

    const enableTrackingDisposable = vscode.commands.registerCommand(
        "devmetrics.startTracking",
        async () => {
            const projectFolderPath = (await vscode.workspace
                .getConfiguration()
                .get("devmetrics.projectFolderPath")) as string;
            if (!projectFolderPath) {
                await vscode.window.showErrorMessage(
                    "No folder selected. Please select a folder to track metrics."
                );
                await vscode.commands.executeCommand("devmetrics.selectFolder");
                return;
            }
            const diffAnalyzer = new ProjectDiffAnalyzer(
                projectFolderPath,
                // metricsStorage,
                null,
                context.globalStorageUri.fsPath
            );
            // await diffAnalyzer.init();

            await vscode.workspace
                .getConfiguration()
                .update(
                    "devmetrics.trackingEnabled",
                    true,
                    vscode.ConfigurationTarget.Global
                );
            vscode.window.showInformationMessage(
                "Tracking enabled using git snapshot diff method"
            );
        }
    );

    // const showMetricsDisposable = vscode.commands.registerCommand(
    //     "devmetrics.showMetrics",
    //     async () => {
    //         await vscode.window.showInformationMessage(
    //             "Metrics not implemented"
    //         );
    //         // const metricsStorage = new MetricsStorage(
    //         //     context.globalStorageUri.fsPath
    //         // );
    //         // await metricsStorage.initialize();
    //         // if (metricsStorage) {
    //         //     const metrics = await metricsStorage.getMetrics();
    //         //     if (metrics.length === 0) {
    //         //         await vscode.window.showInformationMessage(
    //         //             "No metrics to show."
    //         //         );
    //         //         return;
    //         //     }
    //         //     const metricsText = metrics[0].summary;
    //         //     await vscode.window.showInformationMessage(metricsText);
    //         // } else {
    //         //     await vscode.window.showErrorMessage(
    //         //         "Metrics storage not initialized. Tracking may not be enabled."
    //         //     );
    //         // }
    //     }
    // );

    context.subscriptions.push(
        selectFolderDisposable,
        enableTrackingDisposable,
        // showMetricsDisposable,
        {
            dispose: async () => {
                // if (diffAnalyzer) {
                //     await diffAnalyzer.dispose();
                // }
                // await metricsStorage.close();
            },
        }
    );
}

// export function deactivate() {}
