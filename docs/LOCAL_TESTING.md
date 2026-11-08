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

## Verified OpenCode V2.2.5 pairing and model loading (2026-11-06)

The local V2 adapter was exercised with the real OpenCode **2.2.5** CLI inside a separate XDG/HOME test environment. No system-wide OpenCode settings or V1 credentials were modified.

- **Before pairing:** a keyless registry exposes **13 tools** (including `polli_login`), while decision, 3D and managed-agent paid tools remain gated.
- **Existing-key pairing:** `/poll connect` was executed against the real Pollinations account API in the isolated test environment. It verified the key, saved it to private files (`0600`), returned a redacted response and expanded the registry to **25 tools**.
- **Authenticated V2 startup:** the actual `opencode v2.2.5 --standalone models` command completed with exit code **0**, listing **177 Pollinations models** for the tested account. Model counts depend on the account, permissions and upstream catalog.
- **Device-code pairing:** Pollinations `/api/device/code` returned HTTP **200**, a user code, a device code and a verification URL. Its advertised lifetime was **1,800 seconds (30 minutes)**. The background poller now honors the provider's expiry instead of stopping after five minutes. Final consent and token exchange still require a human to approve in the browser; do not substitute mocked consent for that acceptance test.
- **Language coverage:** the English, French, Spanish, German, Italian and Chinese locales share the same command keys; the i18n parity and UX vocabulary tests pass.
- **Isolation:** do not copy production API keys into prompts, CLI arguments, CI artifacts, or documentation. When validating an existing key, keep all OpenCode config/auth paths inside the dedicated test environment and remove its credentials after validation.

An intermittent `Location plugins did not finish activating` was observed during some instantaneous, isolated CLI startups; subsequent runs completed normally. Validate against an actual running OpenCode session and don't interpret a single startup timeout as a failed Pollinations account authorization.

## V1 + V2 release acceptance, 2026-11-07

See `docs/RELEASE_CANDIDATE_V7_QA_20261107.md` for the full audited test matrix,
remaining provider limitations and exact V1/V2 versions. The live V1.19.5 TUI
runs the **local `dist/index.js`** and renders `/poll help` and `/poll pricing`
completely. OpenCode V2.2.5 TUI runs the **same build** through the local V2
adapter; `/poll help` is paginated and very large output (models, pricing,
quests) is available from private 0600 files under the isolated XDG state.

All six READMEs and locale help strings document `/poll status` as an alias of
`/poll usage`. All user keys remain outside the package. The release candidate
has not been published or merged, and new paid media calls were not made during
these tests.

## Release checks

Before publishing:

```bash
npm run prepublishOnly
npm pack --dry-run
```

Verify both host generations separately. Never infer V2 compatibility only from V1 tests, and never point V1 at V2-native configuration.
