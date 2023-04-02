# Unity SW Pack
> 이 확장은 VS Code용 Unity 개발환경을 제공합니다.

## 사전 준비

* 런타임 및 닷넷 명령이 포함된 [.NET SDK](https://dotnet.microsoft.com/ko-kr/download)를 설치
* [Windows만 해당] Windows를 다시 시작하여 %PATH%에 대한 변경 사항을 적용
* [macOS만 해당] "일부 프로젝트를 로드하는 데 문제가 있습니다. 자세한 내용은 출력을 검토하세요."라는 메시지가 표시되지 않도록 하려면 최신 [Mono](https://www.mono-project.com/download/stable/#download-mac) 릴리즈를 설치

## 주요 기능

* Unity를 위한 코드 스니펫을 한국어로 제공합니다.
![CodeSnippets](gifs/01.gif)
* [ON/OFF] Unity 스크립트가 참조하고 있는 Scene, Prefab을 보여줍니다.
![UsageScenePrefab](gifs/02.gif)
* [ON/OFF] Unity 이벤트 함수를 표기합니다.
![UnityEventMessage](gifs/03.gif)
* [ON/OFF] Unity 메시지에 대한 설명를 Hover로 보여줍니다.
![Hover](gifs/04.gif)
* [ON/OFF] void-IEnumerator 간의 함수 시그니처 변경(타입 토글)을 제공합니다.
![TypeToggle](gifs/05.gif)
* [ON/OFF] .meta 파일의 변경사항을 검사하여 변경점이 있으면 동기화합니다.
![metaFile](gifs/06.gif)
* [ON/OFF] Unity 메시지에 대한 문서 탐색을 제공합니다. (단축키: Shift+1)
* [ON/OFF] Unity SW Pack Dark Theme을 제공합니다.
* Unity 개발을 위해 C# Extension의 `"omnisharp.useModernNet": false` 처리합니다.

## 제공되는 코드 스니펫
* Game classes:
	* `MonoBehaviour`
	* `NetworkBehaviour`
	* `ScriptableObject`

* Editor Classes:
	* `Editor`

* Visual Studio Tools for Unity:
	* `Debug.Log()` (type _`log`_)
	* `Debug.LogError()` (type _`logError`_)
	* `Debug.LogWarning()` (type _`logWarning`_)

* MonoBehaviour Methods:
	* `Awake()`
	* `FixedUpdate()`
	* `LateUpdate()`
	* `OnAnimatorIK()`
	* `OnAnimatorMove()`
	* `OnApplicationFocus()`
	* `OnApplicationPause()`
	* `OnApplicationQuit()`
	* `OnAudioFilterRead()`
	* `OnBecameInvisible()`
	* `OnBecameVisible()`
	* `OnBeforeTransformParentChanged()`
	* `OnCanvasGroupChanged()`
	* `OnCollisionEnter()`
	* `OnCollisionEnter2D()`
	* `OnCollisionExit()`
	* `OnCollisionExit2D()`
	* `OnCollisionStay()`
	* `OnCollisionStay2D()`
	* `OnConnectedToServer()`
	* `OnControllerColliderHit()`
	* `OnDestroy()`
	* `OnDisable()`
	* `OnDisconnectedFromMasterServer()`
	* `OnDisconnectedFromServer()`
	* `OnDrawGizmos()`
	* `OnDrawGizmosSelected()`
	* `OnEnable()`
	* `OnFailedToConnect()`
	* `OnFailedToConnectToMasterServer()`
	* `OnGUI()`
	* `OnJointBreak()`
	* `OnJointBreak2D()`
	* `OnLevelWasLoaded()`
	* `OnMasterServerEvent()`
	* `OnMouseDown()`
	* `OnMouseDrag()`
	* `OnMouseEnter()`
	* `OnMouseExit()`
	* `OnMouseOver()`
	* `OnMouseUp()`
	* `OnMouseUpAsButton()`
	* `OnNetworkInstantiate()`
	* `OnParticleCollision()`
	* `OnParticleSystemStopped()`
	* `OnParticleTrigger()`
	* `OnParticleUpdateJobScheduled()`
	* `OnPlayerConnected()`
	* `OnPlayerDisconnected()`
	* `OnPostRender()`
	* `OnPreCull()`
	* `OnPreRender()`
	* `OnRectTransformDimensionsChange()`
	* `OnRectTransformRemoved()`
	* `OnRenderImage()`
	* `OnRenderObject()`
	* `OnSerializeNetworkView()`
	* `OnServerInitialized()`
	* `OnTransformChildrenChanged()`
	* `OnTransformParentChanged()`
	* `OnTriggerEnter()`
	* `OnTriggerEnter2D()`
	* `OnTriggerExit()`
	* `OnTriggerExit2D()`
	* `OnTriggerStay()`
	* `OnTriggerStay2D()`
	* `OnValidate()`
	* `OnWillRenderObject()`
	* `Reset()`
	* `Start()`
	* `Update()`