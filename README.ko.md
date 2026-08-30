<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack" title="Visual Studio Code Marketplace" target="_blank">
    <img src="https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/images/icon.png" width="150px" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.md">English</a> ·
  <b>한국어</b> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.zh-cn.md">简体中文</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/README.ja.md">日本語</a>
</p>

## 소개

Unity SW Pack은 VS Code에서 Unity C#을 편하게 쓰도록 도와줘요. Unity가 자동으로 호출하는 메서드가
무엇인지, 이 스크립트를 실제로 어디서 쓰는지, UnityEvent가 어디에 연결돼 있는지를 에디터를 벗어나지
않고 알 수 있어요.

**Unity 6** 기준으로 만들었어요. 모든 기능은 설정에서 하나씩 끌 수 있어요.

## 기능

- **Unity 메시지 스니펫** — `MonoBehaviour` 생명주기, `ScriptableObject`, 에디터 스크립트까지
  65개 템플릿을 제공해요.
- **Unity 메시지 표시** — `Awake`, `Start`, `Update` 같은 메서드 위에 표시를 붙여, 쓰지 않는
  코드로 오해하지 않게 해줘요.
- **호버 설명** — Unity 메시지에 마우스를 올리면 어떤 역할이고 언제 실행되는지 알려줘요.
- **씬·프리팹 사용처** — 지금 보는 스크립트를 쓰는 씬과 프리팹이 몇 곳인지, 어떤 것인지 보여줘요.
- **UnityEvent 연결** — 메서드나 `UnityEvent` 필드가 인스펙터의 어디에 연결돼 있는지 씬과
  프리팹 양쪽에서 찾아줘요.
- **코루틴 변경** — 메서드를 `void`와 `IEnumerator` 사이에서 한 번에 바꿔요.
  `using System.Collections;`도 알아서 넣어줘요.
- **.meta 파일 동기화** — 탐색기에서 에셋의 이름을 바꾸거나 지우면 `.meta`도 따라가요.
- **문서 검색** — 선택한 단어를 프로젝트가 실제로 쓰는 버전의 Unity 문서에서 찾아요.
  `Ctrl+Alt+U` (macOS는 `Cmd+Alt+U`).
- **Unity SW Pack Dark** — Unity C#에 맞춘 테마예요.

영어, 한국어, 중국어 간체, 일본어를 지원해요. VS Code의 표시 언어를 그대로 따라가요.

## 준비물

1. [C# 확장](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp)
2. [.NET SDK](https://dotnet.microsoft.com/download)
    - **Windows**: 설치한 뒤 `PATH`가 적용되도록 로그아웃했다가 다시 로그인해 주세요.

`Assets/`, `Library/`, `ProjectSettings/`가 들어 있는 폴더, 즉 Unity 프로젝트 루트를 열어 주세요.
씬과 프리팹 기능이 에셋을 찾으려면 이 폴더가 필요해요.

## 화면으로 보기

**스니펫**

![스니펫](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/01.gif)

**씬·프리팹 사용처**

![씬·프리팹 사용처](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/02.gif)

**UnityEvent 연결**

![UnityEvent 연결](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/03.gif)

**Unity 메시지 표시**

![Unity 메시지 표시](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/04.gif)

**호버 설명**

![호버 설명](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/05.gif)

**코루틴 변경**

![코루틴 변경](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/06.gif)

**.meta 파일 동기화**

![.meta 파일 동기화](https://github.com/sangwookyoo/vscode-unity-sw-pack/raw/master/gifs/07.gif)

## 설정

| 설정                                    | 기본값  | 하는 일                                              |
| --------------------------------------- | ------- | ---------------------------------------------------- |
| `unitySWpack.unityEventMessage`         | `true`  | Unity가 자동으로 호출하는 메서드를 표시해요          |
| `unitySWpack.usageScenePrefab`          | `true`  | 스크립트를 쓰는 씬과 프리팹 수를 보여줘요            |
| `unitySWpack.unityMessageHover`         | `true`  | 호버하면 Unity 메시지를 설명해요                     |
| `unitySWpack.typeToggle`                | `true`  | `void` ↔ `IEnumerator` 전환을 제공해요               |
| `unitySWpack.metaFileSync`              | `true`  | 이름 변경·삭제에 맞춰 `.meta`를 관리해요             |
| `unitySWpack.searchInUnityDocs`         | `true`  | 문서 검색 명령을 추가해요                            |
| `unitySWpack.unityEventLens`            | `true`  | UnityEvent 연결 위치를 보여줘요                      |
| `unitySWpack.onlyScenesInBuildSettings` | `false` | 빌드 설정에 등록된 씬에서만 UnityEvent 연결을 읽어요 |
| `unitySWpack.debugLogging`              | `false` | 인덱싱 과정을 출력 채널에 기록해요                   |

## 알아두면 좋은 점

`.meta` 동기화는 **에디터에서 일어난** 이름 변경과 삭제에만 반응해요. 터미널이나 Unity에서 직접 바꾼
것은 Unity가 알아서 `.meta`를 관리하니 그대로 두었어요.

큰 프로젝트에서 기능이 조용하다면 `unitySWpack.debugLogging`을 켜고 "Unity SW Pack" 출력 채널을
확인해 보세요. `Assets/` 폴더가 크면 첫 인덱싱에 시간이 조금 걸려요.

## 라이선스

[MIT](LICENSE)
