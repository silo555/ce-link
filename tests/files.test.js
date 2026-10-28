const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseFile } = require('../src/files');
const { fixture, fixChecksum } = require('./fixtures');
test('reads grouped programs and AppVars and preserves archive/data', () => {
  const parsed = parseFile(fixture([{ name: 'HELLO', type: 5 }, { name: 'NOTES', type: 21, archived: true, data: [1, 2, 3] }]));
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[1].name, 'NOTES');
  assert.equal(parsed.entries[1].attributes.archived, true);
  assert.deepEqual([...parsed.entries[1].data], [1, 2, 3]);
});
test('rejects corrupt checksums, truncation, unsupported signatures and Flash files', () => {
  const corrupt = fixture(); corrupt[74] ^= 1;
  assert.throws(() => parseFile(corrupt), /Checksum/);
  assert.throws(() => parseFile(fixture().subarray(0, 62)), /length/);
  assert.throws(() => parseFile(Buffer.from('**TIFL**')), /supported/);
});
test('rejects malformed headers, repeated sizes and unsupported types even with a valid checksum', () => {
  const header = fixture(); header[55] = 12;
  assert.throws(() => parseFile(fixChecksum(header)), /header/);
  const size = fixture(); size[70] = 9;
  assert.throws(() => parseFile(fixChecksum(size)), /truncated/);
  assert.throws(() => parseFile(fixture([{ name: 'A', type: 0 }])), /Only programs/);
});
test('rejects empty containers, non-ASCII names, and stray bytes after a name terminator', () => {
  assert.throws(() => parseFile(fixture([])), /no variables/);
  assert.throws(() => parseFile(fixture([{ name: '<X>', type: 21 }])), /names/);
  const file = fixture(); file[65] = 65;
  assert.throws(() => parseFile(fixChecksum(file)), /names/);
});
