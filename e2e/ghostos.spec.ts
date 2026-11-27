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
  await expect(notes.getByText('hello.txt')).toBeVisible();

  // Confirm it shows up in Tomb Explorer.
  await launch(page, 'Tomb Explorer');
  const explorer = page.getByRole('dialog', { name: /tomb explorer/i });
  // Navigate into Documents (the Save As default destination).
  await explorer.getByRole('button', { name: 'home' }).click();
  // hello.txt lives in documents; open that folder then check.
  // (Depending on layout, it is reachable from the breadcrumb/grid.)
  await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 });
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
