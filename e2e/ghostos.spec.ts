import { test, expect, type Page } from '@playwright/test';

// End-to-end coverage of the functionality that manual testing flagged. These
// run against the real production build in Chromium.

async function boot(page: Page): Promise<void> {
  await page.goto('/');
  // The boot sequence runs, then the desktop appears. Wait for a desktop icon.
  await expect(page.getByRole('grid', { name: /desktop icons/i })).toBeVisible({ timeout: 20_000 });
  // On first launch a welcome modal overlays the desktop; dismiss it so the
  // rest of the flow can interact with the desktop. (The visual test opts out.)
  const welcome = page.getByRole('dialog', { name: /welcome to ghostos/i });
  if (await welcome.count()) {
    await welcome.getByRole('button', { name: /enter ghostos/i }).click();
    await expect(welcome).toBeHidden();
  }
}

async function launch(page: Page, appName: string): Promise<void> {
  const grid = page.getByRole('grid', { name: /desktop icons/i });
  await grid.getByRole('gridcell', { name: appName }).dblclick();
  await expect(page.getByRole('dialog', { name: new RegExp(appName, 'i') }).first()).toBeVisible();
}

test('create a text file in Tomb Explorer, open, edit, save, reopen, and persist', async ({
  page,
}) => {
  await boot(page);
  await launch(page, 'Tomb Explorer');

  const explorer = page.getByRole('dialog', { name: /tomb explorer/i });
  await explorer.getByRole('button', { name: 'New File' }).click();
  const fileCell = explorer.getByRole('button', { name: 'untitled.txt' });
  await expect(fileCell).toBeVisible();

  // Open the file into GraveNotes.
  await fileCell.dblclick();
  const editor = page.getByRole('dialog', { name: /gravenotes/i }).first();
  await expect(editor).toBeVisible();
  const area = editor.getByLabel(/contents of untitled.txt/i);
  await area.fill('haunted words');
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor.getByText('Saved')).toBeVisible();

  // Reload the browser — content must persist via IndexedDB.
  await page.reload();
  await expect(page.getByRole('grid', { name: /desktop icons/i })).toBeVisible({ timeout: 20_000 });
  await launch(page, 'Tomb Explorer');
  const explorer2 = page.getByRole('dialog', { name: /tomb explorer/i });
  await explorer2.getByRole('button', { name: 'untitled.txt' }).dblclick();
  const editor2 = page.getByRole('dialog', { name: /gravenotes/i }).first();
  await expect(editor2.getByLabel(/contents of untitled.txt/i)).toHaveValue('haunted words');
});

test('GraveNotes new document saved via Save As appears in Tomb Explorer', async ({ page }) => {
  await boot(page);
  await launch(page, 'GraveNotes');
  const notes = page.getByRole('dialog', { name: /gravenotes/i }).first();
  await notes.getByLabel(/document contents/i).fill('hello from gravenotes');
  await notes.getByRole('button', { name: 'File' }).click();
  await notes.getByRole('menuitem', { name: /save as/i }).click();

  const dialog = page.getByRole('dialog', { name: /save as/i });
  await dialog.getByLabel('File name').fill('hello');
  await dialog.getByRole('button', { name: 'Save' }).click();
  // The editor binds to the saved file; its textarea is now labelled by the name.
  await expect(notes.getByLabel(/contents of hello.txt/i)).toBeVisible();

  // Confirm it shows up in Tomb Explorer under home/documents (the Save As
  // default destination for the seeded filesystem).
  await launch(page, 'Tomb Explorer');
  const explorer = page.getByRole('dialog', { name: /tomb explorer/i });
  await explorer.getByRole('button', { name: 'home', exact: true }).first().dblclick();
  await explorer.getByRole('button', { name: 'documents', exact: true }).first().dblclick();
  await expect(explorer.getByRole('button', { name: 'hello.txt' })).toBeVisible({ timeout: 10_000 });
});

test('resizing Tomb Explorer keeps toolbar controls reachable (no clipping)', async ({ page }) => {
  await boot(page);
  await launch(page, 'Tomb Explorer');
  const explorer = page.getByRole('dialog', { name: /tomb explorer/i });

  // Shrink the window by dragging its lower-right resize handle far left/up.
  const box = await explorer.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 260, box.y + 220, { steps: 10 });
    await page.mouse.up();
  }

  // Either the primary buttons are visible, or a "More actions" overflow exists.
  const newFolder = explorer.getByRole('button', { name: 'New Folder' });
  const more = explorer.getByRole('button', { name: /more actions/i });
  await expect((await newFolder.count()) > 0 || (await more.count()) > 0).toBeTruthy();

  // Every visible toolbar control must sit within the window's bounds.
  const frame = await explorer.boundingBox();
  for (const btn of await explorer.getByRole('button').all()) {
    const b = await btn.boundingBox();
    if (b && frame) {
      expect(b.x).toBeGreaterThanOrEqual(frame.x - 1);
      expect(b.x + b.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
    }
  }
});

