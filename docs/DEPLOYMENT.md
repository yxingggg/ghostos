# GhostOS — Deployment

GhostOS is a fully static single-page app. The production build in `dist/` can be hosted
on any static host. The repository is configured for **GitHub Pages** at a `/ghostos/`
sub-path.

## Live deployment

- **URL:** https://yxingggg.github.io/ghostos/
- **Source:** GitHub Actions (Settings → Pages → Build and deployment → Source).
- **Workflow:** [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

### Pipeline

The deploy workflow has three dependent jobs; deployment only proceeds after the quality
checks pass:

1. **quality** — `npm ci`, then `typecheck`, `lint`, `test`.
2. **build** — `npm run build` with `GHOSTOS_BASE=/ghostos/`, then uploads `dist/` as the
   Pages artifact.
3. **deploy** — publishes the artifact with `actions/deploy-pages`.

## Verification status

Verified via the GitHub API on commit `8990bf4` (deploy run `45956462745`):

- All three deploy jobs completed **success** (quality ✅, build ✅, deploy ✅).
- The `github-pages` deployment record reports `state: success` with
  `environment_url: https://yxingggg.github.io/ghostos/`.
- The deployed artifact was inspected and is correct for the sub-path:
  - `index.html` references are all under `/ghostos/` — JS, CSS, `favicon.svg`,
    `manifest.webmanifest`, and `registerSW.js`.
  - `manifest.webmanifest` has `start_url` and `scope` = `/ghostos/`.
  - The service worker registers at `/ghostos/sw.js` with scope `/ghostos/` and precaches
    `/ghostos/index.html` as the navigation fallback (offline support).

**Not yet verified:** the live site's in-browser behavior (HTTP 200 render, absence of
console errors, runtime IndexedDB persistence, and offline operation) was **not** tested,
because the authoring environment has no outbound access to `github.io` and no browser
testing tool could reach it. Confirm these manually in a browser.

### Manual confirmation checklist

Open https://yxingggg.github.io/ghostos/ and verify:

- [ ] The page returns HTTP 200 and the boot sequence runs, then the desktop appears.
- [ ] No errors in the browser console; the service worker registers (Application → Service
      Workers).
- [ ] Desktop icons, start menu, and taskbar render; windows open, drag, resize, minimize,
      maximize, and close.
- [ ] GraveNotes, Tomb Explorer, Phantom Terminal, Calculator, and DeadWave work; notes and
      files persist across a reload (IndexedDB).
- [ ] After the first load, disabling the network still serves the app (offline via the
      service worker).

## Deploying elsewhere

For a root-path host (Netlify, Vercel, static S3, etc.), build without the sub-path:

```bash
npm ci
npm run build          # GHOSTOS_BASE defaults to "/"
# deploy the dist/ directory
```

`GHOSTOS_BASE` controls the base path and the PWA manifest/service-worker scope, so set it
to match wherever the app is served from.
