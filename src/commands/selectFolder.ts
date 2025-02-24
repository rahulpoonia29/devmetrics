import * as vscode from 'vscode'
import path from 'path'

export async function selectFolder() {
    const folder = await vscode.window.showOpenDialog({
        title: 'Select a folder to track metrics',
        openLabel: 'Select Folder',
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        defaultUri: vscode.workspace.workspaceFolders
            ? vscode.workspace.workspaceFolders[0].uri
            : undefined,
    })

    if (!folder) {
        await vscode.window.showErrorMessage('No folder selected')
        return
    }
    const folderURI = path.basename(folder[0].fsPath)
    await vscode.workspace
        .getConfiguration()
        .update(
            'devmetrics.projectFolderPath',
            folderURI,
            vscode.ConfigurationTarget.Global
        )
    vscode.window.showInformationMessage('Folder selected: ' + folderURI)
}
