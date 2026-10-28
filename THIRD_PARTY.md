# Third-party notices

CE Link is licensed under GPL-3.0-or-later. Copyright (C) 2026 CE Link contributors.
It is distributed without warranty; see LICENSE.

This project includes code from **ticalc-usb** by Timendus and its contributors:
https://github.com/Timendus/ticalc-usb

- Source revision: `862541183cd2004813c432dea7a4f7b9501fe9c2`
- License: GPL-3.0-or-later (full text in LICENSE and embedded in index.html)
- Included source: `vendor/ticalc-usb/byte-mangling.js` and
  `vendor/ticalc-usb/dusb/{device,magic-values,ti84series,ez80series}.js`
- Changes made 2026-10-28: handle devices without an active USB configuration;
  find bulk endpoints and select the corresponding alternate interface; reject
  invalid negotiated buffer sizes and incomplete/failed writes; respect DataView
  byte offsets and lengths. The other included files are unchanged.
- The library describes its DUSB protocol implementation as inspired by TiLP's
  tilibs: https://github.com/debrouxl/tilibs

All corresponding application and bundled library source is provided in this
repository. `node tools/build.js` reconstructs the standalone HTML without
third-party build tools. No calculator ROMs, firmware, private calculator data,
or Texas Instruments proprietary software are included.
