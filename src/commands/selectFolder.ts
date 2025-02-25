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
        await window.showErrorMessage(
            'Project folder selection was cancelled.',
            {
                modal: true,
                detail: 'Please select a folder to track development metrics.',
            }
        )
        return
    }

    await workspace
        .getConfiguration()
        .update(
            'devmetrics.projectFolderPath',
            folder[0].fsPath,
            ConfigurationTarget.Global
        )

    await window.showInformationMessage('Project folder has been updated.', {
        modal: false,
        detail: `Development metrics will now be tracked for: ${basename(folder[0].fsPath)}`,
    })
}
