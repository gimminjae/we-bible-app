import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../utils/keyboard-layout.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { inputScrollOffset, keyboardOverlap } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

test('a footer comment and its submit row fit above an iPhone keyboard', () => {
  const before = { scrollY: 400, viewportY: 130, viewportHeight: 390, inputY: 600, inputHeight: 112 };
  const after = inputScrollOffset(before);
  const top = before.inputY - (after - before.scrollY);
  assert(top >= before.viewportY + 12);
  assert(top + before.inputHeight + 12 + 44 <= before.viewportY + before.viewportHeight);
});

test('switching to a field above the current position scrolls up without losing the header', () => {
  const after = inputScrollOffset({
    scrollY: 500, viewportY: 130, viewportHeight: 390, inputY: 90, inputHeight: 48,
  });
  assert.equal(after, 448);
});

test('an already visible input does not jump when the keyboard frame changes', () => {
  assert.equal(inputScrollOffset({
    scrollY: 300, viewportY: 130, viewportHeight: 390, inputY: 200, inputHeight: 112,
  }), 300);
});

test('an oversized field keeps its first line below the header', () => {
  const before = { scrollY: 100, viewportY: 100, viewportHeight: 220, inputY: 180, inputHeight: 600 };
  const after = inputScrollOffset(before);
  assert.equal(before.inputY - (after - before.scrollY), 112);
});

test('top-of-form focus never creates a negative content offset', () => {
  assert.equal(inputScrollOffset({
    scrollY: 0, viewportY: 100, viewportHeight: 390, inputY: 100, inputHeight: 48,
  }), 0);
});

test('sheets reserve only actual keyboard overlap, including dismissal and Android resize', () => {
  assert.equal(keyboardOverlap(852, 515), 337);
  assert.equal(keyboardOverlap(515, 515), 0);
  assert.equal(keyboardOverlap(852, 852), 0);
  assert.equal(keyboardOverlap(852, 950), 0);
});
