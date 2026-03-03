# TODO: encore-inertia pre-publish checklist

## Before publishing

1. [ ] Add package.json metadata (`repository`, `keywords`, `author`, `homepage`, `bugs`, `engines`)
2. [ ] Add LICENSE file (MPL-2.0) to `packages/encore-inertia/`
3. [ ] Add `prepublishOnly` script to package.json (e.g. `"prepublishOnly": "npm run build"`)
4. [ ] Commit uncommitted changes (render API now accepts React components instead of strings) and rebuild dist

## Future improvements

5. [ ] Add CJS build output (currently ESM-only)
6. [ ] Enable source maps in tsup.config.ts
7. [ ] Cache Vite manifest reads in `getAssetTags()` (currently re-reads from disk on every call)
8. [ ] Consider adding `encore.dev` as a peer dependency
9. [ ] Implement shared data / global props support (Inertia protocol feature)
10. [ ] Implement partial reloads (`X-Inertia-Partial-Data` / `X-Inertia-Partial-Component`)
11. [ ] Handle `X-Inertia-Location` external redirects (409 Conflict response)
