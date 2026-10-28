const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium, firefox } = require('playwright');
const origin = 'https://sharebeat.test';
const base = origin + '/ShareBeat/';
const output = path.resolve('.artifacts/cross-browser-dist');

async function hostedPage(browser) {
  const context = await browser.newContext();
  // Serve the built files at a public HTTPS origin. This exercises browser mDNS
  // privacy behavior instead of depending on localhost's special handling.
  await context.route(origin + '/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith('/ShareBeat/')) return route.fulfill({ status: 404, body: '' });
    const filename = path.resolve(output, pathname.slice('/ShareBeat/'.length) || 'index.html');
    if (!filename.startsWith(output + path.sep)) return route.fulfill({ status: 404, body: '' });
    try {
      const body = await readFile(filename);
      const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(filename)] || 'application/octet-stream';
      await route.fulfill({ body, contentType });
    } catch (_) { await route.fulfill({ status: 404, body: '' }); }
  });
  return context.newPage();
}

test('Chromium and Firefox connect in both directions at a public HTTPS origin without media permissions', { timeout: 120000 }, async () => {
  const { build } = await import('vite');
  await build({ base: '/ShareBeat/', build: { outDir: output }, logLevel: 'silent' });
  const chrome = await chromium.launch();
  const fox = await firefox.launch();
  try {
    for (const [hostBrowser, guestBrowser] of [[chrome, fox], [fox, chrome]]) {
      const host = await hostedPage(hostBrowser);
      const guest = await hostedPage(guestBrowser);
      const errors = [];
      host.on('pageerror', error => errors.push(error.message));
      guest.on('pageerror', error => errors.push(error.message));
      await host.goto(base);
      await host.locator('.pad').nth(34).click();
      await host.click('[data-action="share"]');
      await host.waitForSelector('#peer-output');
      await guest.goto(await host.locator('#peer-output').inputValue());
      await guest.waitForSelector('#peer-output');
      const reply = await guest.locator('#peer-output').inputValue();
      const replyTab = await host.context().newPage();
      await replyTab.goto(reply);
      await replyTab.waitForSelector('.reply-delivered');
      await host.waitForSelector('.connected-message', { timeout: 25000 });
      await guest.waitForSelector('.connected-message', { timeout: 25000 });
      await host.getByRole('button', { name: 'Close share dialog' }).click();
      await guest.getByRole('button', { name: 'Close share dialog' }).click();
      await guest.waitForFunction(() => document.querySelectorAll('.pad')[34].classList.contains('userA'));
      await guest.locator('.pad').nth(67).click();
      await host.waitForFunction(() => document.querySelectorAll('.pad')[67].classList.contains('userB'));
      assert.deepEqual(errors, []);
      await host.context().close();
      await guest.context().close();
    }
  } finally { await chrome.close(); await fox.close(); }
});

test('a browser that blocks host candidates fails before sharing and records safe diagnostics', { timeout: 60000 }, async () => {
  const browser = await firefox.launch({ firefoxUserPrefs: { 'media.peerconnection.ice.no_host': true } });
  try {
    const page = await hostedPage(browser);
    await page.goto(base);
    await page.click('[data-action="share"]');
    await page.waitForFunction(() => document.querySelector('#share-title')?.textContent === 'Connection failed', { timeout: 25000 });
    assert.equal(await page.locator('#peer-output').count(), 0, 'never produce an unusable invitation');
    const message = (await page.locator('#peer-status').textContent()).trim();
    assert.ok(/connection addresses|gather connection details/.test(message), message);
    assert.equal(await page.getByText(message, { exact: true }).count(), 1, 'show the error once');
    const diagnostics = await page.evaluate(() => document.querySelector('share-beat-app').diagnostics);
    assert.equal(diagnostics.localCandidates.total, 0);
    assert.ok(diagnostics.stage.startsWith('gathering'));
    assert.ok(!JSON.stringify(diagnostics).includes('a=candidate:'), 'do not copy raw connection data');
    assert.ok(!('sdp' in diagnostics) && !('token' in diagnostics));
    await page.locator('.link-help summary').click();
    assert.equal(await page.getByRole('button', { name: 'Copy connection details', exact: true }).isVisible(), true);
  } finally { await browser.close(); }
});
