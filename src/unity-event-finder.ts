// Maps UnityEvent connections coming from the asset index onto the members of a
// C# document. The heavy lifting (finding members) lives in CSharpSyntax so it
// stays testable without an extension host.
import { Range, TextDocument } from "vscode";

import { CSharpMember, findPublicMethods, findUnityEventFields } from "./csharp-syntax";
import { logger } from "./logger";
import { UnityAssetIndex, UnityEventConnection } from "./unity-asset-index";
import { simpleClassName } from "./unity-naming";

export enum ConnectionEnd {
    event,
    calledMethod,
}

/** A member of the current document together with the connections it takes part in. */
export interface ConnectedMember {
    kind: ConnectionEnd;
    connections: UnityEventConnection[];
    range: Range;
}

// Number of documents kept in the cache. The previous implementation cached a
// single document, so alternating between two files re-parsed both every time.
const CACHE_LIMIT = 16;

function classMatches(connectionClass: string, member: CSharpMember): boolean {
    if (!connectionClass) {
        return false;
    }
    return connectionClass === member.className || simpleClassName(connectionClass) === member.simpleClassName;
}

export class UnityEventFinder {
    private readonly cache = new Map<string, ConnectedMember[]>();

    constructor(private readonly index: UnityAssetIndex) {}

    /**
     * Returns the connected members of the document.
     * Results are cached per document URI, document version and index version.
     */
    public find(document: TextDocument): ConnectedMember[] {
        const key = `${document.uri.toString()}|${document.version}|${this.index.version}`;

        const cached = this.cache.get(key);
        if (cached) {
            // Refresh the LRU position.
            this.cache.delete(key);
            this.cache.set(key, cached);
            return cached;
        }

        const startTime = Date.now();
        const members = this.collect(document);
        logger.debug(
            "Found %d Unity event bindings in %s in %d milliseconds",
            members.length,
            document.uri.fsPath,
            Date.now() - startTime
        );

        this.cache.set(key, members);
        while (this.cache.size > CACHE_LIMIT) {
            const oldest = this.cache.keys().next().value;
            if (oldest === undefined) {
                break;
            }
            this.cache.delete(oldest);
        }

        return members;
    }

    public clear(): void {
        this.cache.clear();
    }

    private collect(document: TextDocument): ConnectedMember[] {
        const source = document.getText();
        const members: ConnectedMember[] = [];

        for (const field of findUnityEventFields(source)) {
            const connections = this.index
                .getConnectionsForClass(field.simpleClassName)
                .filter(
                    (connection) => connection.event === field.name && classMatches(connection.callingClass, field)
                );

            members.push({
                kind: ConnectionEnd.event,
                connections,
                range: this.rangeOf(document, field),
            });
        }

        for (const method of findPublicMethods(source)) {
            const connections = this.index
                .getConnectionsForClass(method.simpleClassName)
                .filter(
                    (connection) =>
                        connection.calledMethod === method.name && classMatches(connection.calledClass, method)
                );

            // A public method without connections is just a method: no lens for it.
            if (connections.length === 0) {
                continue;
            }

            members.push({
                kind: ConnectionEnd.calledMethod,
                connections,
                range: this.rangeOf(document, method),
            });
        }

        return members;
    }

    private rangeOf(document: TextDocument, member: CSharpMember): Range {
        return new Range(document.positionAt(member.index), document.positionAt(member.index + member.name.length));
    }
}
