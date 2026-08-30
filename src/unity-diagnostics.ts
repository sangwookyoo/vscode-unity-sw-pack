// Problems Unity itself will not tell you about until something silently fails
// in the editor:
//
//   - a MonoBehaviour whose file name does not match its class name, so Unity
//     cannot attach the component at all;
//   - a scene or prefab attaching a script GUID that no longer exists, which
//     the editor shows as "Missing (Mono Script)" while dropping the data;
//   - two scripts claiming the same GUID, usually a copied .meta file, which
//     makes every reference to it resolve to whichever Unity saw last.
import {
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    Disposable,
    Range,
    TextDocument,
    Uri,
    l10n,
    languages,
    workspace,
} from "vscode";
import * as path from "path";

import { findUnityScriptTypes } from "./csharp-syntax";
import { PerformanceFinding, findPerformanceIssues } from "./unity-performance";
import { SNIPPET_PREFIXES } from "./snippet-catalog";
import { UnityAssetIndex } from "./unity-asset-index";

const SOURCE = "Unity SW Pack";
const DEBOUNCE_MS = 400;

export class UnityDiagnostics implements Disposable {
    private readonly collection: DiagnosticCollection;
    private readonly listeners: Disposable[] = [];

    /** Findings that come from reading one C# file. */
    private readonly perDocument = new Map<string, Diagnostic[]>();
    /** Findings that come from the project index, for any file. */
    private perProject = new Map<string, Diagnostic[]>();

    private debounceTimer?: NodeJS.Timeout;
    private disposed = false;

    constructor(private readonly index: UnityAssetIndex) {
        this.collection = languages.createDiagnosticCollection("unitySWpack");

        this.listeners.push(
            this.index.onDidChangeIndex(() => this.refreshProject()),
            workspace.onDidOpenTextDocument((doc) => this.refreshDocument(doc)),
            workspace.onDidChangeTextDocument((event) => this.scheduleDocumentRefresh(event.document)),
            workspace.onDidCloseTextDocument((doc) => {
                if (this.perDocument.delete(doc.uri.toString())) {
                    this.publish(doc.uri);
                }
            })
        );

        for (const doc of workspace.textDocuments) {
            this.refreshDocument(doc);
        }
        this.refreshProject();
    }

    public dispose(): void {
        this.disposed = true;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }

        for (const listener of this.listeners) {
            listener.dispose();
        }
        this.listeners.length = 0;

