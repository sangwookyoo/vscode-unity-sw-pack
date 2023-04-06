# Unity SW Pack
> This extension provides a Unity development environment for VS Code.

## Installation
* Install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SangwookYoo.unity-sw-pack).

## Prerequisites

* Install the [.NET SDK](https://dotnet.microsoft.com/download), which includes the Runtime and the dotnet command.
* [Windows only] Logout or restart Windows to allow changes to %PATH% to take effect.
* [macOS only] To avoid seeing "Some projects have trouble loading. Please review the output for more details", make sure to install the latest stable [Mono](https://www.mono-project.com/download/) release.

### Install Build Tools for Visual Studio (Windows only)

The C# extension no longer ships with Microsoft Build Tools so they must be installed manually.
* Download the [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022).
* Install the <b>.NET desktop build tools</b> workload. No other components are required.

## Features

### 1. Provides Code snippets for Unity.
![CodeSnippets](gifs/01.gif)
### 2. [ON/OFF] Shows Scene and Prefab referenced by Script.
![UsageScenePrefab](gifs/02.gif)
### 3. [ON/OFF] Indicates Unity event function.
![UnityEventMessage](gifs/03.gif)
### 4. [ON/OFF] Displays explanations of Unity messages on Hover.
![Hover](gifs/04.gif)
### 5. [ON/OFF] Provide function signature change (Type toggle) between void-IEnumerator.
![TypeToggle](gifs/05.gif)
### 6. [ON/OFF] Checks for changes in .meta files and syncs them if there are any.
![metaFile](gifs/06.gif)
### 7. [ON/OFF] Provides documentation navigation for Unity messages. (Shortcut: Shift+1)
### 8. [ON/OFF] Provides theme 'Unity SW Pack Dark'.
### 9. Handle `"omnisharp.useModernNet": false` of C# Extension for Unity development.

## Provided Code snippet
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