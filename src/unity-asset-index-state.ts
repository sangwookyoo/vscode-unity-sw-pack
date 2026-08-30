// In-memory state of the Unity asset index: the GUID maps, the indexed scenes and
// prefabs, the reverse GUID index and the resolved UnityEvent connections.
// It deliberately contains no "vscode" imports (no watchers, no configuration, no
// disk access) so that the mutation rules can be unit tested directly.
import * as path from "path";

import { GuidReferenceIndex } from "./guid-reference-index";
import { assetBaseName, simpleClassName } from "./unity-naming";
import { RawEventConnection } from "./unity-yaml";

export type AssetKind = "scene" | "prefab";

/** A UnityEvent connection with every GUID already resolved to a display name. */
export interface UnityEventConnection {
    /** Absolute path of the scene or prefab that holds the connection. */
    assetPath: string;
    /** Scene or prefab name without extension. */
    assetName: string;
    /** Name of the GameObject the calling component sits on. */
    gameObject: string;
    /** Class that declares the UnityEvent field. */
    callingClass: string;
    /** Class whose method is invoked. */
    calledClass: string;
    /** Invoked method name. */
    calledMethod: string;
    /** Name of the UnityEvent field. */
    event: string;
    /** Whether the connection lives in a scene or in a prefab. */
    kind: AssetKind;
}

/** Everything an indexed scene or prefab contributes to the state. */
export interface AssetContent {
    connections: RawEventConnection[];
    gameObjectNames: Map<string, string>;
    guids: Set<string>;
}

interface AssetEntry {
    path: string;
    kind: AssetKind;
    connections: RawEventConnection[];
    gameObjectNames: Map<string, string>;
}

export const SCRIPT_META_SUFFIX = ".cs.meta";
const META_SUFFIX = ".meta";

/** Case-insensitive on Windows, so watcher and scan paths always agree. */
export function normalizeKey(filePath: string): string {
    const normalized = path.normalize(filePath);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function assetKindOf(filePath: string): AssetKind | undefined {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".unity") {
        return "scene";
    }
    if (ext === ".prefab") {
        return "prefab";
    }
    return undefined;
}

export function isScriptMeta(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(SCRIPT_META_SUFFIX);
}

/** Path of the asset a .meta file belongs to. */
export function assetPathOfMeta(metaPath: string): string {
    return metaPath.slice(0, -META_SUFFIX.length);
}

/**
 * Unity ignores folders that start with "." or end with "~".
 * Both the initial scan and the watcher use this so they index the same files.
 */
export function hasIgnoredSegment(relativePath: string): boolean {
    return relativePath
        .split(/[\\/]/)
        .filter((segment) => segment.length > 0)
        .some((segment) => segment.startsWith(".") || segment.endsWith("~"));
}

export class UnityAssetIndexState {
    /** GUID of a script file, keyed by the normalized .cs path. */
    private guidByScriptPath = new Map<string, string>();
    /** Script paths currently mapped to a GUID; a rename can hold two for a moment. */
    private scriptPathsByGuid = new Map<string, Set<string>>();
    /** Class name (file name) of a script, keyed by its GUID. */
    private classNameByGuid = new Map<string, string>();
    /** Indexed scenes and prefabs, keyed by their normalized path. */
    private assets = new Map<string, AssetEntry>();
    /** Reverse index: GUID -> normalized paths of the assets referencing it. */
    private guidReferences = new GuidReferenceIndex();
    /** Scene paths listed in EditorBuildSettings.asset, keyed by project root. */
    private buildSettingsScenes = new Map<string, string[]>();

    /** Connections grouped by simple class name; rebuilt lazily after a change. */
    private connectionsByClass?: Map<string, UnityEventConnection[]>;

    public get assetCount(): number {
        return this.assets.size;
    }

    // --- scripts ------------------------------------------------------------

    /** Records the GUID of a script file (the path of the .cs, not of the .meta). */
    public setScript(scriptPath: string, guid: string): void {
        const key = normalizeKey(scriptPath);

        const previous = this.guidByScriptPath.get(key);
        if (previous && previous !== guid) {
            // Unity regenerated the GUID for this script.
            this.detachScript(previous, key);
        }

        this.guidByScriptPath.set(key, guid);

        let paths = this.scriptPathsByGuid.get(guid);
        if (!paths) {
            paths = new Set<string>();
            this.scriptPathsByGuid.set(guid, paths);
        }
        paths.add(key);

        this.classNameByGuid.set(guid, assetBaseName(scriptPath));
        this.connectionsByClass = undefined;
    }

    /** Forgets a script file. */
    public removeScript(scriptPath: string): void {
        const key = normalizeKey(scriptPath);
        const guid = this.guidByScriptPath.get(key);
        if (!guid) {
            return;
        }

        this.guidByScriptPath.delete(key);
        this.detachScript(guid, key);
        this.connectionsByClass = undefined;
    }

