import { titleize, underscore } from "inflection";
import { CancellationToken, Hover, HoverProvider, MarkdownString, Position, TextDocument } from "vscode";
import { ConnectionEnd, findConnectedMembers } from "./connected-member-finder";
import { language } from "../extension";

export default class UnityEventReferencesHoverProvider implements HoverProvider {
    async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | null> {
        let connectedMembers = await findConnectedMembers(document);

        let connectedMember = connectedMembers.find(member => member.range.contains(position));
        if (!connectedMember) { return null; }

        let markdownStrings = connectedMember.connections.map(connection => {
            let markdown: string;
            if (language === 'ko') {
                if (connectedMember?.kind === ConnectionEnd.event) {
                    markdown = '`' + connection.calledClass + '.' + connection.calledMethod + '`' + '를 호출합니다.';
                } else {
                    markdown = '(Scene) `' + connection.scene + '`의 ';

                    const callingClass = connection.callingClass;
                    if (callingClass) {
                        markdown += '(Class) `' + friendlyName(callingClass) + '`의 ';
                    }

                    markdown += '`' + connection.gameObject + '`에서 `' + friendlyName(connection.event) + '`으로 호출됩니다.';
                }
            }
            else {
                if (connectedMember?.kind === ConnectionEnd.event) {
                    markdown = 'Calls `' + connection.calledClass + '.' + connection.calledMethod + '`';
                } else {
                    markdown = 'Called by `' + friendlyName(connection.event) + '` from `' + connection.gameObject + '`';
                    const callingClass = connection.callingClass;
                    if (callingClass) {
                        markdown += '\'s `' + friendlyName(callingClass) + '` component';
                    }
                    markdown += ' in scene `' + connection.scene + '`';
                }
            }
            return new MarkdownString(markdown);
        });

        return new Hover(markdownStrings);
    }

}

function friendlyName(event: string): string {
    if (event.startsWith('m_')) {
        event = event.substring(2);
    }
    return titleize(underscore(event));
}
