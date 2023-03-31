import { Hover, HoverProvider, Position, ProviderResult, TextDocument } from "vscode";
import { parser } from "./extension";
import * as snippet from "./snippets.json";

export default class UnityMessageHoverProvider implements HoverProvider {
    provideHover(doc: TextDocument, pos: Position): ProviderResult<Hover> {
        // 현재 커서 위치의 라인을 가져온다
        const lines = doc.getText().split("\n");
        const line = lines[pos.line];

        // 현재 라인이 MonoBehaviour나 NetworkBehaviour 내부가 아니면 return
        if (!parser.isInBehaviour(lines, pos.line)) return;

        // 현재 라인에 Unity 메시지가 없으면 return
        if (!parser.hasUnityMessage(line)) return;

        // 현재 라인에서 void를 반환하는 메소드의 이름을 찾는다
        const name = parser.findMethodsName(line);
        if (name === undefined) return;

        // snippets.json 파일에서 해당 메소드의 설명을 가져온다
        const msg = Object.values(snippet).find((msg) => msg.prefix === name);
        if (msg !== undefined) {

            // 해당 메소드의 이름이 위치한 range를 가져온다
            const nameIndex = line.indexOf(name);
            const range = doc.getWordRangeAtPosition(new Position(pos.line, nameIndex));

            // Hover 오브젝트를 반환한다
            return new Hover(msg.description, range);
        }
    }
}