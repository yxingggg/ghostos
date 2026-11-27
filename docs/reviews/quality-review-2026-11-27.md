# GhostOS full-tree review — strict TS, architecture, persistence

GhostOS is a browser-only retro desktop (React 18 + TS strict + Zustand + IndexedDB) with a clean three-layer split: pure Core (`src/core`), Zustand State (`src/state`), and React UI/apps. The code is well-structured and the layering rules are respected almost everywhere — Core is genuinely framework-free, fallible VFS ops return `Result<T>` instead of throwing, and shell chrome (Desktop/Taskbar/StartMenu/WindowFrame) is app-agnostic, driven entirely by the registry. The review was by static inspection only (no install/build/test in the sandbox), so compile-error calls are reasoned from the enabled strict flags rather than observed from `tsc`.

Watch for: the two verification scripts don't actually verify anything — `npm run typecheck` (`tsc --noEmit`) type-checks zero files because the root tsconfig is a solution file with `files: []` (confirmed), and `npm run lint` (`eslint .`) skips every `.ts`/`.tsx` file because no `--ext` is passed to ESLint 8 (likely). A persisted `wm-layout` slice is declared but never written or read, so window layout never survives reload (confirmed). The music Visualizer is wired to a stale/`null` audio element and will not react to the real `<audio>` node (likely).

**Verdict**: NEEDS_CHANGES

## High-level view

The gating story is the biggest risk. CI runs `typecheck`, `lint`, `test`, `build` in sequence, but `typecheck` and `lint` are mis-wired: `tsc --noEmit` against a `references`-only root config checks nothing, and `eslint .` under ESLint 8 legacy config lints only `.js`-like files. Only `tsc -b` inside `build` actually type-checks `src`, so strict regressions can pass `typecheck`/`lint` and only surface at build. This doesn't make the code wrong, but it means the "zero errors before done" guarantee in the TypeScript steering isn't being enforced by the named script.

