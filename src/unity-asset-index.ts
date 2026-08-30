// Single index over a Unity project's Assets tree.
// It replaces the two overlapping scanners the extension used to run (the asset
// parser and the vendored scene reader) with one pass that builds:
//   - script GUID maps (.cs.meta)
//   - a reverse GUID index (which scene/prefab references which GUID)
//   - UnityEvent persistent-call connections from scenes AND prefabs
// The file text itself is never retained.
import {
    ConfigurationChangeEvent,
    Disposable,
    Event,
    EventEmitter,
    FileSystemWatcher,
    RelativePattern,
    Uri,
    workspace,
} from "vscode";
import * as fsp from "fs/promises";
import * as path from "path";

import { GuidReferenceIndex } from "./guid-reference-index";
import { logger } from "./logger";
import { assetBaseName, simpleClassName } from "./unity-naming";
import {
    collectGuidReferences,
    parseBuildSettingsScenePaths,
    parseMetaGuid,
    parseUnityAsset,
    RawEventConnection,
} from "./unity-yaml";

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

export type AssetKind = "scene" | "prefab";

interface AssetEntry {
    path: string;
    kind: AssetKind;
    connections: RawEventConnection[];
    gameObjectNames: Map<string, string>;
}

const SCRIPT_META_SUFFIX = ".cs.meta";
const ASSETS_DIR = "Assets";
const BUILD_SETTINGS_RELATIVE = "ProjectSettings/EditorBuildSettings.asset";
const ASSET_GLOB = `${ASSETS_DIR}/**/*.{meta,unity,prefab}`;
const DEBOUNCE_MS = 150;
const READ_CONCURRENCY = 32;

function normalizeKey(filePath: string): string {
    const normalized = path.normalize(filePath);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function assetKind(filePath: string): AssetKind | undefined {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".unity") {
        return "scene";
    }
    if (ext === ".prefab") {
        return "prefab";
    }
    return undefined;
}

function isScriptMeta(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(SCRIPT_META_SUFFIX);
}

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
    let cursor = 0;
    const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (cursor < items.length) {
            const item = items[cursor++];
            await worker(item);
        }
    });
    await Promise.all(runners);
}

export class UnityAssetIndex implements Disposable {
    /** GUID of a script file, keyed by the normalized .cs path. */
    private guidByScriptPath = new Map<string, string>();
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

    private watchers: FileSystemWatcher[] = [];
    private configListener?: Disposable;
    private pendingUpdates = new Map<string, "update" | "remove">();
    private debounceTimer?: NodeJS.Timeout;
    private disposed = false;
    private indexVersion = 0;
    /** Identifies the current full scan so that a superseded one stops writing. */
    private scanToken = 0;

    private changeEmitter = new EventEmitter<void>();
    /** Fires when the initial scan finishes and after every incremental update. */
    public readonly onDidChangeIndex: Event<void> = this.changeEmitter.event;

    constructor() {
        this.registerWatchers();
        this.configListener = workspace.onDidChangeConfiguration((event) => this.onConfigurationChanged(event));
        void this.scanWorkspace();
    }

    /** Increases whenever the index content changed; used as a cache key. */
    public get version(): number {
        return this.indexVersion;
    }

    /** GUID of a script file. Returns undefined until the file has been indexed. */
    public getGuid(filePath: string): string | undefined {
        return this.guidByScriptPath.get(normalizeKey(filePath));
    }

    /** Scenes referencing the given GUID. Answered from the reverse index. */
    public getSceneReferences(guid: string): string[] {
        return this.getReferences(guid, "scene");
    }

    /** Prefabs referencing the given GUID. Answered from the reverse index. */
    public getPrefabReferences(guid: string): string[] {
        return this.getReferences(guid, "prefab");
    }

    /** UnityEvent connections that involve the given class, by its simple name. */
    public getConnectionsForClass(className: string): UnityEventConnection[] {
        if (!this.connectionsByClass) {
            this.connectionsByClass = this.buildConnectionsByClass();
        }
        return this.connectionsByClass.get(className) ?? [];
    }

    public dispose(): void {
        this.disposed = true;

        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];