test('DeadWave plays an original demo track after a click', async ({ page }) => {
  await boot(page);
  await launch(page, 'DeadWave');
  const dw = page.getByRole('dialog', { name: /deadwave/i });
  await dw.getByRole('button', { name: /midnight transmission/i }).first().click();
  // The track becomes current (its name shows in the header) and playback starts.
  await expect(dw.getByText('Midnight Transmission').first()).toBeVisible();
  await expect(dw.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 10_000 });
});

test('Offline Spirit answers without any credentials', async ({ page }) => {
  await boot(page);
  await launch(page, 'Spirit Assistant');
  const assistant = page.getByRole('dialog', { name: /spirit assistant/i });
  await assistant.getByRole('button', { name: /what terminal commands/i }).click();
  await expect(assistant.getByText(/mkdir/i)).toBeVisible();
});

// --- Regression tests for the three reported bugs ---

/** Build a small valid mono 16-bit WAV (a short sine tone) as a Node Buffer. */
function makeWav(seconds = 1, freq = 220, sampleRate = 8000): Buffer {
  const n = Math.floor(seconds * sampleRate);
  const data = Buffer.alloc(44 + n * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const s = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.3;
    data.writeInt16LE(Math.round(s * 0x7fff), 44 + i * 2);
  }
  return data;
}

test('Bug 1: an imported local audio file actually plays (currentTime advances)', async ({
  page,
}) => {
  await boot(page);
  await launch(page, 'DeadWave');
  const dw = page.getByRole('dialog', { name: /deadwave/i });

  // Import a real local WAV via the hidden file input (the Import button triggers it).
  const chooser = page.waitForEvent('filechooser');
  await dw.getByRole('button', { name: /import audio/i }).click();
  const fc = await chooser;
  await fc.setFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav(2, 330) });

  // It appears in the playlist; start playback.
  const track = dw.getByRole('button', { name: /tone\.wav/i }).first();
  await expect(track).toBeVisible();
  await track.click();
  await expect(dw.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 10_000 });

  // Verify REAL playback: currentTime advances, element is playing, and crucially
  // it is NOT muted (the root cause was the music element being muted by default).
  const audio = dw.locator('audio');
  await expect(audio).toHaveCount(1);
  const state0 = await audio.evaluate((el) => {
    const a = el as HTMLAudioElement;
    return { t: a.currentTime, muted: a.muted, volume: a.volume, paused: a.paused };
  });
  expect(state0.muted).toBe(false);
  expect(state0.volume).toBeGreaterThan(0);
  await page.waitForTimeout(1200);
  const t1 = await audio.evaluate((el) => (el as HTMLAudioElement).currentTime);
  expect(t1).toBeGreaterThan(state0.t);
  const paused = await audio.evaluate((el) => (el as HTMLAudioElement).paused);
  expect(paused).toBe(false);
});

test('Bug 1b: a demo track plays unmuted with advancing time', async ({ page }) => {
  await boot(page);
  await launch(page, 'DeadWave');
  const dw = page.getByRole('dialog', { name: /deadwave/i });
  await dw.getByRole('button', { name: /midnight transmission/i }).first().click();
  await expect(dw.getByRole('button', { name: 'Pause' })).toBeVisible({ timeout: 10_000 });
  const audio = dw.locator('audio');
  const s0 = await audio.evaluate((el) => {
    const a = el as HTMLAudioElement;
    return { t: a.currentTime, muted: a.muted };
  });
  expect(s0.muted).toBe(false);
  await page.waitForTimeout(1000);
  const t1 = await audio.evaluate((el) => (el as HTMLAudioElement).currentTime);
  expect(t1).toBeGreaterThan(s0.t);
});