    // A rename produces a delete of the old .meta and a create of the new one with
    // the same GUID, in either order. The class name may only be dropped once no
    // script path maps to the GUID any more.
    private detachScript(guid: string, scriptKey: string): void {
        const paths = this.scriptPathsByGuid.get(guid);
        paths?.delete(scriptKey);

        if (!paths || paths.size === 0) {
            this.scriptPathsByGuid.delete(guid);
            this.classNameByGuid.delete(guid);
        }
    }

    public getGuid(filePath: string): string | undefined {
        return this.guidByScriptPath.get(normalizeKey(filePath));
    }

    public getClassName(guid: string | undefined): string | undefined {
        return guid === undefined ? undefined : this.classNameByGuid.get(guid);
    }

    // --- scenes and prefabs -------------------------------------------------

    /** Indexes a scene or prefab, fully replacing anything indexed for it before. */
    public setAsset(assetPath: string, kind: AssetKind, content: AssetContent): void {
        const key = normalizeKey(assetPath);

        this.assets.set(key, {
            path: assetPath,
            kind,
            connections: content.connections,
            gameObjectNames: content.gameObjectNames,
        });
        this.guidReferences.set(key, content.guids);
        this.connectionsByClass = undefined;
    }

    /** Forgets a scene or prefab. */
    public removeAsset(assetPath: string): void {
        const key = normalizeKey(assetPath);
        if (!this.assets.delete(key)) {
            return;
        }

        this.guidReferences.remove(key);
        this.connectionsByClass = undefined;
    }

    /** Assets of the given kind that reference the GUID, from the reverse index. */
    public getReferences(guid: string, kind: AssetKind): string[] {
        const result: string[] = [];

        for (const key of this.guidReferences.getAssets(guid)) {
            const entry = this.assets.get(key);
            if (entry && entry.kind === kind) {
                result.push(entry.path);
            }
        }

        return result.sort();
    }

    // --- build settings -----------------------------------------------------

    public setBuildSettingsScenes(projectRoot: string, scenePaths: string[]): void {
        this.buildSettingsScenes.set(normalizeKey(projectRoot), scenePaths);
    }

    /**
     * Whether the UnityEvent connections of an asset should be indexed.
     * Prefabs are always indexed; scenes are filtered when the user restricted the
     * feature to the scenes listed in EditorBuildSettings.asset.
     */
    public shouldIndexConnections(
        assetPath: string,
        kind: AssetKind,
        projectRoot: string | undefined,
        onlyScenesInBuildSettings: boolean
    ): boolean {
        if (kind !== "scene" || !onlyScenesInBuildSettings) {
            return true;
        }

        const scenes = projectRoot ? this.buildSettingsScenes.get(normalizeKey(projectRoot)) : undefined;
        if (!scenes || scenes.length === 0) {
            return true;
        }

        const normalized = assetPath.replace(/\\/g, "/");
        return scenes.some((listed) => normalized.endsWith(listed));
    }

    // --- connections --------------------------------------------------------

    /** UnityEvent connections that involve the given class, by its simple name. */
    public getConnectionsForClass(className: string): UnityEventConnection[] {
        if (!this.connectionsByClass) {
            this.connectionsByClass = this.buildConnectionsByClass();
        }
        return this.connectionsByClass.get(className) ?? [];
    }

    private buildConnectionsByClass(): Map<string, UnityEventConnection[]> {
        const byClass = new Map<string, UnityEventConnection[]>();

        const add = (className: string, connection: UnityEventConnection) => {
            if (!className) {
                return;
            }
            const key = simpleClassName(className);
            const bucket = byClass.get(key);
            if (bucket) {
                bucket.push(connection);
            } else {
                byClass.set(key, [connection]);
            }
        };

        for (const entry of this.assets.values()) {
            for (const raw of entry.connections) {
                const connection = this.resolveConnection(entry, raw);
                add(connection.callingClass, connection);
                if (simpleClassName(connection.calledClass) !== simpleClassName(connection.callingClass)) {
                    add(connection.calledClass, connection);
                }
            }
        }

        return byClass;
    }

    private resolveConnection(entry: AssetEntry, raw: RawEventConnection): UnityEventConnection {
        const calledClass = raw.calledClassName ?? this.classNameByGuid.get(raw.calledClassGuid ?? "") ?? "";

        return {
            assetPath: entry.path,
            assetName: assetBaseName(entry.path),
            gameObject: entry.gameObjectNames.get(raw.gameObjectId) ?? "Unknown Game Object",
            callingClass: this.classNameByGuid.get(raw.callingClassGuid) ?? "",
            calledClass,
            calledMethod: raw.calledMethod,
            event: raw.event,
            kind: entry.kind,
        };
    }

    // --- lifecycle ----------------------------------------------------------

    /** Drops everything; used at the start of a full scan and on dispose. */
    public clear(): void {
        this.guidByScriptPath.clear();
        this.scriptPathsByGuid.clear();
        this.classNameByGuid.clear();
        this.assets.clear();
        this.guidReferences.clear();
        this.buildSettingsScenes.clear();
        this.connectionsByClass = undefined;
    }
}
