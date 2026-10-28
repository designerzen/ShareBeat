const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('player views preserve the editor and audio while showing isolated, read-only patterns', { timeout: 60000 }, async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.contexts = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.contexts.push(this); }
    };
  });
  try {
    await page.goto(server.resolvedUrls.local[0]);
    await page.locator('.local-player .pad').nth(128).click();
    await page.waitForFunction(() => document.querySelector('share-beat').step >= 0);
    await page.evaluate(async () => {
      const app = document.querySelector('share-beat-app');
      window.editor = app.querySelector('share-beat');
      // Exercise layout with a full session; actual joins and live updates are
      // covered separately by the four-browser P2P test.
      for (let user = 0; user < 4; user++) app.setNote(user, 2, 2);
      app.setNote(1, 3, 3);
      app.peer.onSessionChange({ host: true, players: [0, 1, 2, 3], pending: false, connected: true });
      await app.updateComplete;
    });
    assert.equal(await page.locator('share-beat').count(), 4);
    assert.equal(await page.locator('.remote-player .pad:disabled').count(), 768);
    assert.equal(await page.locator('.remote-player [tabindex="0"]').count(), 0);
    for (let user = 0; user < 4; user++) {
      const grid = page.locator(`[data-player="${user}"] share-beat`);
      assert.equal(await grid.locator('.pad').nth(34).getAttribute('aria-pressed'), 'true');
      assert.equal(await grid.locator('.pad').nth(34).evaluate((pad, user) =>
        ['A', 'B', 'C', 'D'].every((letter, index) => pad.classList.contains('user' + letter) === (index === user)), user), true);
    }
    assert.equal(await page.locator('.local-player .pad').nth(51).getAttribute('aria-pressed'), 'false', 'a remote note stays out of the editor');
    await page.locator('[data-player="1"] .pad').nth(35).dispatchEvent('click');
    assert.equal(await page.locator('[data-player="1"] .pad').nth(35).getAttribute('aria-pressed'), 'false');
    await page.locator('.local-player .pad').nth(36).click();
    assert.equal(await page.locator('.local-player .pad').nth(36).getAttribute('aria-pressed'), 'true', 'stacked layers let clicks reach the editor');
    await page.waitForFunction(() => [...document.querySelectorAll('.remote-player share-beat')].every(grid => grid.step === window.editor.step));
    const positions = [];
    for (let user = 0; user < 4; user++) {
      positions.push(await page.locator(`[data-player="${user}"] .pad`).nth(34).evaluate(pad => {
        const marker = getComputedStyle(pad, '::before');
        const box = pad.getBoundingClientRect();
        return { left: marker.left, top: marker.top, color: marker.backgroundColor, x: box.x, y: box.y };
      }));
    }
    assert.equal(new Set(positions.map(p => p.left + ',' + p.top)).size, 4, 'overlapping notes have distinct quadrants');
    assert.equal(new Set(positions.map(p => p.color)).size, 4);
    assert.equal(new Set(positions.map(p => p.x + ',' + p.y)).size, 1, 'stacked grids align exactly');
    assert.equal(await page.locator('.remote-player .pad.selected').evaluateAll(pads =>
      pads.every(pad => getComputedStyle(pad).backgroundColor === 'rgba(0, 0, 0, 0)')), true, 'remote lit pads cannot cover lower players');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const mode of ['grid', 'rows', 'stacked']) {
        await page.locator(`[data-view="${mode}"]`).click();
        assert.equal(await page.locator(`[data-view="${mode}"]`).getAttribute('aria-pressed'), 'true');
        const local = await page.locator('.local-player .matrix').boundingBox();
        const remote = await page.locator('.remote-player .matrix').first().boundingBox();
        if (mode === 'grid') {
          assert.ok(remote.x >= local.x + local.width, 'grid places players side by side');
          assert.equal(remote.y, local.y);
        } else if (mode === 'rows') {
          assert.ok(remote.y > local.y + local.height, 'rows places players vertically');
        } else {
          assert.equal(remote.x, local.x);
          assert.equal(remote.y, local.y);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no overflow at ' + width + 'px in ' + mode);
        assert.equal(await page.evaluate(() => document.querySelector('.local-player share-beat') === window.editor), true, 'view switches keep the editor');
        assert.equal(await page.evaluate(() => window.contexts.length), 1, 'extra views never create duplicate audio');
        assert.equal(await page.evaluate(() => window.contexts[0].state), 'running');
      }
    }
    await page.evaluate(() => document.querySelector('share-beat-app').peer.onSessionChange({ host: true, players: [0], connected: false, pending: false }));
    await page.waitForFunction(() => document.querySelectorAll('share-beat').length === 1);
    assert.equal(await page.locator('.view-modes').count(), 0);
    assert.equal(await page.evaluate(() => document.querySelector('share-beat') === window.editor), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
});