test('Bug 2: DeadWave controls stay reachable when the window is small', async ({ page }) => {
  await boot(page);
  await launch(page, 'DeadWave');
  const dw = page.getByRole('dialog', { name: /deadwave/i });

  const box = await dw.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 280, box.y + 240, { steps: 10 });
    await page.mouse.up();
  }

  const frame = await dw.boundingBox();
  // The Play and Import controls remain within the window bounds (not clipped).
  for (const name of [/play|pause/i, /import audio/i]) {
    const ctrl = dw.getByRole('button', { name }).first();
    await expect(ctrl).toBeVisible();
    const b = await ctrl.boundingBox();
    if (b && frame) {
      expect(b.x).toBeGreaterThanOrEqual(frame.x - 1);
      expect(b.x + b.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
    }
  }
});

test('Bug 3: Tomb Explorer overflow menu shows and its actions work', async ({ page }) => {
  await boot(page);
  await launch(page, 'Tomb Explorer');
  const explorer = page.getByRole('dialog', { name: /tomb explorer/i });

  // Shrink the window so secondary toolbar actions collapse into the overflow.
  const box = await explorer.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 240, { steps: 10 });
    await page.mouse.up();
  }

  const more = explorer.getByRole('button', { name: /more actions/i });
  await expect(more).toBeVisible();
  await more.click();

  // The overflow menu must be VISIBLE (the bug was it being clipped to nothing)
  // and contain actionable items that lie within the viewport (not off-screen).
  const menu = page.getByRole('menu', { name: /more actions/i });
  await expect(menu).toBeVisible();
  const items = menu.getByRole('menuitem');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  if (menuBox) {
    const vp = page.viewportSize();
    expect(menuBox.x).toBeGreaterThanOrEqual(0);
    if (vp) expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(vp.width + 1);
  }

  // Executing a collapsed action must work: "New File" is always enabled. If it
  // collapsed here, click it and verify it created a file (proves functionality).
  const newFile = menu.getByRole('menuitem', { name: 'New File' });
  if (await newFile.count()) {
    await newFile.click();
    await expect(explorer.getByRole('button', { name: 'untitled.txt' })).toBeVisible();
  }
  // The menu dismisses on Escape (independent of item enabled/disabled state).
  if (await menu.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  }
});

// --- Spectral Viewer ---

/** Launch an app from the Start menu (works for apps not shown on the desktop). */
async function launchFromStart(page: Page, appName: string): Promise<void> {
  await page.getByRole('button', { name: /start menu/i }).click();
  const menu = page.getByRole('menu', { name: /start menu/i });
  await menu.getByRole('menuitem', { name: appName }).click();
  await expect(page.getByRole('dialog', { name: new RegExp(appName, 'i') }).first()).toBeVisible();
}

test('Spectral Viewer: load the original sample image, then zoom and rotate', async ({
  page,
}) => {
  await boot(page);
  await launchFromStart(page, 'Spectral Viewer');
  const viewer = page.getByRole('dialog', { name: /spectral viewer/i });

  // Empty state → conjure the bundled original sample.
  await viewer.getByRole('button', { name: /view sample image/i }).click();
  const img = viewer.locator('img');
  await expect(img).toBeVisible();

  // Actual size, then zoom in and rotate — controls must affect the transform.
  await viewer.getByRole('button', { name: 'Actual size' }).click();
  await viewer.getByRole('button', { name: 'Zoom in' }).click();
  await expect(img).toHaveAttribute('style', /scale\(/);
  await viewer.getByRole('button', { name: 'Rotate' }).click();
  await expect(img).toHaveAttribute('style', /rotate\(90deg\)/);

  // The sample is now a real VFS file — it shows up in Tomb Explorer.
  await launch(page, 'Tomb Explorer');
  const explorer = page.getByRole('dialog', { name: /tomb explorer/i });
  await expect(explorer.getByRole('button', { name: /spectral-sigil\.svg/i })).toBeVisible({
    timeout: 10_000,
  });
});

// --- Visual polish: capture screenshots of key surfaces ---

test('visual: capture branded desktop, start menu, and windows', async ({ page }, testInfo) => {
  // Don't use boot() here — we want to capture the first-launch welcome first.
  await page.goto('/');
  await expect(page.getByRole('grid', { name: /desktop icons/i })).toBeVisible({ timeout: 20_000 });

  // First-launch welcome appears with branding; capture, then enter.
  const welcome = page.getByRole('dialog', { name: /welcome to ghostos/i });
  if (await welcome.count()) {
    await expect(welcome).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('01-welcome.png') });
    await welcome.getByRole('button', { name: /enter ghostos/i }).click();
    await expect(welcome).toBeHidden();
  }

  // Desktop with colourful icons.
  await expect(page.getByRole('grid', { name: /desktop icons/i })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('02-desktop.png') });

  // Start menu with branded header + icon tiles.
  await page.getByRole('button', { name: /start menu/i }).click();
  await expect(page.getByRole('menu', { name: /start menu/i })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('03-startmenu.png') });
  await page.keyboard.press('Escape');

  // A couple of open windows.
  await launch(page, 'Calculator');
  await launch(page, 'GraveNotes');
  await page.screenshot({ path: testInfo.outputPath('04-windows.png') });

  // Attach screenshots to the report as evidence.
  for (const name of ['01-welcome.png', '02-desktop.png', '03-startmenu.png', '04-windows.png']) {
    try {
      await testInfo.attach(name, { path: testInfo.outputPath(name), contentType: 'image/png' });
    } catch {
      /* welcome screenshot may be absent if already dismissed */
    }
  }
});