        this.configListener?.dispose();
        this.configListener = undefined;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }

        this.pendingUpdates.clear();
        this.guidByScriptPath.clear();
        this.classNameByGuid.clear();
        this.assets.clear();
        this.guidReferences.clear();
        this.buildSettingsScenes.clear();
        this.connectionsByClass = undefined;
        this.changeEmitter.dispose();
    }

    // --- watching -----------------------------------------------------------

    // The watchers are scoped to the asset types the index cares about; watching
    // "**/*" would fire constantly because Unity rewrites Library/ and Temp/.
    private registerWatchers(): void {
        for (const folder of workspace.workspaceFolders ?? []) {
            const assetWatcher = workspace.createFileSystemWatcher(new RelativePattern(folder, ASSET_GLOB));
            assetWatcher.onDidCreate((uri) => this.queueUpdate(uri, "update"));
            assetWatcher.onDidChange((uri) => this.queueUpdate(uri, "update"));
            assetWatcher.onDidDelete((uri) => this.queueUpdate(uri, "remove"));
            this.watchers.push(assetWatcher);

            const buildSettingsWatcher = workspace.createFileSystemWatcher(
                new RelativePattern(folder, BUILD_SETTINGS_RELATIVE)
            );
            const onBuildSettingsChanged = () => {
                if (this.onlyScenesInBuildSettings()) {
                    void this.scanWorkspace();
                }
            };
            buildSettingsWatcher.onDidCreate(onBuildSettingsChanged);
            buildSettingsWatcher.onDidChange(onBuildSettingsChanged);
            buildSettingsWatcher.onDidDelete(onBuildSettingsChanged);
            this.watchers.push(buildSettingsWatcher);
        }
    }

    private onConfigurationChanged(event: ConfigurationChangeEvent): void {
        if (event.affectsConfiguration("unitySWpack.onlyScenesInBuildSettings")) {
            void this.scanWorkspace();
        }
    }

    private onlyScenesInBuildSettings(): boolean {
        return workspace.getConfiguration("unitySWpack").get<boolean>("onlyScenesInBuildSettings") === true;
    }

    private queueUpdate(uri: Uri, kind: "update" | "remove"): void {
        if (this.disposed) {
            return;
        }

        const filePath = uri.fsPath;
        if (!assetKind(filePath) && !isScriptMeta(filePath)) {
            return;
        }

        this.pendingUpdates.set(filePath, kind);
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => void this.flushUpdates(), DEBOUNCE_MS);
    }

    private async flushUpdates(): Promise<void> {
        this.debounceTimer = undefined;
        if (this.disposed) {
            return;
        }

        const updates = [...this.pendingUpdates.entries()];
        this.pendingUpdates.clear();

        for (const [filePath, kind] of updates) {
            if (this.disposed) {
                return;
            }

            if (kind === "remove") {
                this.removePath(filePath);
            } else {
                await this.indexPath(filePath);
            }
        }

        this.notifyChanged();
    }

    // --- scanning -----------------------------------------------------------

    private async scanWorkspace(): Promise<void> {
        const folders = workspace.workspaceFolders ?? [];
        const startTime = Date.now();
        const token = ++this.scanToken;
        const isStale = () => this.disposed || this.scanToken !== token;

        // Start from scratch so that a configuration change cannot leave stale data.
        this.assets.clear();
        this.guidReferences.clear();
        this.buildSettingsScenes.clear();

        for (const folder of folders) {
            if (isStale()) {
                return;
            }

            const root = folder.uri.fsPath;
            const assetsDir = path.join(root, ASSETS_DIR);
            if (!(await isDirectory(assetsDir))) {
                continue;
            }

            if (this.onlyScenesInBuildSettings()) {
                await this.readBuildSettings(root);
            }

            const files = await collectFiles(assetsDir);
            if (isStale()) {
                return;
            }

            const metaFiles = files.filter(isScriptMeta);
            const assetFiles = files.filter((file) => assetKind(file) !== undefined);

            // Scripts first: scenes and prefabs resolve their targets through the GUID map.
            await mapWithConcurrency(metaFiles, READ_CONCURRENCY, (file) => this.indexScriptMeta(file));
            await mapWithConcurrency(assetFiles, READ_CONCURRENCY, (file) => this.indexAsset(file));
        }

        if (isStale()) {
            return;
        }

        logger.debug("Indexed %d assets in %d milliseconds", this.assets.size, Date.now() - startTime);
        this.notifyChanged();
    }

    private async readBuildSettings(root: string): Promise<void> {
        const settingsPath = path.join(root, ...BUILD_SETTINGS_RELATIVE.split("/"));
        const text = await readTextFile(settingsPath);
        if (text === undefined || this.disposed) {
            return;
        }

        const scenes = parseBuildSettingsScenePaths(text, (message, ...args) => logger.warn(message, ...args));
        this.buildSettingsScenes.set(normalizeKey(root), scenes);
        logger.debug("EditorBuildSettings.asset lists %d scenes for %s", scenes.length, root);
    }

    private async indexPath(filePath: string): Promise<void> {
        if (isScriptMeta(filePath)) {
            await this.indexScriptMeta(filePath);
        } else if (assetKind(filePath)) {
            await this.indexAsset(filePath);
        }
    }

    private async indexScriptMeta(metaPath: string): Promise<void> {
        const text = await readTextFile(metaPath);
        if (text === undefined) {
            // The file disappeared between the event and the read.
            this.removePath(metaPath);
            return;
        }
        if (this.disposed) {
            return;
        }

        const guid = parseMetaGuid(text);
        if (!guid) {
            logger.warn("No GUID found in %s", metaPath);
            return;
        }

        const scriptPath = metaPath.slice(0, -".meta".length);
        this.guidByScriptPath.set(normalizeKey(scriptPath), guid);
        this.classNameByGuid.set(guid, assetBaseName(scriptPath));
        this.connectionsByClass = undefined;
    }

    private async indexAsset(assetPath: string): Promise<void> {
        const kind = assetKind(assetPath);
        if (!kind) {
            return;
        }

        const text = await readTextFile(assetPath);
        if (text === undefined) {
            this.removePath(assetPath);
            return;
        }
        if (this.disposed) {
            return;
        }

        const startTime = Date.now();
        let entry: AssetEntry;
        let guids: Set<string>;

        if (kind === "scene" && !this.shouldIndexConnections(assetPath)) {
            // The scene is not in the build settings: keep it in the reverse index
            // for reference counts, but skip the (much costlier) YAML parse.
            entry = { path: assetPath, kind, connections: [], gameObjectNames: new Map() };
            guids = collectGuidReferences(text);
        } else {
            const data = parseUnityAsset(text, (message, ...args) =>
                logger.warn(`${message} (in ${assetPath})`, ...args)
            );
            entry = {
                path: assetPath,
                kind,
                connections: data.connections,
                gameObjectNames: data.gameObjectNames,
            };
            guids = data.referencedGuids;
        }

        // Replacing the whole entry evicts GameObject ids and connections that
        // no longer exist in the re-parsed file.
        this.setAssetEntry(normalizeKey(assetPath), entry, guids);

        logger.debug(
            "Parsed %s in %d milliseconds and found %d event bindings",
            assetPath,
            Date.now() - startTime,
            entry.connections.length
        );
    }

    private shouldIndexConnections(scenePath: string): boolean {
        if (!this.onlyScenesInBuildSettings()) {
            return true;
        }

        const folder = workspace.getWorkspaceFolder(Uri.file(scenePath));
        const scenes = folder ? this.buildSettingsScenes.get(normalizeKey(folder.uri.fsPath)) : undefined;
        if (!scenes || scenes.length === 0) {
            return true;
        }

        const normalized = scenePath.replace(/\\/g, "/");
        return scenes.some((listed) => normalized.endsWith(listed));
    }

    private setAssetEntry(key: string, entry: AssetEntry, guids: Set<string>): void {
        this.assets.set(key, entry);
        this.guidReferences.set(key, guids);
        this.connectionsByClass = undefined;
    }

    private clearAssetEntry(key: string): void {
        if (!this.assets.delete(key)) {
            return;
        }

        this.guidReferences.remove(key);
        this.connectionsByClass = undefined;
    }

    private removePath(filePath: string): void {
        const key = normalizeKey(filePath);

        if (isScriptMeta(filePath)) {
            const scriptKey = normalizeKey(filePath.slice(0, -".meta".length));
            const guid = this.guidByScriptPath.get(scriptKey);
            if (guid) {
                this.guidByScriptPath.delete(scriptKey);
                this.classNameByGuid.delete(guid);
                this.connectionsByClass = undefined;
            }
            return;
        }

        this.clearAssetEntry(key);
    }

    // --- queries ------------------------------------------------------------

    private getReferences(guid: string, kind: AssetKind): string[] {
        const result: string[] = [];

        for (const key of this.guidReferences.getAssets(guid)) {
            const entry = this.assets.get(key);
            if (entry && entry.kind === kind) {
                result.push(entry.path);
            }
        }

        return result.sort();
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

    private notifyChanged(): void {
        if (this.disposed) {
            return;
        }
        this.indexVersion++;
        this.connectionsByClass = undefined;
        this.changeEmitter.fire();
    }
}

async function isDirectory(dirPath: string): Promise<boolean> {
    try {
        const stats = await fsp.stat(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

async function readTextFile(filePath: string): Promise<string | undefined> {
    try {
        return await fsp.readFile(filePath, "utf-8");
    } catch {
        return undefined;
    }
}

/** Recursively collects .cs.meta, .unity and .prefab files below the given directory. */
async function collectFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    let entries;
    try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        // Unity ignores hidden folders and folders ending with "~".
        if (entry.name.startsWith(".") || entry.name.endsWith("~")) {
            continue;
        }

        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...(await collectFiles(full)));
        } else if (isScriptMeta(full) || assetKind(full)) {
            results.push(full);
        }
    }

    return results;
}
