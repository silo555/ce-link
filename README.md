# CE Link

A small, offline HTML tool for sending programs and AppVars to a **TI-84 Plus CE** over USB. No app installation, account, API key, server, or internet connection is needed after downloading the file.

**Experimental:** browser and simulated USB tests pass. A real calculator transfer has **not** been verified for this build.

## Use it

1. [Download **CE-Link.html**](https://github.com/silo555/ce-link/releases/latest/download/CE-Link.html). Save it as an HTML file, then open it in desktop **Chrome or Edge**.
2. Turn on your TI-84 Plus CE, go to the home screen, and connect a **USB data cable**. Close TI Connect and any other calculator tabs.
3. Click **Connect calculator**, select your calculator, and grant USB permission.
4. Choose or drop your `.8xp`, `.8xv`, or `.8xg` files. Extract ZIP downloads first.
5. Choose the original memory setting, RAM, or archive. Read the replacement notice, check the box, and click **Send files**.

You can also download `index.html` from this repository using GitHub's **Download raw file** button. That file is the complete app; the source folders are only for development.

**Online fallback:** https://silo555.github.io/ce-link/

## School computers and compatibility

- An HTML file cannot override school USB restrictions. A managed browser may block the device picker or deny permission.
- Downloaded `file://` pages can use WebUSB in compatible Chrome/Edge configurations. If USB is unavailable locally, try the HTTPS link above. Browser or school policy may still block it.
- **Windows may require a WinUSB driver already associated with the calculator.** This HTML file cannot install drivers. If driver installation is prohibited and the required driver is absent, the tool cannot connect; ask school IT.
- ChromeOS and macOS do not normally need a separate WinUSB driver, but USB permission and device availability still matter. Linux can require USB device permissions.
- Firefox and Safari do not provide native WebUSB. Use a browser that exposes `navigator.usb` in a secure context.
- An empty picker often means the cable only charges, the calculator is off, or USB is blocked. A failure opening the device can also mean TI Connect has claimed it.
- This build only accepts devices identified as TI-84 Plus CE family devices; it does not support the monochrome TI-84 Plus or TI-Nspire.

These restrictions follow the [WebUSB platform requirements](https://developer.chrome.com/docs/capabilities/build-for-webusb) and [WebUSB API documentation](https://developer.chrome.com/docs/capabilities/usb).

## Supported files

| File | Support |
| --- | --- |
| `.8xp` | Programs, including protected programs |
| `.8xv` | AppVars, including compatible note files |
| `.8xg` | Groups containing only programs and AppVars |
| `.8ek`, `.8eu`, `.8xk` | Flash apps and operating systems are not supported |
| `.txt`, `.py`, `.zip`, other variable types | Convert or extract first; not accepted directly |

Names must use ASCII letters and digits, begin with a letter, and have at most eight characters. Files with unsupported entries or malformed headers, lengths, or checksums are rejected before any of their entries are sent. Maximum queue: 100 files.

Sending a variable with a matching name and type may replace the existing copy. Keep backups. File transfer does not make a program compatible with your calculator OS or install any required launcher or libraries. This tool does not run the program after sending it.

If a transfer fails or times out, the queue stops and the connection closes. A file or group may have transferred partly. Inspect the calculator before retrying. Completed items remain marked **Sent**; clear and re-add an uncertain item to send it again. Progress counts complete files, not bytes.

## Privacy

All file parsing and transfers happen locally. The app makes no network requests and uses no analytics, cookies, cloud uploads, API keys, remote scripts, fonts, or CDNs. Its content security policy blocks network connections. Help/source links open remote websites only if you click them. The HTTPS version is served by GitHub Pages; GitHub receives the normal page request.

Only application source, the standalone HTML, synthetic tests, documentation, and licensed protocol source are published. There are no agent instructions, skills, personal calculator exports, or credentials in the repository.

## Development

Node.js 20 or newer. The app and build have no package dependencies.

```sh
node tools/build.js
node --test tests/*.test.js
```

The build reads `src/page.html`, `src/app.js`, `src/files.js`, and the vendored protocol library, then writes `index.html`. License and attribution text are embedded in the HTML. Commit the rebuilt HTML with source changes.

Optional browser tests use Playwright (development only):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.cjs
```

Or use an existing Chrome installation: `BROWSER_CHANNEL=chrome node tests/browser.cjs`.

Tests cover container validation, interface selection, USB write failures, opening the actual app through `file://`, a simulated DUSB handshake and fragmented transfer, archive override, invalid-file handling, replacement acknowledgement, interrupted transfers, timeout recovery, picker cancellation, unsupported browsers, responsive layout, and absence of network requests. Simulated USB tests do not prove physical calculator compatibility.

Protocol source: [ticalc-usb](https://github.com/Timendus/ticalc-usb), pinned to revision `862541183cd2004813c432dea7a4f7b9501fe9c2`. See [THIRD_PARTY.md](THIRD_PARTY.md) for provenance and modifications.

## License

[GPL-3.0-or-later](LICENSE). No warranty. Independent project; not affiliated with Texas Instruments.

## Hosting

CE Link is already hosted free at https://silo555.github.io/ce-link/ using GitHub Pages. It needs no backend or paid hosting. A custom domain is optional. See [HOSTING.md](HOSTING.md) for dated domain-price comparisons and free-hosting details.