The Core and State layers hold up well under the strict flags. `noUncheckedIndexedAccess` is handled deliberately throughout (guards in the WM reducer's minimize loop, `filter`-based narrowing in `windowsInOrder`, `as number` at the base64 byte boundary). Discriminated unions are exhaustive with `never` default branches in the WM reducer and calculator engine. I found no clear hard compile errors in production code under the stated flags.

Persistence has one real functional gap and a couple of edge cases. The `wm-layout` slice name exists in the `SliceName` union but nothing in the codebase ever saves or loads it, so the window manager starts empty on every boot despite the plumbing implying otherwise. The export/import base64 path has a latent bug for blobs with an empty MIME type, and `importAll` writes arbitrary KV keys through a `SliceName`-typed cast.

The UI layer is sound except for the DeadWave visualizer, which is passed `audioRef.current` as a prop — `null` on first render and never updated when the `<audio>` element mounts later, so the analyser never binds to real audio.

<details>
<summary>Issues (9)</summary>

1. **typecheck script checks nothing** — `npm run typecheck` is `tsc --noEmit` against the root solution config (`files: []`, no `include`); it type-checks zero files. Point it at the app project (`tsc -b --noEmit` or `tsc -p tsconfig.app.json --noEmit`) so strict errors are actually caught.
2. **lint script skips TS files** — `eslint .` under ESLint 8 legacy config lints only `.js`-like files; `.ts`/`.tsx` need `--ext .ts,.tsx` (or a flat config). As written, `npm run lint` passes without inspecting any source.
3. **wm-layout never persisted** — the `'wm-layout'` slice is declared in `SliceName` but never written or read; `wmStore` has no hydrate/persist and `App.tsx` never hydrates it. Either wire save/restore of window layout or drop the dead slice name.
4. **Visualizer bound to stale audio element** — `MusicApp` passes `audioEl={audioRef.current}`, which is `null` on first render (the `<audio>` only mounts once `url` is set) and never re-passed; the analyser graph never attaches. Lift the element into state or pass a ref/callback so the visualizer sees the mounted node.
5. **Base64 blob round-trip breaks on empty MIME** — `serializeContent` emits `blob::<b64>` when `value.type` is `''`; `deserializeContent` then splits on the first `:` and consumes the leading base64 char as the type. Length-prefix or JSON-encode the MIME instead of delimiter-splitting.
6. **importAll casts arbitrary keys to SliceName** — `saveSlice(k as SliceName, v)` launders untrusted backup keys through a narrow type. Validate keys against the known set before import.
7. **Settings hydrate can resurrect a stale assistant key** — `{ ...defaultSettings, ...stored }` shallow-merges; a persisted `assistant` object fully replaces the default, so a saved `apiKey`/`endpoint` with `enabled:false` survives silently. Confirm that's intended or deep-merge `assistant`.
8. **AssistantApp sends full history including API key header to a user URL** — expected for an opt-in feature, but there's no endpoint-scheme check (allows `http://`) and the key goes out as a Bearer header on every request. Consider requiring HTTPS and documenting the exfiltration surface.
9. **Calculator window keydown listener leaks across focus** — the `keydown` handler is on `window`, guarded by `focusedId === windowId`; multiple calculator windows each add a listener and all dispatch when focused. Works, but scope the listener to the window element to avoid cross-window keystroke handling.

</details>

<details>
<summary>Details</summary>

### The verification scripts don't verify (gating gap)

`package.json` wires `typecheck` to `tsc --noEmit` and `lint` to `eslint .`. Both run green regardless of the source.

`tsc --noEmit` uses the config it's pointed at (root `tsconfig.json` by default). That root config is a solution file:

```jsonc
// tsconfig.json
{ "files": [], "references": [ { "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" } ] }
```

`--noEmit` (unlike `-b`) does not follow project `references`; it compiles the `files`/`include` of the named project, which here is the empty set. So `npm run typecheck` reports zero errors by checking zero files (confirmed from config; TypeScript's `references` are only traversed in build mode). The real type-check happens only inside `build` via `tsc -b && vite build`. The TypeScript steering requires `typecheck` to pass with zero errors "before a task is considered done" — right now that gate is vacuous. Fix by pointing the script at the app project, e.g. `tsc -b --noEmit` or `tsc -p tsconfig.app.json --noEmit`.

`eslint .` under ESLint 8 with a legacy `.eslintrc.cjs` lints only files with default extensions (`.js`, and `.cjs`/`.mjs`), and `.cjs` is additionally in `ignorePatterns`. TypeScript files are not linted unless `--ext .ts,.tsx` is passed or a flat config with explicit globs is used (likely — standard ESLint 8 behavior, not verified against an install). The configured rules (`no-explicit-any: error`, `no-unused-vars`, the react-hooks rules) therefore never run against `src`. CI's "Lint" step passes without catching anything.

### wm-layout: declared, never used

`persist.ts` declares the slice union:

```ts
export type SliceName = 'settings' | 'notes' | 'vfs' | 'music' | 'wm-layout';
```

A workspace-wide search finds `'wm-layout'` only in that declaration. `wmStore.ts` exposes no `hydrate` and never calls `saveSlice`; `App.tsx` hydrates settings, vfs, notes, and music but not the WM. The window manager always starts from `createInitialState()`, so open windows and their bounds are lost on every reload even though the slice name advertises otherwise. Either implement save/restore (serialize `WmState`, hydrate it alongside the others, and re-emit `SET_DESKTOP` to re-clamp to the current viewport) or remove the unused slice name to avoid implying a feature that isn't there.

### Visualizer never binds to the audio element

`MusicApp` renders the `<audio>` element conditionally and passes the ref's current value as a prop:

```tsx
<Visualizer audioEl={audioRef.current} playing={playing} />
// ...
{url && ( <audio ref={audioRef} src={url} .../> )}
```

On first render `audioRef.current` is `null`, and the `<audio>` node only mounts after `getTrackUrl` resolves and sets `url`. Because `audioEl` is read as a render-time value (not a ref forwarded into the child), the child's effect dep `[audioEl, playing]` keeps the `null` captured from the render where it was computed; the element that later mounts is never passed down, so `getGraph` is never called with a real node and the analyser stays unbound. The spectrum renders the flat `0.04` baseline regardless of playback. Lifting the element into state (`const [el, setEl] = useState<HTMLAudioElement|null>(null)` with `ref={setEl}`) or passing the ref object and reading `.current` inside the child's effect would fix the binding.

### Base64 export/import edge cases

`serializeContent`/`deserializeContent` encode content blobs as tagged strings for JSON export. The blob branch concatenates the MIME type with `:` delimiters:

```ts
if (value instanceof Blob) return `blob:${value.type}:${bufferToBase64(buf)}`;
// ...
const rest = value.slice(5);
const sep = rest.indexOf(':');
const type = rest.slice(0, sep);
const buf = base64ToBuffer(rest.slice(sep + 1));
```

When `value.type` is `''` (common for `File`/`Blob` with unknown type — and audio imports go through `addTrack` where `blob.type` can be empty), the encoded form is `blob::<base64>`. On import, `rest` is `:<base64>`, `indexOf(':')` returns `0`, `type` is `''` (fine), but `rest.slice(1)` drops the first real base64 character, corrupting the decoded buffer. A length-prefixed or JSON-structured encoding of the MIME avoids the delimiter collision.

`importAll` also widens arbitrary backup keys to a domain type: `await saveSlice(k as SliceName, v)` iterates `Object.entries(data.kv)` where keys come from an untrusted imported file. The cast silences the type system without validating that `k` is a real slice. A membership check against the known slice set before writing keeps the KV store from accumulating junk keys from a malformed or hostile backup.

### Settings hydrate replaces the assistant sub-object wholesale

`settingsStore.hydrate` merges `{ ...defaultSettings, ...stored }`. The merge is shallow, so a stored `assistant` object replaces the default entirely. A backup written while the assistant was configured (endpoint, model, apiKey) but later disabled will restore those credentials into memory even with `enabled:false`. That may be intended (round-tripping the user's config), but combined with the import path it means importing someone else's backup silently loads their endpoint/key. Worth a deliberate decision: deep-merge `assistant`, or strip credentials when `enabled` is false.

### Assistant network posture (opt-in, but unguarded scheme)

The AI assistant is correctly gated — disabled by default, no request without an explicit endpoint, failures shown inline, and the offline-first rule is otherwise honored (sound and visualizer are synthesized, no bundled network assets). Two observations on the request itself: the endpoint is used verbatim with no scheme validation, so a plain `http://` endpoint sends the `Authorization: Bearer <apiKey>` header in cleartext; and the full chat history is posted to whatever URL the user set. Both are inherent to a user-configured endpoint, but requiring HTTPS and surfacing "your messages and key are sent to this URL" near the endpoint field would match the care the rest of the feature takes.

### Strict-mode correctness: no hard compile error found

The suspect `noUncheckedIndexedAccess` spots are narrowed, not asserted away: the WM minimize loop guards `const id` before indexing `windows[id]`, `windowsInOrder` narrows with a `filter` type guard, `Desktop`/`Taskbar` guard each `windows[id]`, terminal `tokenize` falls back with `?? ''`, and the base64 loop casts `bytes[i] as number`. `wmReducer`, `calcReduce`, and `apply` each close with a `const _never: never` exhaustiveness branch. With `exactOptionalPropertyTypes:false`, the `delete updated.prevBounds` and the `...(cond ? {k:v} : {})` optional spreads are legal. I found no clear hard compile error in `src/core`, `src/state`, `src/ui`, or `src/apps` under the stated flags. The only `any` in production is in `useCallbackRef`, carried with justifying eslint-disable comments; the rest are in test files where the rule is off.

</details>

<details>
<summary>File map</summary>

- `package.json` — `typecheck`/`lint` scripts mis-target (checks nothing / skips TS).
- `tsconfig.json` — solution config (`files: []`); cause of the empty `--noEmit` check.
- `.eslintrc.cjs` — legacy config; `eslint .` needs `--ext` for TS.
- `src/state/persist.ts` — `wm-layout` declared but unused; blob/empty-MIME base64 edge; `importAll` key cast.
- `src/state/wmStore.ts` — no hydrate/persist; window layout not saved.
- `src/state/settingsStore.ts` — shallow merge replaces `assistant` sub-object on hydrate.
- `src/apps/music/MusicApp.tsx` — passes stale `audioRef.current` to `Visualizer`.
- `src/apps/music/Visualizer.tsx` — never receives the mounted audio element.
- `src/apps/assistant/AssistantApp.tsx` — opt-in network; no HTTPS enforcement on endpoint.
- `src/apps/calculator/CalculatorApp.tsx` — window-scoped keydown attached to `window`.
- `src/core/**` — pure, framework-free, exhaustive unions; no compile errors found.

Full tree reviewed; no git diff (working tree as implemented).

</details>
