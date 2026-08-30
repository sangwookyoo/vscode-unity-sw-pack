import { Hover, HoverProvider, MarkdownString, Position, TextDocument, l10n } from "vscode";

import { UnityEventConnection } from "./unity-asset-index";
import { ConnectedMember, ConnectionEnd, UnityEventFinder } from "./unity-event-finder";
import { toFriendlyName } from "./unity-naming";

function describe(member: ConnectedMember, connection: UnityEventConnection): string {
    if (member.kind === ConnectionEnd.event) {
        return l10n.t("Calls {0}.{1}", `\`${connection.calledClass}\``, `\`${connection.calledMethod}\``);
    }

    const event = `\`${toFriendlyName(connection.event)}\``;
    const gameObject = `\`${connection.gameObject}\``;
    const asset = `\`${connection.assetName}\``;

    return connection.kind === "prefab"
        ? l10n.t("Called by {0} on {1} in prefab {2}", event, gameObject, asset)
        : l10n.t("Called by {0} on {1} in scene {2}", event, gameObject, asset);
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
