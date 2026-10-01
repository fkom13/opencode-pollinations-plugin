# Local testing — OpenCode V1 + V2

## Single source of truth

There is **one** development repository:

```text
opencode-pollinations-plugin/
```

Both OpenCode generations are built from the same source tree and the same `npm run build`.

```bash
cd /absolute/path/to/opencode-pollinations-plugin
npm install
npm run build
```

Build outputs:

```text
dist/index.js   # package/root dual-stack entrypoint; V1 server() lives here
dist/v2.js      # native V2 implementation used by the local V2 compatibility shim
```

## How the published package selects V1 vs V2

The package default export follows OpenCode's official dual-version contract:

```text
default export
├─ server()  -> OpenCode V1
├─ id        -> OpenCode V2
└─ setup()   -> OpenCode V2
```

OpenCode V1 calls `server()`. OpenCode V2 reads `id + setup()` and ignores `server()`.
This is the architecture used by the published `opencode-pollinations-plugin`; there are not two npm packages.

The V1 and V2 implementations share the same Model Registry, Tool Registry, Pollinations config, Cost Guard and feature code.

## Test locally with OpenCode V1

For an explicit local-build test, point V1 directly at the built entrypoint:

```json
{
  "plugin": [
    "/absolute/path/to/opencode-pollinations-plugin/dist/index.js"
  ]
}
```

Then restart OpenCode V1.

The repository root and `dist/` directory are also resolvable by current V1, but `dist/index.js` is the documented development form because it makes the tested build explicit.

For a normal npm installation, keep:

```json
{
  "plugin": [
    "opencode-pollinations-plugin@latest"
  ]
}
```

## Test locally with OpenCode V2

### OpenCode 2.0.19 compatibility path used on PC2

OpenCode 2.0.19's local-directory loader does not reliably select `setup()` from the hybrid package root in our test environment. For that version only, use the small local adapter included **inside this repository**:

```json
{
  "plugins": [
    "/absolute/path/to/opencode-pollinations-plugin/dev/opencode-v2-local"
  ]
}
```

The adapter contains no Pollinations implementation. It only exports:

```js
export { PollinationsV2 as default } from '../../dist/v2.js';
```

It therefore always tests the current `dist/v2.js` produced by the same repository build.

The adapter is development-only and is excluded from the npm package.

### Published/current V2 contract

The published package keeps the hybrid default export described above. OpenCode V2 is expected to select `setup()` from that package according to the official OpenCode V1/V2 plugin contract.

Do not create a second Pollinations plugin package and do not maintain a second source repository for V2.

## PC2 canonical paths

Canonical repository:

```text
/home/fkomp/Desktop/oracle/opencode-pollinations-plugin/
```

V1 explicit local entrypoint:

```text
/home/fkomp/Desktop/oracle/opencode-pollinations-plugin/dist/index.js
```

V2.0.19 local compatibility adapter:

```text
/home/fkomp/Desktop/oracle/opencode-pollinations-plugin/dev/opencode-v2-local/
```

## Release checks

Before publishing:

```bash
npm run prepublishOnly
npm pack --dry-run
```

Verify both host generations separately. Never infer V2 compatibility only from V1 tests, and never point V1 at V2-native configuration.
