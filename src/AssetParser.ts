import { workspace, FileSystemWatcher } from "vscode";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";

type AssetSets = {
    scripts: Set<string>; // stores .cs.meta full paths
    scenes: Set<string>;  // stores .unity full paths
    prefabs: Set<string>; // stores .prefab full paths
};

export default class AssetParser {
    public scripts = new Set<string>();
    public scenes = new Set<string>();
    public prefabs = new Set<string>();

    // 파일 내용 캐시 (.prefab, .unity, 기타 필요시)
    private fileContentCache = new Map<string, string>();

    // metaGuidMap: key = original file path (without .meta), value = guid
    private metaGuidMap = new Map<string, string>();

    private workspaceAssetsPath?: string;
    private guidExp = /^guid:\s*(.+)$/m;

    private watcher?: FileSystemWatcher;
    private pendingUpdates = new Set<string>();
    private debounceTimer?: NodeJS.Timeout;
    private DEBOUNCE_MS = 150;

    constructor() {
        const folders = workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return;
        }

        this.workspaceAssetsPath = path.join(folders[0].uri.fsPath, "Assets");

        // 시작 비동기 초기화 (확장 초기화 중 블로킹하지 않음)
        void this.init();

        // watcher 등록 (반복 이벤트를 디바운스 처리)
        this.watcher = workspace.createFileSystemWatcher("**/*");
        this.watcher.onDidCreate(uri => this.queueUpdate(uri.fsPath, "create"));
        this.watcher.onDidDelete(uri => this.queueUpdate(uri.fsPath, "delete"));
        this.watcher.onDidChange(uri => this.queueUpdate(uri.fsPath, "change"));
    }

    // 비동기 초기 스캔
    private async init(): Promise<void> {
        if (!this.workspaceAssetsPath) return;

        try {
            const files = await this.getFilesInDir(this.workspaceAssetsPath);

            for (const file of files) {
                this.updateSetsForPath(file, "add", false);
            }

            // 메타 파일과 주요 자산 파일의 내용도 캐시
            await Promise.all(
                [...this.scripts.values()].map(async metaPath => {
                    await this.loadMetaGuid(metaPath);
                })
            );

            await Promise.all(
                [...this.scenes.values(), ...this.prefabs.values()].map(async assetPath => {
                    await this.cacheFileContent(assetPath);
                })
            );
        } catch (err) {
            // console.error('AssetParser init error:', err);
        }
    }

    // 재사용 가능한 디렉토리 재귀 탐색 (비동기)
    private async getFilesInDir(dir: string): Promise<string[]> {
        const results: string[] = [];
        let entries: fs.Dirent[];
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true });
        } catch (err) {
            return results;
        }

        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...(await this.getFilesInDir(full)));
            } else {
                results.push(full);
            }
        }
        return results;
    }

    // 파일 경로별로 add/delete 처리 (공통화)
    private updateSetsForPath(file: string, action: "add" | "remove", invalidateCache = true) {
        const normalized = path.normalize(file);

        const ext = path.extname(normalized).toLowerCase();
        switch (ext) {
            case ".meta":
                if (normalized.endsWith(".cs.meta")) {
                    if (action === "add") this.scripts.add(normalized);
                    else this.scripts.delete(normalized);

                    if (invalidateCache) {
                        if (action === "remove") {
                            // remove guid mapping for corresponding original file
                            const original = normalized.slice(0, -5); // remove '.meta'
                            this.metaGuidMap.delete(original);
                        } else {
                            // load/refresh guid
                            void this.loadMetaGuid(normalized);
                        }
                    }
                }
                break;
            case ".prefab":
                if (action === "add") this.prefabs.add(normalized);
                else this.prefabs.delete(normalized);

                if (invalidateCache && action === "add") void this.cacheFileContent(normalized);
                if (invalidateCache && action === "remove") this.fileContentCache.delete(normalized);
                break;
            case ".unity":
                if (action === "add") this.scenes.add(normalized);
                else this.scenes.delete(normalized);

                if (invalidateCache && action === "add") void this.cacheFileContent(normalized);
                if (invalidateCache && action === "remove") this.fileContentCache.delete(normalized);
                break;
            default:
                // 다른 확장자 무시
                break;
        }
    }

    // 디바운스된 업데이트 큐
    private queueUpdate(fsPath: string, _kind: "create" | "delete" | "change") {
        this.pendingUpdates.add(fsPath);
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.flushUpdates(), this.DEBOUNCE_MS);
    }

    // 실제 업데이트 처리
    private flushUpdates() {
        const updates = Array.from(this.pendingUpdates);
        this.pendingUpdates.clear();

        for (const p of updates) {
            // 파일이 존재하는지 확인
            const exists = fs.existsSync(p);
            if (exists) {
                this.updateSetsForPath(p, "add", true);
            } else {
                this.updateSetsForPath(p, "remove", true);
            }
        }
    }

    // .meta 파일에서 guid를 파싱해 metaGuidMap에 저장
    private async loadMetaGuid(metaPath: string): Promise<void> {
        try {
            const content = await fsp.readFile(metaPath, "utf-8");
            const m = content.match(this.guidExp);
            if (m && m[1]) {
                // original path (without .meta)
                const originalPath = metaPath.slice(0, -5);
                this.metaGuidMap.set(path.normalize(originalPath), m[1]);
            }
        } catch {
            // 읽기 실패 시 무시
        }
    }

    // 파일 내용을 읽어 캐시에 저장 (.prefab, .unity 등)
    private async cacheFileContent(filePath: string): Promise<void> {
        try {
            const content = await fsp.readFile(filePath, "utf-8");
            this.fileContentCache.set(path.normalize(filePath), content);
        } catch {
            // 읽기 실패 시 캐시 유지하지 않음
        }
    }

    // public API: GUID 조회 (동기) — 초기화 전에는 undefined 반환 가능
    public getGuid(filePath: string): string | undefined {
        const normalized = path.normalize(filePath);
        return this.metaGuidMap.get(normalized);
    }

    // public API: 특정 파일 집합(files: Set<string>)에서 guid 참조를 찾음 (동기; 캐시 기반)
    // 반환값: file path 배열 (캐시된 내용만 사용; 캐시에 없으면 동기적으로 읽지 않음)
    public findReferences(guid: string, files: Set<string>): string[] {
        const result: string[] = [];

        for (const file of files.values()) {
            const normalized = path.normalize(file);
            // 우선 캐시 확인
            const content = this.fileContentCache.get(normalized);
            if (content !== undefined) {
                if (content.includes(guid)) result.push(normalized);
                continue;
            }

            // 캐시가 없으면, 시도적으로 동기 읽기(안정성 위해 비동기 대신 최소한 수행)
            try {
                const diskContent = fs.readFileSync(normalized, "utf-8");
                // 캐시에 추가하여 다음 호출은 빠르게 처리
                this.fileContentCache.set(normalized, diskContent);
                if (diskContent.includes(guid)) result.push(normalized);
            } catch {
                // 읽기 실패하면 무시
            }
        }

        return result;
    }

    // 확장 종료 시 watcher 정리
    public dispose() {
        if (this.watcher) {
            this.watcher.dispose();
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}