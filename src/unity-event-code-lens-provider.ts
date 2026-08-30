import {
    CodeLens,
    CodeLensProvider,
    Command,
    Disposable,
    Event,
    EventEmitter,
    Position,
    Selection,
    TextDocument,
    commands,
    window,
} from "vscode";

import { language } from "./extension";
import { UnityAssetIndex } from "./unity-asset-index";
import { ConnectedMember, UnityEventFinder } from "./unity-event-finder";

function getLocalizedTitle(count: number): string {
    if (language === "ko") {
        return `$(symbol-field) Unity 이벤트 참조 ${count}개`;
    }
    return `$(symbol-field) Unity Event ${count} references`;
}

export default class UnityEventCodeLensProvider implements CodeLensProvider, Disposable {
    private readonly changeEmitter = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this.changeEmitter.event;

    private readonly indexListener: Disposable;

    constructor(private readonly finder: UnityEventFinder, index: UnityAssetIndex) {
        // The index fills in asynchronously, so the lenses have to be requested again
        // once it is ready; otherwise they would stay empty until the user types.
        this.indexListener = index.onDidChangeIndex(() => this.changeEmitter.fire());
    }

    public provideCodeLenses(document: TextDocument): CodeLens[] {
        return this.finder.find(document).map((member) => {
            const command: Command = {
                command: "unitySWpack.showEventReferences",
                title: getLocalizedTitle(member.connections.length),
                arguments: [member],
            };

            return new CodeLens(member.range, command);
        });
    }

    public dispose(): void {
        this.indexListener.dispose();
        this.changeEmitter.dispose();
    }
}

/** Moves the cursor onto the member and opens the hover that lists the connections. */
export function showEventReferences(member: ConnectedMember): void {
    const editor = window.activeTextEditor;
    if (!editor || !member?.range) {
        return;
    }

    const start = new Position(member.range.start.line, member.range.start.character);
    editor.selection = new Selection(start, start);

    if (member.connections.length > 0) {
        void commands.executeCommand("editor.action.showHover");
    }
}
