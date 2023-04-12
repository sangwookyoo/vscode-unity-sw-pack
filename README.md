<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack" title="Visual Studio Code Marketplace" target="_blank">
    <img src="https://github.com/sangwookyoo/vscode-unity-sw-pack/blob/master/images/icon.png?raw=true" width="150px" />
  </a>
  <br/>
  </p>
<p align="center">
<img src="https://img.shields.io/badge/Unity%20SW%20Pack%20v0.0.8%20-%23000000.svg?&style=flat&logo=unity&logoColor=white" style="height : auto; margin-left : 2px; margin-right : 2px;"/>
</p>

## Overview
- This extension provides a Unity development environment for VS Code.

**Features**
> All features can be turned on or off in the settings!
- ✅ [Provides code snippets for Unity](#provides-code-snippets-for-unity)
	- <details>
		<summary>List of code snippets</summary>

		- Game Classes:
			- `MonoBehaviour`
			- `NetworkBehaviour`
			- `ScriptableObject`

		- Editor Classes:
			- `Editor`

		- Visual Studio Tools for Unity:
			- `Debug.Log()` (type _`log`_)
			- `Debug.LogError()` (type _`logError`_)
			- `Debug.LogWarning()` (type _`logWarning`_)

		- MonoBehaviour Methods:
			- `Awake()`
			- `FixedUpdate()`
			- `LateUpdate()`
			- `OnAnimatorIK()`
			- `OnAnimatorMove()`
			- `OnApplicationFocus()`
			- `OnApplicationPause()`
			- `OnApplicationQuit()`
			- `OnAudioFilterRead()`
			- `OnBecameInvisible()`
			- `OnBecameVisible()`
			- `OnBeforeTransformParentChanged()`
			- `OnCanvasGroupChanged()`
			- `OnCollisionEnter()`
			- `OnCollisionEnter2D()`
			- `OnCollisionExit()`
			- `OnCollisionExit2D()`
			- `OnCollisionStay()`
			- `OnCollisionStay2D()`
			- `OnConnectedToServer()`
			- `OnControllerColliderHit()`
			- `OnDestroy()`
			- `OnDisable()`
			- `OnDisconnectedFromMasterServer()`
			- `OnDisconnectedFromServer()`
			- `OnDrawGizmos()`
			- `OnDrawGizmosSelected()`
			- `OnEnable()`
			- `OnFailedToConnect()`
			- `OnFailedToConnectToMasterServer()`
			- `OnGUI()`
			- `OnJointBreak()`
			- `OnJointBreak2D()`
			- `OnLevelWasLoaded()`
			- `OnMasterServerEvent()`
			- `OnMouseDown()`
			- `OnMouseDrag()`
			- `OnMouseEnter()`
			- `OnMouseExit()`
			- `OnMouseOver()`
			- `OnMouseUp()`
			- `OnMouseUpAsButton()`
			- `OnNetworkInstantiate()`
			- `OnParticleCollision()`
			- `OnParticleSystemStopped()`
			- `OnParticleTrigger()`
			- `OnParticleUpdateJobScheduled()`
			- `OnPlayerConnected()`
			- `OnPlayerDisconnected()`
			- `OnPostRender()`
			- `OnPreCull()`
			- `OnPreRender()`
			- `OnRectTransformDimensionsChange()`
			- `OnRectTransformRemoved()`
			- `OnRenderImage()`
			- `OnRenderObject()`
			- `OnSerializeNetworkView()`
			- `OnServerInitialized()`
			- `OnTransformChildrenChanged()`
			- `OnTransformParentChanged()`
			- `OnTriggerEnter()`
			- `OnTriggerEnter2D()`
			- `OnTriggerExit()`
			- `OnTriggerExit2D()`
			- `OnTriggerStay()`
			- `OnTriggerStay2D()`
			- `OnValidate()`
			- `OnWillRenderObject()`
			- `Reset()`
			- `Start()`
			- `Update()`
	</details>
- ✅ [[ON/OFF] Shows Scene and Prefab referenced by Script](#shows-scene-and-prefab-referenced-by-script)
- ✅ [[ON/OFF] Indicates Unity event bindings](#indicates-unity-event-bindings)
- ✅ [[ON/OFF] Indicates Unity event function](#indicates-unity-event-function)
- ✅ [[ON/OFF] Displays explanations of Unity messages on Hover](#displays-explanations-of-unity-messages-on-hover)
- ✅ [[ON/OFF] Provide function signature change (Type toggle) between void-IEnumerator](#provide-function-signature-change-type-toggle-between-void-ienumerator)
- ✅ [[ON/OFF] Checks for changes in .meta files and syncs them if there are any](#checks-for-changes-in-meta-files-and-syncs-them-if-there-are-any)
- ✅ [ON/OFF] Provides documentation navigation for Unity messages. (Shortcut: Shift+1)
- ✅ [ON/OFF] Provides theme 'Unity SW Pack Dark'

**Installation**
- Install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack).
- This extension handles the `"omnisharp.useModernNet": false` setting of the C# extension for Unity development.

**Prerequisites**
- Install the [.NET SDK](https://dotnet.microsoft.com/download), which includes the Runtime and the dotnet command.
- [Windows only] Logout or restart Windows to allow changes to %PATH% to take effect.
- [macOS only] To avoid seeing "Some projects have trouble loading. Please review the output for more details", make sure to install the latest stable [Mono](https://www.mono-project.com/download/) release.

	**Install Build Tools for Visual Studio (Windows only)**

	> The C# extension no longer ships with Microsoft Build Tools so they must be installed manually.
	- Download the [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022).
	- Install the <b>.NET desktop build tools</b> workload. No other components are required.

## Features

#### Provides code snippets for Unity.
![CodeSnippets](gifs/01.gif)

#### Shows Scene and Prefab referenced by Script.
![UsageScenePrefab](gifs/02.gif)

#### Indicates Unity event bindings.
![UnityEventBinding](gifs/03.gif)

#### Indicates Unity event function.
![UnityEventMessage](gifs/04.gif)

#### Displays explanations of Unity messages on Hover.
![Hover](gifs/05.gif)

#### Provide function signature change (Type toggle) between void-IEnumerator.
![TypeToggle](gifs/06.gif)

#### Checks for changes in .meta files and syncs them if there are any.
![metaFile](gifs/07.gif)
