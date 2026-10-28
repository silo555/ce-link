// Run after installing Playwright and its Chromium browser (see README).
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
const { fixture } = require('./fixtures');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
    await page.addInitScript(() => {
      const originalTimeout = window.setTimeout.bind(window);
      window.setTimeout = (fn, delay, ...args) => originalTimeout(fn, window.fastTimeout && delay === 60000 ? 20 : delay, ...args);
      const incoming = [], sent = [];
      const number = (n, count) => Array.from({ length: count }, (_, i) => n >>> ((count - i - 1) * 8) & 255);
      const raw = (type, data) => new Uint8Array([...number(data.length, 4), type, ...data]);
      const response = (type, data) => raw(4, [...number(data.length, 4), ...number(type, 2), ...data]);
      let fragments = [];
      const endpoints = [{ type: 'bulk', direction: 'in', endpointNumber: 1, packetSize: 64 },
        { type: 'bulk', direction: 'out', endpointNumber: 2, packetSize: 64 }];
      const device = {
        productName: 'TI-84 Plus CE', vendorId: 0x451, productId: 0xe008, opened: false, configuration: null,
        open: async () => { device.opened = true; }, close: async () => { device.opened = false; },
        selectConfiguration: async () => { device.configuration = { interfaces: [{ interfaceNumber: 0, alternate: { alternateSetting: 0 }, alternates: [{ alternateSetting: 0, endpoints }] }] }; },
        claimInterface: async () => {},
        transferOut: async (_, bytes) => {
          if (!device.opened) throw Error('Disconnected');
          if (window.hangTransfer) return new Promise(() => {});
          if (window.failTransfer) throw Error('Simulated cable failure');
          sent.push([...bytes]);
          if (bytes[4] === 1) incoming.push(raw(2, [0, 0, 4, 0]));
          if (bytes[4] === 3 || bytes[4] === 4) {
            incoming.push(raw(5, [224, 0])); fragments.push(...bytes.slice(5));
            if (bytes[4] === 4) {
              const type = fragments[4] * 256 + fragments[5];
              if (type === 1) incoming.push(response(0x12, [0, 0, 7, 208]));
              if (type === 7) incoming.push(response(8, [0, 2, 0, 14, 0, 0, 4, 0, 1, 0, 0, 0, 17, 0, 0, 4, 0, 32, 0, 0]));
              if (type === 11 || type === 13) incoming.push(response(0xaa00, []));
              fragments = [];
            }
          }
          return { status: 'ok', bytesWritten: bytes.length };
        },
        transferIn: async () => {
          const bytes = incoming.shift(); if (!bytes) throw Error('Unexpected protocol read');
          return { status: 'ok', data: new DataView(bytes.buffer) };
        }
      };
      Object.defineProperty(navigator, 'usb', { value: { requestDevice: async () => {
        if (window.cancelPicker) throw new DOMException('Cancelled', 'NotFoundError');
        return device;
      }, addEventListener: () => {} }, configurable: true });
      window.sentPackets = sent;
    });
    await page.goto(pathToFileURL(path.resolve('index.html')).href);
    assert.match(await page.locator('#status').innerText(), /Ready in this browser/);
    await page.locator('#connect').click();
    await page.waitForFunction(() => document.querySelector('#connection').textContent.startsWith('Connected'));
    await page.locator('#files').setInputFiles([
      { name: 'demo.8xv', mimeType: 'application/octet-stream', buffer: fixture([{ name: 'DEMO', type: 21, data: Array.from({ length: 3000 }, (_, i) => i & 255) }]) },
      { name: '<script>.txt', mimeType: 'text/plain', buffer: Buffer.from('no') }
    ]);
    await page.waitForFunction(() => document.querySelectorAll('#list li').length === 2);
    assert.match(await page.locator('#list').innerText(), /Invalid/);
    await page.locator('#send').click();
    assert.match(await page.locator('#status').innerText(), /Check the box/);
    await page.locator('#consent').check();
    await page.locator('#destination').selectOption('archive');
    await page.locator('#send').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Transfer complete'));
    const packets = await page.evaluate(() => sentPackets);
    assert(packets.some(p => p[9] === 0 && p[10] === 11), 'actual DUSB request-to-send packet');
    assert(packets.some(p => p[9] === 0 && p[10] === 13), 'actual variable-content packet');
    assert(packets.some(p => p[9] === 221 && p[10] === 0), 'end of transmission');
    assert(packets.some(p => p[4] === 3), 'large variable uses fragmented raw packets');
    const rts = packets.find(p => p[9] === 0 && p[10] === 11).slice(11);
    const params = rts.slice(8 + rts[1]);
    // Request parameter list: count(2), then id(2), size(2), value(size).
    assert.deepEqual(params.slice(10, 15), [0, 3, 0, 1, 1], 'archive override reaches protocol');
    await page.screenshot({ path: '/tmp/ce-link-desktop.png', fullPage: true });
    await page.locator('#clear').click();
    await page.locator('#files').setInputFiles({ name: 'next.8xp', mimeType: 'application/octet-stream', buffer: fixture([{ name: 'NEXT', type: 6 }]) });
    await page.locator('#consent').check(); await page.evaluate(() => { window.failTransfer = true; });
    await page.locator('#send').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('Stopped'));
    assert.equal(await page.locator('#connection').innerText(), 'Not connected');
    assert.match(await page.locator('#list').innerText(), /Check calculator/);
    await page.evaluate(() => { window.failTransfer = false; });
    await page.locator('#clear').click();
    await page.locator('#connect').click();
    await page.waitForFunction(() => document.querySelector('#connection').textContent.startsWith('Connected'));
    await page.locator('#files').setInputFiles({ name: 'timeout.8xv', mimeType: 'application/octet-stream', buffer: fixture() });
    await page.locator('#consent').check();
    await page.evaluate(() => { window.fastTimeout = true; window.hangTransfer = true; });
    await page.locator('#send').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('timed out'));
    assert.equal(await page.locator('#connection').innerText(), 'Not connected');
    await page.evaluate(() => { window.hangTransfer = false; window.cancelPicker = true; });
    await page.locator('#connect').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('No calculator selected'));
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '/tmp/ce-link-mobile.png', fullPage: true });
    const noUSB = await context.newPage();
    await noUSB.addInitScript(() => Object.defineProperty(navigator, 'usb', { value: undefined, configurable: true }));
    await noUSB.goto(pathToFileURL(path.resolve('index.html')).href);
    assert(await noUSB.locator('#connect').isDisabled());
    assert.match(await noUSB.locator('#status').innerText(), /USB is unavailable/);
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    console.log('PASS: local file, USB handshake + DUSB send, invalid file, overwrite acknowledgement, interrupted transfer, cancelled picker, unsupported browser, mobile layout, no network requests.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
