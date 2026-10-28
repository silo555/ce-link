const Calculator = require('../vendor/ticalc-usb/dusb/ez80series');
const { parseFile } = require('./files');
const $ = id => document.getElementById(id);
let device = null, calculator = null, busy = false, loading = false, queue = [];
const supported = !!navigator.usb && window.isSecureContext;
function message(text, error = false) {
  $('status').textContent = text;
  $('status').className = error ? 'notice error' : 'notice';
}
function render() {
  $('connect').disabled = busy || !supported || !!calculator;
  $('disconnect').disabled = busy || !device;
  $('files').disabled = busy || loading;
  $('clear').disabled = busy || loading || !queue.length;
  $('send').disabled = busy || loading || !calculator || !queue.some(item => item.state === 'Ready');
  $('consent').disabled = busy;
  $('destination').disabled = busy;
  $('connection').textContent = calculator ? 'Connected · ' + device.productName : 'Not connected';
  $('list').replaceChildren();
  for (const item of queue) {
    const row = document.createElement('li');
    const info = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = item.name;
    const detail = document.createElement('small');
    detail.textContent = item.error || item.parsed.entries.map(e => `${e.name} · ${e.type === 21 ? 'AppVar' : 'Program'} · ${e.size.toLocaleString()} bytes`).join(' / ');
    info.append(title, detail);
    const state = document.createElement('span'); state.className = 'tag'; state.textContent = item.state;
    row.append(info, state); $('list').append(row);
  }
  $('empty').hidden = queue.length > 0;
}
async function closeDevice() {
  const old = device; device = null; calculator = null;
  if (old && old.opened) { try { await old.close(); } catch {} }
}
async function timed(operation, milliseconds = 20000) {
  let timer;
  try {
    return await Promise.race([operation(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('USB timed out. Disconnect and reconnect the cable before retrying.')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
function explain(error) {
  if (error.name === 'NotFoundError') return 'No calculator selected. Connect your cable and try again.';
  if (['SecurityError', 'NotAllowedError'].includes(error.name)) return 'USB permission was denied or blocked by browser/school policy.';
  if (error.name === 'NetworkError') return 'Cannot open the calculator. Close TI Connect and other calculator tabs. Windows may need an existing WinUSB driver.';
  return error.message || String(error);
}
$('connect').onclick = async () => {
  busy = true; render(); message('Choose your TI-84 Plus CE in the USB picker…');
  try {
    device = await navigator.usb.requestDevice({ filters: [{ vendorId: 0x0451, productId: 0xe008 }] });
    if (!/^TI-84 Plus CE(?:\b|[- ])/.test(device.productName || ''))
      throw new Error('Select a TI-84 Plus CE family calculator. Other models are not supported by this tool.');
    await timed(async () => {
      const candidate = new Calculator({ device, properties: {} });
      await candidate.connect();
      if (!await candidate.isReady()) throw new Error('Calculator did not respond. Turn it on and return to the home screen.');
      calculator = candidate;
    });
    message('Connected. Choose your files, then send when ready.');
  } catch (error) { await closeDevice(); message(explain(error), true); }
  finally { busy = false; render(); }
};
$('disconnect').onclick = async () => { busy = true; render(); await closeDevice(); busy = false; message('Disconnected.'); render(); };
navigator.usb?.addEventListener('disconnect', event => {
  if (event.device === device) {
    device = null; calculator = null;
    message('Calculator unplugged. Reconnect before sending more files.', true); render();
  }
});
async function addFiles(files) {
  if (busy || loading) return;
  loading = true; render();
  try {
    for (const file of files) {
      if (queue.length >= 100) { message('Queue limit: 100 files. Clear the queue to add more.', true); break; }
      const item = { name: file.name, state: 'Ready' };
      try {
        if (!/\.8x[pvg]$/i.test(file.name)) throw new Error('Choose .8xp programs, .8xv AppVars, or .8xg groups. Extract ZIP files first.');
        if (file.size > 65592) throw new Error('File is too large for a standard TI variable container.');
        item.parsed = parseFile(await file.arrayBuffer());
      } catch (error) { item.error = explain(error); item.state = 'Invalid'; }
      queue.push(item);
    }
  } finally { loading = false; $('files').value = ''; render(); }
}
$('files').onchange = event => addFiles(event.target.files);
$('drop').ondragover = event => { event.preventDefault(); };
$('drop').ondrop = event => { event.preventDefault(); addFiles(event.dataTransfer.files); };
$('clear').onclick = () => { queue = []; $('consent').checked = false; $('progress').value = 0; render(); };
$('send').onclick = async () => {
  if (!$('consent').checked) { message('Check the box acknowledging that matching calculator variables can be replaced.', true); return; }
  busy = true; render();
  const pending = queue.filter(item => item.state === 'Ready');
  $('progress').max = pending.length; $('progress').value = 0;
  let current;
  try {
    for (const item of pending) {
      current = item; item.state = 'Sending'; render(); message('Sending ' + item.name + '… Keep the cable connected.');
      const parsed = { ...item.parsed, entries: item.parsed.entries.map(entry => ({ ...entry,
        attributes: { ...entry.attributes, archived: $('destination').value === 'original' ? entry.attributes.archived : $('destination').value === 'archive' }
      })) };
      await timed(async () => {
        const storage = await calculator.getStorageDetails(parsed);
        if (!storage.fits) throw new Error('Not enough calculator memory for ' + item.name + '.');
        await calculator.sendFile(parsed);
        // Confirm the calculator responds after the end-of-transmission packet.
        if (!await calculator.isReady()) throw new Error('Transfer acknowledgement could not be confirmed. Check the calculator before retrying.');
      }, 60000);
      item.state = 'Sent'; $('progress').value++;
    }
    message('Transfer complete. ' + pending.length + ' file(s) sent.');
  } catch (error) {
    if (current) current.state = 'Check calculator';
    await closeDevice(); message(explain(error) + ' Stopped; later files were not sent. Check for a partial transfer before reconnecting.', true);
  } finally { busy = false; render(); }
};
message(supported ? 'Ready in this browser. Connect a powered-on calculator with a USB data cable.' :
  'USB is unavailable here. Open this HTML in desktop Chrome or Edge. If local-file USB is blocked, use the HTTPS version; school policy may still prevent access.', !supported);
render();
