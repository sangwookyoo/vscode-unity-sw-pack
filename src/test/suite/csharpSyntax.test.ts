import * as assert from 'assert';

import { findClassLine } from '../../CSharpSyntax';

suite('CSharpSyntax Test Suite', () => {
	test('findClassLine returns the line index of the class declaration', () => {
		const lines = [
			'using UnityEngine;',
			'',
			'public class Player : MonoBehaviour',
			'{',
			'}'
		];

		assert.strictEqual(findClassLine(lines), 2);
	});

	test('findClassLine returns undefined when there is no class', () => {
		const lines = [
			'using UnityEngine;',
			'',
			'public interface IDamageable',
			'{',
			'	void TakeDamage(int amount);',
			'}'
		];

		assert.strictEqual(findClassLine(lines), undefined);
	});

	test('findClassLine returns undefined for enum only files', () => {
		assert.strictEqual(findClassLine(['public enum State { Idle, Run }']), undefined);
	});

	test('findClassLine returns undefined for an empty file', () => {
		assert.strictEqual(findClassLine([]), undefined);
		assert.strictEqual(findClassLine(['']), undefined);
	});

	test('findClassLine ignores identifiers that merely contain "class"', () => {
		assert.strictEqual(findClassLine(['private string className;']), undefined);
	});
});
