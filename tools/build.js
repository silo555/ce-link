// Tiny deterministic CommonJS bundler. No packages, network, or runtime dependencies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const modules = new Map();
function visit(filename) {
  const id = path.relative(root, filename).split(path.sep).join('/');
  if (modules.has(id)) return id;
  modules.set(id, '');
  let source = fs.readFileSync(filename, 'utf8');
  source = source.replace(/require\(['"]([^'"]+)['"]\)/g, (match, target) => {
    if (target === 'util') return '({TextEncoder,TextDecoder})';
    if (!target.startsWith('.')) throw Error('Unexpected dependency: ' + target);
    const resolved = path.resolve(path.dirname(filename), target + '.js');
    return `require(${JSON.stringify(visit(resolved))})`;
  });
  modules.set(id, source);
  return id;
}
const entry = visit(path.join(root, 'src/app.js'));
const bundle = `/* CE Link — GPL-3.0-or-later. Includes ticalc-usb; see THIRD_PARTY.md. */\n(()=>{const modules={${[...modules].map(([id, code]) => `${JSON.stringify(id)}:(module,exports,require)=>{\n${code}\n}`).join(',\n')}};const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](m,m.exports,require)}return cache[id].exports}require(${JSON.stringify(entry)});})();`;
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY.md'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src/page.html'), 'utf8')
  .replace('<html lang="en">', () => `<!--\n${notices}\n-->\n<html lang="en">`)
  .replace('/* APP_BUNDLE */', () => bundle);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('Built index.html (' + Buffer.byteLength(html) + ' bytes)');
