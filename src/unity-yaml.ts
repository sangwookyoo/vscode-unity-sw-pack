// Pure parsing helpers for Unity's YAML asset files (.unity, .prefab, .meta,
// EditorBuildSettings.asset). This module must stay free of "vscode" imports so
// that it can be unit tested without an extension host.
import * as yaml from "js-yaml";

/** A UnityEvent persistent call as it is stored inside a scene or prefab. */
export interface RawEventConnection {
    /** Fully qualified type name taken from m_TargetAssemblyTypeName, when present. */
    calledClassName?: string;
    /** GUID of the script that owns the called method, resolved from the target fileID. */
    calledClassGuid?: string;
    /** Name of the invoked method. */
    calledMethod: string;
    /** Name of the serialized UnityEvent field that holds the call. */
    event: string;
    /** GUID of the script that declares the UnityEvent field. */
    callingClassGuid: string;
    /** fileID of the GameObject the calling component is attached to. */
    gameObjectId: string;
}

/** Everything we extract from a single .unity or .prefab file. */
export interface UnityAssetData {
    connections: RawEventConnection[];
    /** fileID -> GameObject name, used to describe a connection to the user. */
    gameObjectNames: Map<string, string>;
    /** Every asset GUID referenced by the file (reverse index source). */
    referencedGuids: Set<string>;
    /**
     * GUIDs referenced through m_Script, i.e. the scripts the assets attaches.
     * Kept apart from referencedGuids, which also holds materials, textures and
     * everything else, so a missing script can be told from a missing texture.
     */
    scriptGuids: Set<string>;
}

export type WarnFunction = (message: string, ...args: unknown[]) => void;

// Unity YAML documents start with "--- !u!<classId> &<fileId>" (optionally " stripped").
const documentHeaderRegex = /^---\s+!u!(\d+)\s+&(\d+)( +.+)?$/gm;
const guidReferenceRegex = /guid:\s*([0-9a-fA-F]{32})/g;
const metaGuidRegex = /^guid:\s*([0-9a-fA-F]{32})\s*$/m;

// Unity class IDs we care about: 1 = GameObject, 114 = MonoBehaviour.
const gameObjectClassId = "1";
const monoBehaviourClassId = "114";

/** A single "--- !u!x &y" document inside a Unity YAML file. */
export interface UnityDocument {
    classId: string;
    fileId: string;
    body: string;
}

/**
 * Splits a Unity YAML file into its documents.
 * Unity's dialect cannot be fed to js-yaml as a multi-document stream because of
 * the "!u!" tags in the header line, so the file is split by hand.
 */
export function splitUnityDocuments(text: string): UnityDocument[] {
    const documents: UnityDocument[] = [];
    documentHeaderRegex.lastIndex = 0;

    let match = documentHeaderRegex.exec(text);
    while (match) {
        const start = match.index + match[0].length;
        const next = documentHeaderRegex.exec(text);
        const body = next ? text.substring(start, next.index) : text.substring(start);
        documents.push({ classId: match[1], fileId: match[2], body });
        match = next;
    }

    return documents;
}

/** Collects every asset GUID referenced by a scene or prefab file. */
export function collectGuidReferences(text: string): Set<string> {
    const guids = new Set<string>();
    guidReferenceRegex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = guidReferenceRegex.exec(text)) !== null) {
        guids.add(match[1]);
    }

    return guids;
}

/** Reads the GUID out of a .meta file. */
export function parseMetaGuid(text: string): string | undefined {
    const match = metaGuidRegex.exec(text);
    return match ? match[1] : undefined;
}

/**
 * Extracts UnityEvent connections, GameObject names and referenced GUIDs from a
 * .unity or .prefab file. The file text is not retained.
 */
