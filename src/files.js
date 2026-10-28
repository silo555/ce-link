// Strict TI-83F variable container reader. Only program and AppVar entries are sent.
function parseFile(input) {
  const bytes = new Uint8Array(input);
  const word = i => bytes[i] | bytes[i + 1] << 8;
  const fail = message => { throw new Error(message); };
  if (bytes.length < 57 || String.fromCharCode(...bytes.slice(0, 8)) !== '**TI83F*' ||
      bytes[8] !== 0x1a || bytes[9] !== 0x0a)
    fail('Not a supported TI variable file. Choose .8xp, .8xv, or .8xg.');
  // Byte 10 is creator/model metadata (for example 0x13 in CE files), not a fixed zero.
  const end = 55 + word(53);
  if (end + 2 !== bytes.length) fail('File length does not match its header.');
  const checksum = bytes.slice(55, end).reduce((sum, n) => (sum + n) & 65535, 0);
  if (checksum !== word(end)) fail('Checksum failed. Download a fresh copy of this file.');
  const entries = [];
  for (let offset = 55; offset < end;) {
    const header = word(offset), size = word(offset + 2);
    if (![11, 13].includes(header) || offset + header + 4 > end)
      fail('Invalid variable header.');
    const dataStart = offset + header + 4;
    if (!size || word(dataStart - 2) !== size || dataStart + size > end)
      fail('Invalid or truncated variable data.');
    const type = bytes[offset + 4];
    if (![5, 6, 0x15].includes(type)) fail('Only programs and AppVars are supported, including inside groups.');
    const nameBytes = bytes.slice(offset + 5, offset + 13);
    const zero = nameBytes.indexOf(0);
    const name = String.fromCharCode(...nameBytes.slice(0, zero < 0 ? 8 : zero));
    if (!/^[A-Za-z][A-Za-z0-9]{0,7}$/.test(name) || (zero >= 0 && nameBytes.slice(zero).some(n => n !== 0)))
      fail('This version supports only variable names with ASCII letters and digits.');
    entries.push({ name, type, size, attributes: {
      version: header === 13 ? bytes[offset + 13] : 0,
      archived: header === 13 && !!(bytes[offset + 14] & 0x80)
    }, data: bytes.slice(dataStart, dataStart + size) });
    offset = dataStart + size;
  }
  if (!entries.length) fail('The file contains no variables.');
  return { calcType: 'TI-84 Plus', entries };
}
module.exports = { parseFile };
