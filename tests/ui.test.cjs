const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');

test('simple grid stays unobstructed and sharing is confined to an accessible dialog', { timeout: 60000 }, async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForSelector('.pad');
    assert.equal(await page.locator('.pad').count(), 256);
    assert.equal(await page.locator('.grid-tools button').count(), 1, 'only Share sits outside the grid');
    assert.equal(await page.locator('.intro, .transport, .session-panel, input[type="range"]').count(), 0);
    assert.equal(await page.locator('#share-dialog').isVisible(), false);
    assert.equal(await page.locator('textarea').count(), 0);
    await page.locator('.pad').nth(128).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.pad').nth(129).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelectorAll('.pad')[129].getAttribute('aria-pressed') === 'true');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelectorAll('.pad.selected').length === 0);
    fs.mkdirSync('.artifacts', { recursive: true });
    await page.screenshot({ path: '.artifacts/grid-desktop.png', fullPage: true });
    await page.click('[data-action="share"]');
    const dialog = page.getByRole('dialog', { name: 'Share', exact: true });
    assert.equal(await dialog.isVisible(), true);
    assert.ok((await dialog.boundingBox()).width <= 380);
    assert.equal(await page.evaluate(() => document.querySelector('#share-dialog').contains(document.activeElement)), true);
    await page.click('[data-action="join-mode"]');
    assert.equal(await page.locator('#peer-input').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('[data-action="join"]').isDisabled(), true);
    await page.fill('#peer-input', 'not an invitation');
    await page.click('[data-action="join"]');
    await page.waitForFunction(() => document.querySelector('#peer-status').textContent.includes('complete connection code'));
    await page.click('[data-action="cancel"]');
    assert.equal(await page.locator('textarea').count(), 0);
    await page.click('[data-action="invite"]');
    await page.waitForSelector('#peer-output', { state: 'attached' });
    await page.screenshot({ path: '.artifacts/share-dialog-desktop.png', fullPage: true });
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await page.locator('[data-action="share"]').evaluate(el => el === document.activeElement), true);
    await page.click('[data-action="share"]');
    assert.equal(await page.locator('#peer-output').count(), 1, 'closing the dialog preserves an active invitation');
    await page.click('[data-action="cancel"]');
    await page.getByRole('button', { name: 'Close share dialog' }).click();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no page overflow at ' + width + 'px');
      const grid = await page.locator('#matrix').boundingBox();
      const tools = await page.locator('.grid-tools').boundingBox();
      assert.ok(grid.y + grid.height <= tools.y, 'the full grid is visible above the footer');
      assert.ok(Math.abs(grid.width - grid.height) < 1, 'the grid keeps its square layout');
      if (width === 390) {
        await page.screenshot({ path: '.artifacts/grid-mobile.png', fullPage: true });
        await page.click('[data-action="share"]');
        await page.screenshot({ path: '.artifacts/share-dialog-mobile.png', fullPage: true });
        await page.keyboard.press('Escape');
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
});
