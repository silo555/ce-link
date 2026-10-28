// Synthetic, non-executable variable containers for tests; no personal calculator data.
function fixture(entries = [{ name: 'DEMO', type: 21, archived: true, data: [2, 0, 65, 66] }]) {
  const blocks = entries.map(({ name, type, archived = false, data = [0, 0] }) => {
    const out = Buffer.alloc(17 + data.length);
    out.writeUInt16LE(13, 0); out.writeUInt16LE(data.length, 2); out[4] = type;
    out.write(name, 5, 8, 'ascii'); out[14] = archived ? 128 : 0;
    out.writeUInt16LE(data.length, 15); out.set(data, 17); return out;
  });
  const body = Buffer.concat(blocks), file = Buffer.alloc(57 + body.length);
  file.write('**TI83F*', 0, 'ascii'); file.set([26, 10, 0], 8);
  file.writeUInt16LE(body.length, 53); file.set(body, 55);
  fixChecksum(file); return file;
}
function fixChecksum(file) {
  file.writeUInt16LE(file.subarray(55, -2).reduce((a, b) => (a + b) & 65535, 0), file.length - 2);
  return file;
}
module.exports = { fixture, fixChecksum };
