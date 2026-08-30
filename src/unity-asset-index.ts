// Single index over a Unity project's Assets tree.
// It replaces the two overlapping scanners the extension used to run (the asset
// parser and the vendored scene reader) with one pass that builds:
//   - script GUID maps (.cs.meta)
//   - a reverse GUID index (which scene/prefab references which GUID)
//   - UnityEvent persistent-call connections from scenes AND prefabs
// The file text itself is never retained.
//
// This module owns everything that needs "vscode": watchers, configuration,
// scheduling and disk access. The state it maintains lives in
// UnityAssetIndexState so that the mutation rules stay unit testable.
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

import { logger } from "./logger";
import {
    AssetContent,
    DuplicateScriptGuid,
    MissingScriptReference,
    assetKindOf,
    assetPathOfMeta,
    hasIgnoredSegment,
    isScriptMeta,
    UnityAssetIndexState,
    UnityEventConnection,
} from "./unity-asset-index-state";
import {
    collectGuidReferences,
    collectScriptReferences,
    parseBuildSettingsScenePaths,
    parseMetaGuid,
    parseUnityAsset,
} from "./unity-yaml";

export {
    AssetKind,
    DuplicateScriptGuid,
    MissingScriptReference,
    UnityEventConnection,
} from "./unity-asset-index-state";