test('visual: capture wallpapers at multiple resolutions', async ({ page }, testInfo) => {
  const sizes = [
    { w: 1366, h: 768, tag: 'desktop' },
    { w: 1024, h: 640, tag: 'laptop' },
    { w: 768, h: 1024, tag: 'tablet' },
  ];
  const walls: Array<{ name: RegExp; tag: string }> = [
    { name: /haunted castle/i, tag: 'castle' },
    { name: /blood moon graveyard/i, tag: 'graveyard' },
    { name: /misty haunted forest/i, tag: 'forest' },
    { name: /supernatural void/i, tag: 'void' },
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.w, height: size.h });
    await boot(page);

    // Open Settings once from the Start menu.
    await page.getByRole('button', { name: /start menu/i }).click();
    await page.getByRole('menu', { name: /start menu/i }).getByRole('menuitem', { name: 'Settings' }).click();
    const settings = page.getByRole('dialog', { name: /settings/i }).first();
    await expect(settings).toBeVisible();

    for (const wall of walls) {
      await settings.getByRole('button', { name: wall.name }).click();
      const shot = testInfo.outputPath(`wall-${wall.tag}-${size.tag}.png`);
      await page.screenshot({ path: shot });
      await testInfo.attach(`wall-${wall.tag}-${size.tag}.png`, {
        path: shot,
        contentType: 'image/png',
      });
    }
    // Reset storage so the next viewport starts fresh (welcome re-seeds).
    await page.evaluate(() => indexedDB.deleteDatabase('ghostos'));
  }
});

test('visual regression: every desktop icon stays above the taskbar', async ({ page }) => {
  // Small/short viewport is the worst case for icon clipping.
  await page.setViewportSize({ width: 900, height: 560 });
  await boot(page);

  const taskbar = page.getByRole('button', { name: /start menu/i });
  const tb = await taskbar.boundingBox();
  expect(tb).not.toBeNull();
  const taskbarTop = tb ? tb.y : 560;

  const grid = page.getByRole('grid', { name: /desktop icons/i });
  const cells = await grid.getByRole('gridcell').all();
  expect(cells.length).toBeGreaterThan(0);
  for (const cell of cells) {
    const b = await cell.boundingBox();
    expect(b).not.toBeNull();
    if (b) {
      // The whole icon (including its label) must sit above the taskbar.
      expect(b.y + b.height).toBeLessThanOrEqual(taskbarTop + 1);
      expect(b.x).toBeGreaterThanOrEqual(-1);
    }
  }
});

// --- Regression: desktop icon labels must render fully, without clipping or overlap ---

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  // Treat a sub-pixel touch as non-overlapping; require real area intersection.
  const EPS = 0.5;
  return (
    a.x < b.x + b.width - EPS &&
    a.x + a.width - EPS > b.x &&
    a.y < b.y + b.height - EPS &&
    a.y + a.height - EPS > b.y
  );
}

