const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');

test('studio layout, playback controls, keyboard editing and guided connections', { timeout: 60000 }, async () => {
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
    assert.equal(await page.locator('textarea').count(), 0, 'no connection codes in the default view');
    const grid = await page.locator('#matrix').boundingBox();
    const panel = await page.locator('.session-panel').boundingBox();
    assert.ok(grid.x + grid.width < panel.x, 'the session panel never overlaps the grid');
    const cell = page.locator('.pad').nth(128);
    await cell.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.pad').nth(129).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelectorAll('.pad')[129].getAttribute('aria-pressed') === 'true');
    await page.click('[data-action="clear"]');
    await page.waitForFunction(() => document.querySelectorAll('.pad.selected').length === 0);
    await page.click('[data-action="demo"]');
    await page.waitForFunction(() => document.querySelectorAll('.pad.selected').length === 10);
    // Selected notes must actually be painted in the player's color on both row shades.
    const colors = await page.locator('.pad.userA').evaluateAll(nodes => [...new Set(nodes.map(el => getComputedStyle(el).backgroundColor))]);
    assert.deepEqual(colors, ['rgb(212, 245, 156)']);
    await page.getByRole('button', { name: 'Pause playback' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.step-ruler .current').length === 0);
    fs.mkdirSync('.artifacts', { recursive: true });
    await page.screenshot({ path: '.artifacts/studio-desktop.png', fullPage: true });
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
    await page.screenshot({ path: '.artifacts/studio-invite.png', fullPage: true });
    await page.click('[data-action="cancel"]');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no page overflow at ' + width + 'px');
      const mobileGrid = await page.locator('#matrix').boundingBox();
      const mobilePanel = await page.locator('.session-panel').boundingBox();
      assert.ok(mobileGrid.y + mobileGrid.height < mobilePanel.y, 'mobile session follows the sequencer');
      if (width === 390) await page.screenshot({ path: '.artifacts/studio-mobile.png', fullPage: true });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
});