const ASSETS_DIR = "Assets";
const BUILD_SETTINGS_RELATIVE = "ProjectSettings/EditorBuildSettings.asset";
const ASSET_GLOB = `${ASSETS_DIR}/**/*.{meta,unity,prefab}`;
const DEBOUNCE_MS = 150;
const READ_CONCURRENCY = 32;

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
    private state = new UnityAssetIndexState();

    private watchers: FileSystemWatcher[] = [];
    private configListener?: Disposable;
    private pendingUpdates = new Map<string, "update" | "remove">();
    private debounceTimer?: NodeJS.Timeout;
    private buildSettingsTimer?: NodeJS.Timeout;
    private disposed = false;
    private indexVersion = 0;

    /**
     * Bumped whenever a full scan starts. Any write that was scheduled under an
     * older generation is dropped, so a superseded scan — or an incremental
     * update overtaken by a rescan — can never resurrect stale data.
     */
    private generation = 0;

    /** Serializes scans and flushes so two of them never interleave their writes. */
    private queue: Promise<void> = Promise.resolve();

    private changeEmitter = new EventEmitter<void>();
    /** Fires when the initial scan finishes and after every incremental update. */
    public readonly onDidChangeIndex: Event<void> = this.changeEmitter.event;

    constructor() {
        this.registerWatchers();
        this.configListener = workspace.onDidChangeConfiguration((event) => this.onConfigurationChanged(event));
        this.enqueue(() => this.scanWorkspace());
    }

    /** Increases whenever the index content changed; used as a cache key. */
    public get version(): number {
        return this.indexVersion;
    }

    /** GUID of a script file. Returns undefined until the file has been indexed. */
    public getGuid(filePath: string): string | undefined {
        return this.state.getGuid(filePath);
    }

    /** Scenes referencing the given GUID. Answered from the reverse index. */
    public getSceneReferences(guid: string): string[] {
        return this.state.getReferences(guid, "scene");
    }

    /** Prefabs referencing the given GUID. Answered from the reverse index. */
    public getPrefabReferences(guid: string): string[] {
        return this.state.getReferences(guid, "prefab");
    }

    /** UnityEvent connections that involve the given class, by its simple name. */
    public getConnectionsForClass(className: string): UnityEventConnection[] {
        return this.state.getConnectionsForClass(className);
    }

    /** Scenes and prefabs attaching a script that is no longer in the project. */
    public getMissingScriptReferences(): MissingScriptReference[] {
        return this.state.getMissingScriptReferences();
    }

    /** GUIDs claimed by more than one script. */
    public getDuplicateScriptGuids(): DuplicateScriptGuid[] {
        return this.state.getDuplicateScriptGuids();
    }

    public dispose(): void {
        this.disposed = true;
        this.generation++;

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
        if (this.buildSettingsTimer) {
            clearTimeout(this.buildSettingsTimer);
            this.buildSettingsTimer = undefined;
        }

        this.pendingUpdates.clear();
        this.state.clear();
        this.changeEmitter.dispose();
    }

    // --- scheduling ---------------------------------------------------------

    /** Runs work after whatever is already queued, so writes never interleave. */
    private enqueue(work: () => Promise<void>): void {
        this.queue = this.queue.then(async () => {
            if (this.disposed) {
                return;
            }
            try {
                await work();
            } catch (error) {
                logger.warn("Indexing failed: %s", error);
            }
        });
    }

    /** True once the work started under this generation has been superseded. */
    private isStale(generation: number): boolean {
        return this.disposed || this.generation !== generation;
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
            const onBuildSettingsChanged = () => this.scheduleRescan();
            buildSettingsWatcher.onDidCreate(onBuildSettingsChanged);
            buildSettingsWatcher.onDidChange(onBuildSettingsChanged);
            buildSettingsWatcher.onDidDelete(onBuildSettingsChanged);
            this.watchers.push(buildSettingsWatcher);
        }
    }

    // Unity usually rewrites EditorBuildSettings.asset in more than one step, so
    // coalesce the events instead of starting a full scan per event.
    private scheduleRescan(): void {
        if (this.disposed || !this.onlyScenesInBuildSettings()) {
            return;
        }

        if (this.buildSettingsTimer) {
            clearTimeout(this.buildSettingsTimer);
        }
        this.buildSettingsTimer = setTimeout(() => {
            this.buildSettingsTimer = undefined;
            this.enqueue(() => this.scanWorkspace());
        }, DEBOUNCE_MS);
    }

    private onConfigurationChanged(event: ConfigurationChangeEvent): void {
        if (event.affectsConfiguration("unitySWpack.onlyScenesInBuildSettings")) {
            this.enqueue(() => this.scanWorkspace());
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
        if (!assetKindOf(filePath) && !isScriptMeta(filePath)) {
            return;
        }

        // The watcher glob does not exclude Unity's hidden and "~" folders, but the
        // initial scan does; keep both sides indexing exactly the same files.
        const folder = workspace.getWorkspaceFolder(uri);
        if (folder && hasIgnoredSegment(path.relative(folder.uri.fsPath, filePath))) {
            return;
        }

        this.pendingUpdates.set(filePath, kind);
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = undefined;
            this.enqueue(() => this.flushUpdates());
        }, DEBOUNCE_MS);
    }

    private async flushUpdates(): Promise<void> {
        const generation = this.generation;

        const updates = [...this.pendingUpdates.entries()];
        this.pendingUpdates.clear();
        if (updates.length === 0) {
            return;
        }

        // Removals first: a rename delivers a delete of the old .meta and a create
        // of the new one with the same GUID, and the create must win.
        const ordered = [
            ...updates.filter(([, kind]) => kind === "remove"),
            ...updates.filter(([, kind]) => kind !== "remove"),
        ];

        for (const [filePath, kind] of ordered) {
            if (this.isStale(generation)) {
                return;
            }

            if (kind === "remove") {
                this.removePath(filePath);
            } else {
                await this.indexPath(filePath, generation);
            }
        }

        this.notifyChanged();
    }

    // --- scanning -----------------------------------------------------------

    private async scanWorkspace(): Promise<void> {
        const startTime = Date.now();
        const generation = ++this.generation;
        const onlyBuildSettingsScenes = this.onlyScenesInBuildSettings();

        // Start from scratch so that a configuration change cannot leave stale data.
        this.state.clear();

        for (const folder of workspace.workspaceFolders ?? []) {
            if (this.isStale(generation)) {
                return;
            }

            const root = folder.uri.fsPath;
            const assetsDir = path.join(root, ASSETS_DIR);
            if (!(await isDirectory(assetsDir))) {
                continue;
            }

            if (onlyBuildSettingsScenes) {
                await this.readBuildSettings(root, generation);
            }

            const files = await collectFiles(assetsDir);
            if (this.isStale(generation)) {
                return;
            }

            const metaFiles = files.filter(isScriptMeta);
            const assetFiles = files.filter((file) => assetKindOf(file) !== undefined);

            // Scripts first: scenes and prefabs resolve their targets through the GUID map.
            await mapWithConcurrency(metaFiles, READ_CONCURRENCY, (file) => this.indexScriptMeta(file, generation));
            await mapWithConcurrency(assetFiles, READ_CONCURRENCY, (file) => this.indexAsset(file, generation));
        }

        if (this.isStale(generation)) {
            return;
        }

        logger.debug("Indexed %d assets in %d milliseconds", this.state.assetCount, Date.now() - startTime);
        this.notifyChanged();
    }

    private async readBuildSettings(root: string, generation: number): Promise<void> {
        const settingsPath = path.join(root, ...BUILD_SETTINGS_RELATIVE.split("/"));
        const text = await readTextFile(settingsPath);
        if (text === undefined || this.isStale(generation)) {
            return;
        }

        const scenes = parseBuildSettingsScenePaths(text, (message, ...args) => logger.warn(message, ...args));
        this.state.setBuildSettingsScenes(root, scenes);
        logger.debug("EditorBuildSettings.asset lists %d scenes for %s", scenes.length, root);
    }

    private async indexPath(filePath: string, generation: number): Promise<void> {
        if (isScriptMeta(filePath)) {
            await this.indexScriptMeta(filePath, generation);
        } else if (assetKindOf(filePath)) {
            await this.indexAsset(filePath, generation);
        }
    }

    private async indexScriptMeta(metaPath: string, generation: number): Promise<void> {
        const text = await readTextFile(metaPath);

        // Re-check after every await: the read may have outlived its scan.
        if (this.isStale(generation)) {
            return;
        }

        if (text === undefined) {
            // The file disappeared between the event and the read.
            this.removePath(metaPath);
            return;
        }

        const guid = parseMetaGuid(text);
        if (!guid) {
            logger.warn("No GUID found in %s", metaPath);
            return;
        }

        this.state.setScript(assetPathOfMeta(metaPath), guid);
    }

    private async indexAsset(assetPath: string, generation: number): Promise<void> {
        const kind = assetKindOf(assetPath);
        if (!kind) {
            return;
        }

        const text = await readTextFile(assetPath);
        if (this.isStale(generation)) {
            return;
        }

        if (text === undefined) {
            this.removePath(assetPath);
            return;
        }

        const startTime = Date.now();
        const folder = workspace.getWorkspaceFolder(Uri.file(assetPath));
        const indexConnections = this.state.shouldIndexConnections(
            assetPath,
            kind,
            folder?.uri.fsPath,
            this.onlyScenesInBuildSettings()
        );

        let content: AssetContent;
        if (indexConnections) {
            const data = parseUnityAsset(text, (message, ...args) =>
                logger.warn(`${message} (in ${assetPath})`, ...args)
            );
            content = {
                connections: data.connections,
                gameObjectNames: data.gameObjectNames,
                guids: data.referencedGuids,
                scriptGuids: data.scriptGuids,
            };
        } else {
            // The scene is not in the build settings: keep it in the reverse index
            // for reference counts, but skip the (much costlier) YAML parse.
            content = {
                connections: [],
                gameObjectNames: new Map(),
                guids: collectGuidReferences(text),
                scriptGuids: collectScriptReferences(text),
            };
        }

        // Replacing the whole entry evicts GameObject ids and connections that
        // no longer exist in the re-parsed file.
        this.state.setAsset(assetPath, kind, content);

        logger.debug(
            "Parsed %s in %d milliseconds and found %d event bindings",
            assetPath,
            Date.now() - startTime,
            content.connections.length
        );
    }

    private removePath(filePath: string): void {
        if (isScriptMeta(filePath)) {
            this.state.removeScript(assetPathOfMeta(filePath));
        } else {
            this.state.removeAsset(filePath);
        }
    }

    private notifyChanged(): void {
        if (this.disposed) {
            return;
        }
        this.indexVersion++;
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
        } else if (isScriptMeta(full) || assetKindOf(full)) {
            results.push(full);
        }
    }

    return results;
}