for (const vp of [
  { w: 1440, h: 900, tag: 'desktop' },
  { w: 1024, h: 768, tag: 'laptop' },
  { w: 768, h: 1024, tag: 'tablet' },
]) {
  test(`icon labels render fully without clipping or overlap (${vp.tag} ${vp.w}x${vp.h})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await boot(page);

    const grid = page.getByRole('grid', { name: /desktop icons/i });
    const cells = await grid.getByRole('gridcell').all();
    expect(cells.length).toBeGreaterThan(0);

    const cellRects: Rect[] = [];

    for (const cell of cells) {
      const cellBox = await cell.boundingBox();
      expect(cellBox).not.toBeNull();
      if (!cellBox) continue;
      cellRects.push(cellBox);

      // The label span's full text must match the accessible name (nothing
      // dropped) and must not overflow its own box.
      const expectedName = (await cell.getAttribute('aria-label')) ?? '';
      const label = cell.getByTestId('desktop-icon-label');

      const metrics = await label.evaluate((el) => {
        const node = el as HTMLElement;
        return {
          text: (node.textContent ?? '').trim(),
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
        };
      });

      // Full name is rendered (no truncation/ellipsis of the content).
      expect(metrics.text).toBe(expectedName);

      // No clipping: content fits within the label box in both axes (allow 1px
      // for sub-pixel rounding).
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);

      // The label box stays within its cell's horizontal bounds (no sideways spill).
      const labelBox = await label.boundingBox();
      expect(labelBox).not.toBeNull();
      if (labelBox) {
        expect(labelBox.x).toBeGreaterThanOrEqual(cellBox.x - 1);
        expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(cellBox.x + cellBox.width + 1);
        expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(cellBox.y + cellBox.height + 1);
      }
    }

    // No two icon cells overlap each other.
    for (let i = 0; i < cellRects.length; i += 1) {
      for (let j = i + 1; j < cellRects.length; j += 1) {
        const a = cellRects[i];
        const b = cellRects[j];
        if (!a || !b) continue;
        expect(
          overlaps(a, b),
          `icon cell ${i} overlaps cell ${j} at ${vp.tag}`,
        ).toBe(false);
      }
    }
  });
}

// ===========================================================================
// Targeted release verification via fault injection (R5, R9.7, R6b, R12).
// These simulate adverse runtime conditions in real Chromium and assert the
// app degrades honestly: no false "saved" state, no silent data loss, usable
// layout and keyboard access on a narrow viewport.
// ===========================================================================

// --- R5: delayed IndexedDB hydration must gate the desktop (no early paint) ---

test('R5: desktop does not paint until delayed IndexedDB hydration completes', async ({ page }) => {
  // Delay every indexedDB.open success by ~1.5s so hydration resolves late. The
  // boot sequence (reduced-motion → ~0.3s) finishes first, so if the gate were
  // wrong the Desktop would paint before the stores hydrated. We intercept BOTH
  // the `onsuccess` property setter (how the `idb` library attaches its handler)
  // and addEventListener, so the delay applies regardless of attach style.
  await page.addInitScript(() => {
    const DELAY = 1500;
    const realOpen = indexedDB.open.bind(indexedDB);
    // @ts-expect-error - override for fault injection in the browser context
    indexedDB.open = (...args: Parameters<typeof realOpen>) => {
      const req = realOpen(...args);
      // The `idb` library attaches its resolver via the `onsuccess` property.
      // Intercept that assignment and defer the handler so the DB "opens" late,
      // modelling slow storage. A real success listener keeps the deferral alive.
      let stored: ((this: IDBRequest, ev: Event) => void) | null = null;
      req.addEventListener('success', (ev) => {
        if (stored) setTimeout(() => stored!.call(req, ev), DELAY);
      });
      Object.defineProperty(req, 'onsuccess', {
        configurable: true,
        get: () => stored,
        set: (fn: ((this: IDBRequest, ev: Event) => void) | null) => {
          stored = fn;
        },
      });
      return req;
    };
  });

  // Force reduced motion so the boot animation is fast and clearly precedes hydration.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // Shortly after load, the boot sequence should be up but the desktop must NOT
  // be present yet (hydration is still pending behind the 1.5s delay).
  await page.waitForTimeout(600);
  await expect(page.getByRole('grid', { name: /desktop icons/i })).toHaveCount(0);

  // Once hydration resolves, the desktop appears.
  await expect(page.getByRole('grid', { name: /desktop icons/i })).toBeVisible({ timeout: 20_000 });
});

// --- R9.7: rejected autoplay falls back to paused + prompt, never false "playing" ---

test('R9.7: blocked autoplay falls back to paused with a prompt (no false playing state)', async ({
  page,
}) => {
  // Make every media play() reject as the browser would under a strict autoplay
  // policy. (We reject unconditionally, including on user-gesture clicks, to
  // prove the UI never shows a false "playing" state when playback is refused.)
  await page.addInitScript(() => {
    const proto = HTMLMediaElement.prototype;
    proto.play = function blockedPlay(): Promise<void> {
      return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    };
  });

  await boot(page);
  await launch(page, 'DeadWave');
  const dw = page.getByRole('dialog', { name: /deadwave/i });
  await dw.getByRole('button', { name: /midnight transmission/i }).first().click();

  // The prompt toast appears and the transport stays on "Play" (not "Pause").
  await expect(page.getByText(/blocked autoplay/i)).toBeVisible({ timeout: 10_000 });
  await expect(dw.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(dw.getByRole('button', { name: 'Pause' })).toHaveCount(0);

  // The underlying element must be paused — no false playing state.
  const audio = dw.locator('audio');
  const paused = await audio.evaluate((el) => (el as HTMLAudioElement).paused);
  expect(paused).toBe(true);
});

// --- R6b: a failed storage write surfaces "Save failed", never a false "Saved" ---

test('R6b: failed IndexedDB write shows Save failed, not a false Saved (no silent loss)', async ({
  page,
}) => {
  // Allow reads/hydration to succeed, then make writes to the `kv` and `content`
  // object stores reject. This simulates storage becoming unwritable (quota,
  // disk, private-mode eviction) while the app is running.
  await page.addInitScript(() => {
    const realOpen = indexedDB.open.bind(indexedDB);
    // @ts-expect-error - override for fault injection in the browser context
    indexedDB.open = (...args) => {
      const req = realOpen(...(args as Parameters<typeof realOpen>));
      req.addEventListener('success', () => {
        const db = req.result as IDBDatabase;
        const realTx = db.transaction.bind(db);
        // @ts-expect-error - narrow override for fault injection
        db.transaction = (stores: string | string[], mode?: IDBTransactionMode) => {
          const tx = realTx(stores as string[], mode);
          if (mode === 'readwrite') {
            const realObjectStore = tx.objectStore.bind(tx);
            // @ts-expect-error - override put to fail
            tx.objectStore = (name: string) => {
              const os = realObjectStore(name);
              os.put = () => {
                const r = {} as IDBRequest;
                setTimeout(() => {
                  // @ts-expect-error - fabricate an error event
                  r.error = new DOMException('write blocked', 'QuotaExceededError');
                  if (typeof r.onerror === 'function') {
                    // @ts-expect-error - minimal event
                    r.onerror(new Event('error'));
                  }
                }, 0);
                return r;
              };
              return os;
            };
          }
          return tx;
        };
      });
      return req;
    };
  });

  await boot(page);
  await launch(page, 'Tomb Explorer');
  const explorer = page.getByRole('dialog', { name: /tomb explorer/i });
  await explorer.getByRole('button', { name: 'New File' }).click();
  const fileCell = explorer.getByRole('button', { name: 'untitled.txt' });
  await expect(fileCell).toBeVisible();

  await fileCell.dblclick();
  const editor = page.getByRole('dialog', { name: /gravenotes/i }).first();
  await expect(editor).toBeVisible();
  const area = editor.getByLabel(/contents of untitled.txt/i);
  await area.fill('this write should fail honestly');
  await editor.getByRole('button', { name: 'Save' }).click();

  // The status must report failure — never a false "Saved".
  await expect(editor.getByText(/save failed/i)).toBeVisible({ timeout: 10_000 });
  await expect(editor.getByText('Saved', { exact: true })).toHaveCount(0);
  // And the app surfaces an explicit notice (toast) about the non-durable save.
  await expect(page.getByText(/storage is unavailable|memory only|save failed/i).first()).toBeVisible();
});

// --- R12: narrow-mobile layout and keyboard accessibility ---

test('R12: on a narrow mobile viewport, an open window fits within the screen width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await boot(page);
  await launch(page, 'Tomb Explorer');
  const win = page.getByRole('dialog', { name: /tomb explorer/i });
  const box = await win.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    // The window must not overflow the viewport horizontally (allow 1px rounding).
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(375 + 1);
  }
});

test('R12: desktop icons and start menu are reachable and operable by keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await boot(page);

  // Tab into the desktop and activate the focused icon with Enter → launches an app.
  const grid = page.getByRole('grid', { name: /desktop icons/i });
  const firstCell = grid.getByRole('gridcell').first();
  await firstCell.focus();
  await expect(firstCell).toBeFocused();
  const appName = (await firstCell.getAttribute('aria-label')) ?? '';
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: new RegExp(appName, 'i') }).first()).toBeVisible();

  // The Start button is keyboard-operable and opens the start menu.
  const start = page.getByRole('button', { name: /start menu/i });
  await start.focus();
  await expect(start).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu', { name: /start menu/i })).toBeVisible();
});
