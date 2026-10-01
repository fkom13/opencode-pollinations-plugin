# OpenCode V2 local compatibility shim

This directory is **not** a second Pollinations implementation.

It exists only for local testing with OpenCode 2.0.19 on PC2, where the local plugin-directory loader did not reliably choose `setup()` from the package's hybrid V1/V2 default export.

`index.js` re-exports `../../dist/v2.js`.

The published npm package does not include this directory. The package itself keeps the official OpenCode dual-version shape: V1 calls `server()`; V2 reads `id + setup()`.
