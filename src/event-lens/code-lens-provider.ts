import { CodeLens, CodeLensProvider, Command, commands, Selection, TextDocument, window } from "vscode";
import { ConnectedMember, findConnectedMembers } from "./connected-member-finder";

export default class UnityEventReferencesCodeLensProvider implements CodeLensProvider {
    async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
        let connectedMembers = await findConnectedMembers(document);

        return connectedMembers.map(match => {
            const count = match.connections.length;

            let command: Command = {
                command: 'unity-event-lens.showEventReferences',
                title: `$(symbol-field) Unity Event ${count} references`,
                arguments: [match]
            };

            return new CodeLens(match.range, command);
        });
    }
}

export function showEventReferences(member: ConnectedMember) {
    if (!window.activeTextEditor) { return; }
    window.activeTextEditor.selection = new Selection(member.range.start, member.range.start);
    if (member.connections.length > 0) {
        commands.executeCommand('editor.action.showHover');
    }
}
