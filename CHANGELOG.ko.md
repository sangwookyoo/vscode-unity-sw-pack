# 변경 내역

<p>
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.md">English</a> ·
  <b>한국어</b> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.zh-cn.md">简体中文</a> ·
  <a href="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/CHANGELOG.ja.md">日本語</a>
</p>

이 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며, 최신 릴리스를
가장 위에 둡니다.

## [2.2 Released]

### 추가

- 에디터가 보여주지 않는 Unity 문제를 알려줘요. 기본으로 켜져 있어요.
    - 파일명과 클래스명이 다른 MonoBehaviour. Unity가 컴포넌트를 붙이지 못하는데
      아무 말 없이 실패해요.
    - 프로젝트에 없는 스크립트를 붙들고 있는 씬이나 프리팹.
    - GUID가 겹친 스크립트. 대개 .meta 파일을 복사해서 생겨요.
- 매 프레임 도는 콜백 안의 값비싼 호출을 짚어줘요. Camera.main, GameObject.Find
  계열, GetComponent, SendMessage, Debug.Log, CompareTag 대신 문자열로 tag를
  비교하는 코드, 반복문 안에서 만드는 yield 명령이 대상이에요. 비어 있는 Unity
  콜백도 알려줘요. Unity가 계속 호출하거든요. 구문 기반 검사라서 알아볼 수 있는
  Unity API 이름을 다루고, 타입까지 아는 분석기가 잡아내는 전부를 다루지는
  않아요. Microsoft.Unity.Analyzers를 이미 쓰신다면
  `unitySWpack.performanceDiagnostics`로 꺼두세요.
- 씬·프리팹 참조 표시를 누르면 해당 파일이 열려요. 여러 개면 골라서 열 수 있어요.
- 설정 `unitySWpack.diagnostics`와 `unitySWpack.performanceDiagnostics`를 추가했어요.

## [2.1 Released]

### 변경

- Unity 6을 기준으로 삼았어요. 문서 검색이 항상 최신 문서 대신
  `ProjectSettings/ProjectVersion.txt`의 버전에 맞는 문서를 열어요.
- 외부 확장에서 가져와 쓰던 Unity Event Lens를 직접 구현으로 바꿨어요. 생성된 ANTLR C# 파서와
  `antlr4ts`, `inflection`, `@vscode-logging/logger` 의존성이 사라지고 `js-yaml`만 남았어요.
- 에셋 인덱싱을 `Assets/` 한 번 훑기로 다시 만들었어요. 참조를 찾을 때 매번 모든 씬과 프리팹을
  훑는 대신 GUID 인덱스를 쓰고, 파일 내용을 메모리에 들고 있지 않아요.
- 파일 감시 범위를 `Assets/` 아래 에셋 종류로 좁혔어요. Unity가 `Library/`와 `Temp/`를 계속
  고쳐 써도 확장이 깨어나지 않아요.
- 확장을 번들로 묶었어요. 패키지가 50MB에서 100KB 아래로 줄었어요.
- 문서 검색 단축키를 `Shift+1`에서 `Ctrl+Alt+U` / `Cmd+Alt+U`로 바꿨어요. 기존 단축키는 사실상
  `!`라서 선택 영역 위에 느낌표를 입력하려는 것을 가로챘어요.
- `.meta` 동기화가 에디터의 이름 변경·삭제 이벤트에 반응해요. 터미널이나 Unity에서 직접 바꾼 것은
  Unity가 알아서 `.meta`를 관리하니 그대로 두었어요.

### 추가

- 영어와 한국어에 더해 중국어 간체와 일본어를 지원해요. 설정 설명, 명령 이름, 마켓플레이스 소개도
  함께 번역했어요.
- 씬뿐 아니라 프리팹 안의 UnityEvent 연결도 찾아요.
- 설정 `unitySWpack.onlyScenesInBuildSettings`와 `unitySWpack.debugLogging`을 추가했어요.
- 실제 확장 호스트에서 도는 통합 테스트와, 인덱스·C# 파싱·다국어 카탈로그에 대한 단위 테스트를
  갖췄어요.

### 수정

- 씬·프리팹 참조 개수가 인덱싱이 끝나면 바로 나타나요. 예전에는 파일을 고치기 전까지 비어 있었어요.
- 네임스페이스 안에 있는 클래스에서도 UnityEvent 렌즈가 동작해요. 기존 비교 방식으로는 절대
  일치할 수 없었어요.
- 클래스 선언이 없는 파일(인터페이스나 열거형만 있는 파일)에서 CodeLens를 만들다 오류가 나던 문제를
  고쳤어요.
- `.meta` 동기화가 어떤 삭제가 어떤 생성과 짝인지 추측하지 않아요. 예전에는 무관한 파일의 `.meta`를
  옮길 수 있었어요.
- 스크립트 이름을 바꿔도 렌즈가 쓰는 클래스 이름이 지워지지 않아요.
- 활성화할 때 사용자의 전역 설정 `omnisharp.useModernNet`을 건드리지 않고, 확장 자신의
  `package.json`도 다시 쓰지 않아요.

### 삭제

- `NetworkBehaviour` 템플릿을 비롯해, Unity에 더 이상 없는 UNET 등의 API 스니펫 13개를 뺐어요.

## [2.0 Released]

### 변경

- 내부 구조를 크게 정리하고 최적화했습니다.
    - 동기 파일 입출력을 비동기(`fs.promises`)로 교체했습니다.
    - `.meta`, `.unity`, `.prefab` 파일에 캐시를 도입해 참조 검색을 빠르게 했습니다.
    - 여러 프로바이더에 중복돼 있던 로직을 통합했습니다.
    - `extension.ts`의 초기화 흐름을 단순화했습니다.

### 추가

- Unity 문서 검색이 선택한 텍스트와 커서 위치의 단어를 모두 지원합니다.

### 수정

- `.meta` 파일 동기화의 생성·삭제 처리 신뢰도를 높였습니다.
- `Parser`의 클래스·메서드 인식을 개선해 오탐을 줄였습니다.

## [1.0 Released]

- 'Type toggle'을 'Change coroutine'으로 이름을 바꿨습니다.

## [0.0.8 Released]

- `Parser` 성능을 개선했습니다.

## [0.0.7 Released]

- 한국어를 추가했습니다.

## [0.0.6 Released]

- Unity 이벤트 함수를 표시하는 기능을 추가했습니다.

## [0.0.5 Released]

- 버그를 수정했습니다.

## [0.0.4 Released]

- 기본 언어를 영어로 바꿨습니다.

## [0.0.3 Released]

- 'Type toggle' 오류를 수정했습니다.

## [0.0.2 Released]

- 기능별 켜기/끄기를 추가했습니다.
- 'Unity SW Pack Dark' 테마를 추가했습니다.

## [0.0.1 Released]

- 첫 릴리스입니다.