export function parseUnityAsset(text: string, warn?: WarnFunction): UnityAssetData {
    const gameObjectNames = new Map<string, string>();
    const connections: RawEventConnection[] = [];
    // Component fileID -> script GUID; needed to resolve call targets afterwards.
    const fileIdsToGuids = new Map<string, string>();

    for (const document of splitUnityDocuments(text)) {
        if (document.classId !== gameObjectClassId && document.classId !== monoBehaviourClassId) {
            continue;
        }

        try {
            const tree = yaml.load(document.body) as any;
            if (!tree) {
                continue;
            }

            if (tree.GameObject) {
                gameObjectNames.set(document.fileId, tree.GameObject.m_Name);
            } else if (tree.MonoBehaviour) {
                connections.push(...parseMonoBehaviour(tree.MonoBehaviour, document.fileId, fileIdsToGuids));
            }
        } catch (error) {
            warn?.("Unable to parse document %s: %s", document.fileId, error);
        }
    }

    // The call targets were stored as component fileIDs; now that every document
    // has been visited they can be replaced with the actual script GUIDs.
    for (const connection of connections) {
        if (connection.calledClassGuid) {
            connection.calledClassGuid = fileIdsToGuids.get(connection.calledClassGuid);
        }
    }

    return {
        connections,
        gameObjectNames,
        referencedGuids: collectGuidReferences(text),
        scriptGuids: collectScriptReferences(text),
    };
}

function parseMonoBehaviour(behaviour: any, fileId: string, fileIdsToGuids: Map<string, string>): RawEventConnection[] {
    const guid = behaviour.m_Script?.guid;
    const gameObjectId = behaviour.m_GameObject?.fileID;
    if (!guid || !gameObjectId) {
        return [];
    }

    fileIdsToGuids.set(fileId, String(guid));

    const connections: RawEventConnection[] = [];
    for (const field in behaviour) {
        const calls = behaviour[field]?.m_PersistentCalls?.m_Calls;
        if (!Array.isArray(calls)) {
            continue;
        }

        for (const call of calls) {
            let calledClassName: string | undefined;
            let calledClassGuid: string | undefined;
            if (call.m_TargetAssemblyTypeName) {
                calledClassName = String(call.m_TargetAssemblyTypeName).split(",").shift()?.trim();
            } else if (call.m_Target?.fileID) {
                calledClassGuid = String(call.m_Target.fileID);
            }

            connections.push({
                calledClassName,
                calledClassGuid,
                calledMethod: call.m_MethodName,
                event: field,
                callingClassGuid: String(guid),
                gameObjectId: String(gameObjectId),
            });
        }
    }

    return connections;
}

/**
 * Reads the scene paths listed in ProjectSettings/EditorBuildSettings.asset.
 * The file uses Unity's "tag:unity3d.com" YAML tag, so a custom schema is required.
 */
export function parseBuildSettingsScenePaths(text: string, warn?: WarnFunction): string[] {
    const scenePaths: string[] = [];

    try {
        const tree = yaml.load(text, { schema: unitySchema }) as UnityTag;
        const scenes = tree?.data?.EditorBuildSettings?.m_Scenes;
        if (Array.isArray(scenes)) {
            for (const scene of scenes) {
                if (scene?.path) {
                    scenePaths.push(scene.path);
                }
            }
        }
    } catch (error) {
        warn?.("Unable to read EditorBuildSettings.asset: %s", error);
    }

    return scenePaths;
}

class UnityTag {
    type: string | undefined;
    data: any;
    constructor(type: string | undefined, data: any) {
        this.type = type;
        this.data = data;
    }
}

const tagConstructorOptions = {
    kind: "mapping",
    multi: true,
    representName: function (object: any) {
        return object.type;
    },
    represent: function (object: any) {
        return object.data;
    },
    instanceOf: UnityTag,
    construct: function (data: any, type: string | undefined) {
        return new UnityTag(type, data);
    },
} as yaml.TypeConstructorOptions;

const unityTag = new yaml.Type("tag:unity3d.com", tagConstructorOptions);
const unitySchema = yaml.DEFAULT_SCHEMA.extend([unityTag]);

// Unity serializes a script reference as m_Script with the MonoScript fileID.
// Matching that exact shape keeps material and texture GUIDs out of the result.
const scriptReferenceRegex = /m_Script:\s*\{\s*fileID:\s*11500000\s*,\s*guid:\s*([0-9a-fA-F]{32})\s*,/g;

/** GUIDs of the scripts a scene or prefab attaches. */
export function collectScriptReferences(text: string): Set<string> {
    const guids = new Set<string>();
    scriptReferenceRegex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = scriptReferenceRegex.exec(text)) !== null) {
        // Kept verbatim: .meta GUIDs are read the same way, so the two agree.
        guids.add(match[1]);
    }

    return guids;
}
