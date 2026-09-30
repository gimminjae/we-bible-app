import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMetadataValue,
  formatMetadataValue,
  buildMetadataPatch,
  validateMetadataDefinition,
} from '../domain/church/metadata.ts';
const field = (dataType, extra = {}) => ({
  id: '1',
  churchId: '1',
  systemKey: null,
  label: 'Test',
  dataType,
  options: null,
  isActive: true,
  isCopyable: true,
  editPolicy: 'self_and_admins',
  sortOrder: 0,
  version: 2,
  ...extra,
});
test('phone and address preserve meaningful formatting and copy complete values', () => {
  assert.equal(
    parseMetadataValue(field('phone'), ' 010-1234-5678 '),
    '010-1234-5678',
  );
  assert.equal(
    formatMetadataValue(field('phone'), '010-1234-5678'),
    '010-1234-5678',
  );
  assert.equal(parseMetadataValue(field('text'), '서울\n강남'), '서울\n강남');
  assert.equal(
    parseMetadataValue(field('phone'), '+82 (10) 1234-5678'),
    '+82 (10) 1234-5678',
  );
});
test('binary uses stable keys, supports clearing, and copies renamed labels', () => {
  const binary = field('binary', {
    options: [
      { value: 'option_1', label: '예' },
      { value: 'option_2', label: '아니오' },
    ],
  });
  assert.equal(parseMetadataValue(binary, ''), null);
  assert.equal(parseMetadataValue(binary, 'option_2'), 'option_2');
  assert.equal(formatMetadataValue(binary, 'option_2'), '아니오');
  assert.throws(() => parseMetadataValue(binary, '아니오'), /INVALID_OPTIONS/);
});
test('numbers round-trip without silently rounding or underflowing', () => {
  for (const [input, expected] of [
    ['0', 0],
    ['-1.5', -1.5],
    ['.0000001', 1e-7],
    ['1e-7', 1e-7],
    ['+01.00', 1],
    ['9007199254740991', Number.MAX_SAFE_INTEGER],
  ])
    assert.equal(parseMetadataValue(field('number'), input), expected);
  for (const value of [
    'NaN',
    'Infinity',
    '0x10',
    '9007199254740992',
    '9007199254740990.5',
    '0.10000000000000001',
    '1e-999',
  ])
    assert.throws(
      () => parseMetadataValue(field('number'), value),
      /INVALID_NUMBER/,
    );
  assert.equal(formatMetadataValue(field('number'), 0), '0');
});
test('date input validates real calendar dates independently of display timezone', () => {
  assert.equal(parseMetadataValue(field('date'), '2024-02-29'), '2024-02-29');
  for (const value of [
    '2025-02-29',
    '2024-02-30',
    '0000-01-01',
    '2024-13-01',
    '2024-2-1',
  ])
    assert.throws(
      () => parseMetadataValue(field('date'), value),
      /INVALID_DATE/,
    );
  assert.throws(
    () =>
      parseMetadataValue(
        field('date', { systemKey: 'birth_date' }),
        '9999-01-01',
      ),
    /INVALID_DATE/,
  );
});
test('value validation allows partial email and formatted phone only in search mode', () => {
  assert.throws(
    () => parseMetadataValue(field('email'), 'example.com'),
    /INVALID_EMAIL/,
  );
  assert.equal(
    parseMetadataValue(field('email'), 'EXAMPLE.com', true),
    'EXAMPLE.com',
  );
  assert.equal(parseMetadataValue(field('phone'), '010-12', true), '01012');
  assert.throws(
    () => parseMetadataValue(field('phone'), '---', true),
    /INVALID_PHONE/,
  );
  assert.equal(parseMetadataValue(field('text'), '%_\\', true), '%_\\');
});
test('patch preserves untouched, inactive and read-only fields; clearing is explicit', () => {
  const fields = [
    field('phone', { value: '010-1234-5678', canEdit: true }),
    field('text', {
      id: '2',
      value: 'archived',
      isActive: false,
      canEdit: false,
    }),
    field('text', { id: '3', value: 'private', canEdit: false }),
  ];
  assert.deepEqual(
    buildMetadataPatch(fields, {
      1: '',
      2: 'changed',
      3: 'changed',
      999: 'injected',
    }),
    { patch: { 1: null }, versions: { 1: 2 }, errors: {} },
  );
  assert.deepEqual(
    buildMetadataPatch(fields, { 1: '010-1234-5678' }).patch,
    {},
  );
});
test('numeric zero differs from an absent value, and invalid edits identify their field', () => {
  assert.deepEqual(
    buildMetadataPatch([field('number', { canEdit: true, value: null })], {
      1: '0',
    }).patch,
    { 1: 0 },
  );
  assert.deepEqual(
    buildMetadataPatch([field('number', { canEdit: true, value: 0 })], {
      1: 'oops',
    }).errors,
    { 1: 'METADATA_INVALID_NUMBER' },
  );
});
test('definition rejects duplicate or missing option labels and excessive Unicode lengths', () => {
  const base = {
    label: '결혼 여부',
    dataType: 'binary',
    options: [
      { value: 'option_1', label: '예' },
      { value: 'option_2', label: '아니오' },
    ],
  };
  validateMetadataDefinition(base);
  assert.throws(
    () =>
      validateMetadataDefinition({
        ...base,
        options: [
          { value: 'option_1', label: '예' },
          { value: 'option_2', label: '예' },
        ],
      }),
    /INVALID_OPTIONS/,
  );
  assert.throws(
    () => validateMetadataDefinition({ ...base, label: '가'.repeat(81) }),
    /INVALID_LABEL/,
  );
  assert.throws(
    () => parseMetadataValue(field('text'), '😀'.repeat(1001)),
    /TOO_LONG/,
  );
});
