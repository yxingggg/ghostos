import { test, expect, type Page } from '@playwright/test';

// End-to-end coverage of the functionality that manual testing flagged. These
// run against the real production build in Chromium.

async function boot(page: Page): Promise<void> {
  await page.goto('/');
  // The boot sequence runs, then the desktop appears. Wait for a desktop icon.
  await expect(page.getByRole('grid', { name: /desktop icons/i })).toBeVisible({ timeout: 20_000 });
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

  // The overflow menu must be visible (not clipped by the toolbar container).
  const menu = page.getByRole('menu', { name: /more actions/i });
  await expect(menu).toBeVisible();

  // Executing a collapsed action must work. "New File" is a low-priority action
  // that collapses into the overflow at this width; it creates untitled.txt.
  await menu.getByRole('menuitem', { name: 'New File' }).click();
  await expect(explorer.getByRole('button', { name: 'untitled.txt' })).toBeVisible();
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
  await boot(page);

  // First-launch welcome appears with branding; capture, then enter.
  const welcome = page.getByRole('dialog', { name: /welcome to ghostos/i });
  if (await welcome.count()) {
    await expect(welcome).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('01-welcome.png') });
    await welcome.getByRole('button', { name: /enter ghostos/i }).click();
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
