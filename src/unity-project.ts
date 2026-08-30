// Unity 프로젝트 구조(Assets 루트, 에디터 버전)를 다루는 순수 헬퍼.
// vscode 모듈에 의존하지 않으므로 단위 테스트가 가능하다.
import * as fs from "fs/promises";
import * as path from "path";

const ASSETS_DIR = "Assets";
const PROJECT_VERSION_PATH = ["ProjectSettings", "ProjectVersion.txt"];

// ProjectVersion.txt를 읽지 못했을 때 사용할 Unity 6 문서 버전
export const DEFAULT_DOCS_VERSION = "6000.0";

function isInside(parentDir: string, targetPath: string): boolean {
    const relative = path.relative(parentDir, targetPath);
    return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * 파일 경로에서 실제 Assets 루트를 찾는다.
 * 상위 디렉터리 이름에 "Assets"가 포함된 경우(C:\MyAssets\Proj\Assets\Player.cs)에도
 * 정확히 "Assets"인 경로 세그먼트만 인정한다.
 * workspaceRoot가 주어지고 파일이 그 안에 있으면 workspace 기준 Assets 경로를 우선한다.
 */
export function findAssetsRoot(filePath: string, workspaceRoot?: string): string | undefined {
    if (workspaceRoot) {
        const candidate = path.join(workspaceRoot, ASSETS_DIR);
        if (isInside(candidate, filePath)) {
            return candidate;
        }
    }

    let current = filePath;
    let parent = path.dirname(current);
    while (parent !== current) {
        if (path.basename(parent) === ASSETS_DIR) {
            return parent;
        }
        current = parent;
        parent = path.dirname(current);
    }

    return undefined;
}

/**
 * ProjectVersion.txt 내용에서 문서 버전(앞 두 자리)을 추출한다.
 * 예) "m_EditorVersion: 6000.0.23f1" -> "6000.0"
 * 파싱할 수 없으면 DEFAULT_DOCS_VERSION을 반환한다.
 */
export function parseDocsVersion(content: string | undefined): string {
    if (!content) {
        return DEFAULT_DOCS_VERSION;
    }

    const match = /m_EditorVersion:\s*(\d+)\.(\d+)/.exec(content);
    if (!match) {
        return DEFAULT_DOCS_VERSION;
    }

    return `${match[1]}.${match[2]}`;
}

/**
 * 워크스페이스 루트의 ProjectSettings/ProjectVersion.txt를 비동기로 읽어 문서 버전을 반환한다.
 * 파일이 없거나 읽을 수 없으면 DEFAULT_DOCS_VERSION을 반환한다.
 */
export async function readDocsVersion(workspaceRoot: string | undefined): Promise<string> {
    if (!workspaceRoot) {
        return DEFAULT_DOCS_VERSION;
    }

    try {
        const versionFile = path.join(workspaceRoot, ...PROJECT_VERSION_PATH);
        const content = await fs.readFile(versionFile, "utf-8");
        return parseDocsVersion(content);
    } catch {
        return DEFAULT_DOCS_VERSION;
    }
}
