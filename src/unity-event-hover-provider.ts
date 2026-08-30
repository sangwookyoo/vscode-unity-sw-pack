import { Hover, HoverProvider, MarkdownString, Position, TextDocument } from "vscode";

import { language } from "./extension";
import { UnityEventConnection } from "./unity-asset-index";
import { ConnectedMember, ConnectionEnd, UnityEventFinder } from "./unity-event-finder";
import { toFriendlyName } from "./unity-naming";

function assetLabel(connection: UnityEventConnection): string {
    return connection.kind === "prefab" ? "Prefab" : "Scene";
}

function describe(member: ConnectedMember, connection: UnityEventConnection): string {
    if (language === "ko") {
        if (member.kind === ConnectionEnd.event) {
            return "`" + connection.calledClass + "." + connection.calledMethod + "`" + "를 호출합니다.";
        }

        let markdown = "(" + assetLabel(connection) + ") `" + connection.assetName + "`의 ";
        if (connection.callingClass) {
            markdown += "(Class) `" + toFriendlyName(connection.callingClass) + "`의 ";
        }
        markdown += "`" + connection.gameObject + "`에서 `" + toFriendlyName(connection.event) + "`으로 호출됩니다.";
        return markdown;
    }

    if (member.kind === ConnectionEnd.event) {
        return "Calls `" + connection.calledClass + "." + connection.calledMethod + "`";
    }

    let markdown = "Called by `" + toFriendlyName(connection.event) + "` from `" + connection.gameObject + "`";
    if (connection.callingClass) {
        markdown += "'s `" + toFriendlyName(connection.callingClass) + "` component";
    }
    markdown += " in " + assetLabel(connection).toLowerCase() + " `" + connection.assetName + "`";
    return markdown;
}

export default class UnityEventHoverProvider implements HoverProvider {
    constructor(private readonly finder: UnityEventFinder) {}

    public provideHover(document: TextDocument, position: Position): Hover | null {
        const member = this.finder.find(document).find((candidate) => candidate.range.contains(position));
        if (!member) {
            return null;
        }

        return new Hover(member.connections.map((connection) => new MarkdownString(describe(member, connection))));
    }
}