        this.perDocument.clear();
        this.perProject.clear();
        this.collection.dispose();
    }

    // --- publishing ---------------------------------------------------------

    // Both sources can produce findings for the same C# file, so the collection
    // is always written with the union rather than by whichever ran last.
    private publish(uri: Uri): void {
        const key = uri.toString();
        const merged = [...(this.perDocument.get(key) ?? []), ...(this.perProject.get(key) ?? [])];

        if (merged.length > 0) {
            this.collection.set(uri, merged);
        } else {
            this.collection.delete(uri);
        }
    }

    // --- per document -------------------------------------------------------

    private scheduleDocumentRefresh(doc: TextDocument): void {
        if (this.disposed || doc.languageId !== "csharp") {
            return;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = undefined;
            this.refreshDocument(doc);
        }, DEBOUNCE_MS);
    }

    /**
     * Unity resolves a MonoBehaviour by file name, so a class whose name differs
     * from its file cannot be attached in the editor. The failure is silent,
     * which is what makes it worth reporting.
     */
    private refreshDocument(doc: TextDocument): void {
        if (this.disposed || doc.languageId !== "csharp" || doc.uri.scheme !== "file") {
            return;
        }

        const expected = path.basename(doc.fileName, path.extname(doc.fileName));
        const diagnostics: Diagnostic[] = [];

        for (const type of findUnityScriptTypes(doc.getText())) {
            if (type.name === expected) {
                continue;
            }

            const start = doc.positionAt(type.index);
            const diagnostic = new Diagnostic(
                new Range(start, start.translate(0, type.name.length)),
                l10n.t(
                    "Unity loads a {0} by file name, so this class has to be called {1}. Rename the class or the file.",
                    type.baseType,
                    expected
                ),
                DiagnosticSeverity.Warning
            );
            diagnostic.source = SOURCE;
            diagnostic.code = "script-name-mismatch";
            diagnostics.push(diagnostic);
        }

        if (this.performanceEnabled()) {
            for (const finding of findPerformanceIssues(doc.getText(), SNIPPET_PREFIXES)) {
                diagnostics.push(this.toPerformanceDiagnostic(doc, finding));
            }
        }

        this.perDocument.set(doc.uri.toString(), diagnostics);
        this.publish(doc.uri);
    }

    private performanceEnabled(): boolean {
        return workspace.getConfiguration("unitySWpack").get<boolean>("performanceDiagnostics") !== false;
    }

    // Every message names the cost and the cheaper alternative, because a
    // warning that only says "slow" gives the reader nothing to act on.
    private toPerformanceDiagnostic(doc: TextDocument, finding: PerformanceFinding): Diagnostic {
        const start = doc.positionAt(finding.index);
        const range = new Range(start, start.translate(0, finding.length));
        const inMessage = finding.message ?? "";

        let message: string;
        switch (finding.rule) {
            case "empty-message":
                message = l10n.t("{0} is empty, and Unity still calls it every time. Delete it.", finding.text);
                break;
            case "camera-main":
                message = l10n.t(
                    "Camera.main searches the scene for the MainCamera tag on every access. Cache it in a field instead of reading it in {0}.",
                    inMessage
                );
                break;
            case "find-object":
                message = l10n.t(
                    "{0} walks the scene and gets slower as the scene grows. Look the object up once and keep the reference, rather than in {1}.",
                    finding.text,
                    inMessage
                );
                break;
            case "send-message":
                message = l10n.t(
                    "{0} resolves the method by name at run time and skips the compiler's checks. Call the component directly, or raise a UnityEvent.",
                    finding.text
                );
                break;
            case "get-component":
                message = l10n.t(
                    "{0} searches the object's components on every call. Cache the result in Awake or Start instead of calling it in {1}.",
                    finding.text,
                    inMessage
                );
                break;
            case "debug-log":
                message = l10n.t(
                    "{0} builds its message and writes to the log on every frame, even when the console is closed. Guard it or remove it from {1}.",
                    finding.text,
                    inMessage
                );
                break;
            case "tag-comparison":
                message = l10n.t("Comparing tag with a string allocates. Use CompareTag, which does not.");
                break;
            case "allocation-in-loop":
                message = l10n.t(
                    "{0} allocates on every iteration. Create it once before the loop and reuse it.",
                    finding.text
                );
                break;
        }

        const diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Information);
        diagnostic.source = SOURCE;
        diagnostic.code = finding.rule;
        return diagnostic;
    }

    // --- whole project ------------------------------------------------------

    private refreshProject(): void {
        if (this.disposed) {
            return;
        }

        const next = new Map<string, Diagnostic[]>();

        const add = (uri: Uri, diagnostic: Diagnostic) => {
            const key = uri.toString();
            const existing = next.get(key);
            if (existing) {
                existing.push(diagnostic);
            } else {
                next.set(key, [diagnostic]);
            }
        };

        for (const reference of this.index.getMissingScriptReferences()) {
            const diagnostic = new Diagnostic(
                new Range(0, 0, 0, 0),
                l10n.t(
                    "This {0} attaches a script that is no longer in the project (GUID {1}). Unity shows it as a missing script.",
                    reference.kind === "prefab" ? l10n.t("prefab") : l10n.t("scene"),
                    reference.guid
                ),
                DiagnosticSeverity.Warning
            );
            diagnostic.source = SOURCE;
            diagnostic.code = "missing-script";
            add(Uri.file(reference.assetPath), diagnostic);
        }

        for (const duplicate of this.index.getDuplicateScriptGuids()) {
            for (const scriptPath of duplicate.scriptPaths) {
                const others = duplicate.scriptPaths
                    .filter((other) => other !== scriptPath)
                    .map((other) => path.basename(other));

                const diagnostic = new Diagnostic(
                    new Range(0, 0, 0, 0),
                    l10n.t(
                        "This script shares its GUID with {0}. Unity can only resolve one of them — delete the copied .meta file and let Unity create a new one.",
                        others.join(", ")
                    ),
                    DiagnosticSeverity.Error
                );
                diagnostic.source = SOURCE;
                diagnostic.code = "duplicate-guid";
                add(Uri.file(scriptPath), diagnostic);
            }
        }

        // Republish everything that gained or lost a project finding.
        const touched = new Set([...this.perProject.keys(), ...next.keys()]);
        this.perProject = next;
        for (const key of touched) {
            this.publish(Uri.parse(key));
        }
    }
}
