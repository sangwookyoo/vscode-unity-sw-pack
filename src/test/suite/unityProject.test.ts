import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { DEFAULT_DOCS_VERSION, findAssetsRoot, parseDocsVersion, readDocsVersion } from '../../UnityProject';

function toPath(...segments: string[]): string {
	return segments.join(path.sep);
}

suite('UnityProject Test Suite', () => {
	test('findAssetsRoot resolves the Assets folder', () => {
		const file = toPath('C:', 'Proj', 'Assets', 'Scripts', 'Player.cs');
		assert.strictEqual(findAssetsRoot(file), toPath('C:', 'Proj', 'Assets'));
	});

	test('findAssetsRoot is not confused by a parent folder containing "Assets"', () => {
		const file = toPath('C:', 'MyAssets', 'Proj', 'Assets', 'Player.cs');
		assert.strictEqual(findAssetsRoot(file), toPath('C:', 'MyAssets', 'Proj', 'Assets'));
	});

	test('findAssetsRoot uses forward slash paths as well', () => {
		assert.strictEqual(
			findAssetsRoot('/home/me/MyAssets/Proj/Assets/Scripts/Player.cs'),
			'/home/me/MyAssets/Proj/Assets');
	});

	test('findAssetsRoot returns the deepest Assets segment', () => {
		const file = toPath('C:', 'Proj', 'Assets', 'Plugins', 'Assets', 'Player.cs');
		assert.strictEqual(findAssetsRoot(file), toPath('C:', 'Proj', 'Assets', 'Plugins', 'Assets'));
	});

	test('findAssetsRoot returns undefined when there is no Assets folder', () => {
		assert.strictEqual(findAssetsRoot(toPath('C:', 'Proj', 'Sources', 'Player.cs')), undefined);
	});

	test('findAssetsRoot prefers the workspace folder when the file lives inside it', () => {
		const workspaceRoot = toPath('C:', 'MyAssets', 'Proj');
		const file = toPath('C:', 'MyAssets', 'Proj', 'Assets', 'Scripts', 'Player.cs');
		assert.strictEqual(findAssetsRoot(file, workspaceRoot), toPath('C:', 'MyAssets', 'Proj', 'Assets'));
	});

	test('findAssetsRoot falls back to the path walk for files outside the workspace folder', () => {
		const workspaceRoot = toPath('C:', 'Other');
		const file = toPath('C:', 'MyAssets', 'Proj', 'Assets', 'Player.cs');
		assert.strictEqual(findAssetsRoot(file, workspaceRoot), toPath('C:', 'MyAssets', 'Proj', 'Assets'));
	});

	test('parseDocsVersion takes the first two components of m_EditorVersion', () => {
		assert.strictEqual(parseDocsVersion('m_EditorVersion: 6000.0.23f1'), '6000.0');
		assert.strictEqual(
			parseDocsVersion('m_EditorVersion: 2022.3.10f1\nm_EditorVersionWithRevision: 2022.3.10f1 (abc)'),
			'2022.3');
	});

	test('parseDocsVersion falls back on malformed or missing content', () => {
		assert.strictEqual(parseDocsVersion(undefined), DEFAULT_DOCS_VERSION);
		assert.strictEqual(parseDocsVersion(''), DEFAULT_DOCS_VERSION);
		assert.strictEqual(parseDocsVersion('not a version file'), DEFAULT_DOCS_VERSION);
		assert.strictEqual(parseDocsVersion('m_EditorVersion: banana'), DEFAULT_DOCS_VERSION);
	});

	test('DEFAULT_DOCS_VERSION targets Unity 6', () => {
		assert.strictEqual(DEFAULT_DOCS_VERSION, '6000.0');
	});

	test('readDocsVersion reads ProjectSettings/ProjectVersion.txt', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-sw-pack-'));
		try {
			await fs.mkdir(path.join(root, 'ProjectSettings'));
			await fs.writeFile(
				path.join(root, 'ProjectSettings', 'ProjectVersion.txt'),
				'm_EditorVersion: 6000.0.23f1\nm_EditorVersionWithRevision: 6000.0.23f1 (1234567890ab)\n');

			assert.strictEqual(await readDocsVersion(root), '6000.0');
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	test('readDocsVersion falls back when the file or workspace is missing', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unity-sw-pack-'));
		try {
			assert.strictEqual(await readDocsVersion(root), DEFAULT_DOCS_VERSION);
			assert.strictEqual(await readDocsVersion(undefined), DEFAULT_DOCS_VERSION);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});
