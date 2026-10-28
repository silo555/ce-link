const { test } = require('node:test');
const assert = require('node:assert/strict');
const Device = require('../vendor/ticalc-usb/dusb/device');
const { constructRawPacket } = require('../vendor/ticalc-usb/byte-mangling');
test('selects an unconfigured device and locates bulk endpoints across interfaces', async () => {
  let selected, claimed, alternate;
  const endpoints = [{ type: 'bulk', direction: 'in', endpointNumber: 3, packetSize: 64 },
    { type: 'bulk', direction: 'out', endpointNumber: 4, packetSize: 64 }];
  const usb = {
    configuration: null, open: async () => {},
    selectConfiguration: async n => { selected = n; usb.configuration = { interfaces: [
      { interfaceNumber: 0, alternates: [{ endpoints: [] }] },
      { interfaceNumber: 2, alternate: { alternateSetting: 0 }, alternates: [{ alternateSetting: 1, endpoints }] }
    ] }; },
    claimInterface: async n => { claimed = n; },
    selectAlternateInterface: async (n, a) => { alternate = [n, a]; },
    transferOut: async (endpoint, bytes) => { assert.equal(endpoint, 4); return { status: 'ok', bytesWritten: bytes.length }; },
    transferIn: async endpoint => {
      assert.equal(endpoint, 3);
      const bytes = constructRawPacket({ type: 2, data: [0, 0, 4, 0] });
      const padded = new Uint8Array(bytes.length + 10); padded.set(bytes, 5);
      return { status: 'ok', data: new DataView(padded.buffer, 5, bytes.length) };
    }
  };
  const device = new Device(usb); await device.connect();
  assert.equal(selected, 1); assert.equal(claimed, 2); assert.deepEqual(alternate, [2, 1]);
  assert.equal(device._bufferSize, 1024);
});
test('rejects failed and partial USB writes', async () => {
  const device = new Device({ transferOut: async () => ({ status: 'stall', bytesWritten: 0 }) });
  device._outEndpoint = { endpointNumber: 1 };
  await assert.rejects(device._send(new Uint8Array(10)), /write failed/);
});
