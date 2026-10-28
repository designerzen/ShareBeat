const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { chromium, firefox } = require('playwright');
const { startStun, useStun } = require('./helpers/stun.cjs');
const origin = 'https://sharebeat.test';
const base = origin + '/ShareBeat/';
// Keep the build outside the repo so other tests' Vite watchers don't reload.
const output = mkdtempSync(path.join(tmpdir(), 'sharebeat-cross-browser-'));
after(() => rmSync(output, { recursive: true, force: true }));

async function hostedPage(browser, stun) {
  const context = await browser.newContext();
  if (stun) await useStun(context, stun.url);
  // Exercise a production build/base path and secure origin without external HTTP.
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

async function waitForStage(page, selector, stage) {
  try {
    await page.waitForFunction(selector => document.querySelector(selector) ||
      document.querySelector('#share-title')?.textContent === 'Connection failed', selector, { timeout: 25000 });
    assert.ok(await page.locator(selector).count(), stage + ': ' + await page.locator('#peer-status').textContent());
  } catch (error) {
    const state = await page.evaluate(() => {
      const app = document.querySelector('share-beat-app');
      return { status: app?.status, error: app?.error, diagnostics: app?.diagnostics };
    });
    throw new Error(`${stage}: ${error.message}\n${JSON.stringify(state)}`, { cause: error });
  }
}

test('Chromium and Firefox exchange notes in both directions over a controlled local ICE network at an HTTPS origin', { timeout: 120000 }, async () => {
  const { build } = await import('vite');
  await build({ base: '/ShareBeat/', build: { outDir: output }, logLevel: 'silent' });
  // CI hosts need not provide multicast DNS or public UDP access. Expose local
  // candidate addresses only in these isolated test browsers; production retains
  // browser defaults. Signaling, ICE, DTLS, and data channels are still native.
  const chrome = await chromium.launch({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  const fox = await firefox.launch({ firefoxUserPrefs: { 'media.peerconnection.ice.obfuscate_host_addresses': false } });
  const stun = await startStun();
  try {
    for (const [hostBrowser, guestBrowser] of [[chrome, fox], [fox, chrome]]) {
      const host = await hostedPage(hostBrowser, stun);
      const guest = await hostedPage(guestBrowser, stun);
      const errors = [];
      host.on('pageerror', error => errors.push(error.message));
      guest.on('pageerror', error => errors.push(error.message));
      await host.goto(base);
      await host.locator('.pad').nth(34).click();
      await host.click('[data-action="share"]');
      await waitForStage(host, '#peer-output', 'create invitation');
      await guest.goto(await host.locator('#peer-output').inputValue());
      await waitForStage(guest, '#peer-output', 'create reply');
      const reply = await guest.locator('#peer-output').inputValue();
      const replyTab = await host.context().newPage();
      await replyTab.goto(reply);
      await replyTab.waitForSelector('.reply-delivered');
      await waitForStage(host, '.connected-message', 'connect host');
      await waitForStage(guest, '.connected-message', 'connect guest');
      await host.getByRole('button', { name: 'Close share dialog' }).click();
      await guest.getByRole('button', { name: 'Close share dialog' }).click();
      await guest.waitForFunction(() => document.querySelector('[data-player="0"] share-beat')?.querySelectorAll('.pad')[34].classList.contains('userA'));
      await guest.locator('.pad').nth(67).click();
      await host.waitForFunction(() => document.querySelector('[data-player="1"] share-beat')?.querySelectorAll('.pad')[67].classList.contains('userB'));
      assert.deepEqual(errors, []);
      assert.ok(await host.evaluate(() => window.requestedIceServers?.length), 'app configures STUN discovery');
      assert.ok(await guest.evaluate(() => window.requestedIceServers?.length));
      await host.context().close();
      await guest.context().close();
    }
    assert.ok(stun.requests > 0, `local STUN discovery was exercised (${stun.requests} requests)`);
  } finally { await chrome.close(); await fox.close(); await stun.close(); }
});

test('a browser that blocks all usable candidates fails before sharing and records safe diagnostics', { timeout: 60000 }, async () => {
  const browser = await firefox.launch({ firefoxUserPrefs: { 'media.peerconnection.ice.relay_only': true } });
  try {
    const page = await hostedPage(browser);
    await page.goto(base);
    await page.click('[data-action="share"]');
    await page.waitForFunction(() => document.querySelector('#share-title')?.textContent === 'Connection failed', null, { timeout: 25000 });
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
