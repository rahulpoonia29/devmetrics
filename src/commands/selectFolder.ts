import { basename } from 'path'
import {
    window,
    workspace,
    ConfigurationTarget,
    type OpenDialogOptions,
} from 'vscode'

export default async function selectFolder() {
    const dialogOptions: OpenDialogOptions = {
        title: 'Select Project Folder',
        openLabel: 'Track Metrics for this Folder',
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        defaultUri: workspace.workspaceFolders
            ? workspace.workspaceFolders[0].uri
            : undefined,
    }

    const folder = await window.showOpenDialog(dialogOptions)

    if (!folder) {
        await window.showErrorMessage('Project folder selection cancelled', {
            modal: true,
            detail: 'Please select a folder to track development metrics.',
        })
        return
    }

    const folderName = basename(folder[0].fsPath)
    await workspace
        .getConfiguration()
        .update(
            'devmetrics.projectFolderPath',
            folderName,
            ConfigurationTarget.Global
        )

    await window.showInformationMessage(
        'Project Folder Configuration Updated',
        {
            modal: false,
            detail: `Development metrics will be tracked for: ${folderName}`,
        }
    )
}
