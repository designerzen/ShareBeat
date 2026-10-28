const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('invitation and reply URLs connect four isolated sessions, including replies opened in new tabs', { timeout: 120000 }, async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const pages = [], errors = [], external = [];
  const base = server.resolvedUrls.local[0];
  async function page() {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await context.newPage();
    p.on('pageerror', error => errors.push(error.message));
    p.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await p.goto(base);
    await p.waitForSelector('.matrix .pad');
    pages.push(p);
    return p;
  }
  async function share(p) {
    if (!await p.locator('#share-dialog').isVisible()) await p.click('[data-action="share"]');
  }
  async function closeShare(p) {
    if (await p.locator('#share-dialog').isVisible()) await p.getByRole('button', { name: 'Close share dialog' }).click();
  }
  async function join(host, guest, instrument, sameTab = false) {
    await share(host);
    if (await host.locator('[data-action="invite"]').isVisible()) await host.click('[data-action="invite"]');
    await host.waitForFunction(() => document.querySelector('#peer-output')?.value.includes('#invite='));
    const invite = await host.locator('#peer-output').inputValue();
    assert.ok(invite.startsWith(base + '#invite=1.'));
    assert.ok(invite.length < 4000, 'compressed invitation fits in a message');
    await host.click('[data-action="copy"]');
    assert.equal(await host.evaluate(() => navigator.clipboard.readText()), invite);
    await guest.goto(invite);
    await guest.waitForFunction(() => document.querySelector('#peer-output')?.value.includes('#reply='));
    const reply = await guest.locator('#peer-output').inputValue();
    assert.ok(reply.startsWith(base + '#reply=1.'));
    assert.equal(new URL(guest.url()).hash, '', 'connection details are removed after opening the invitation');
    await guest.click('[data-action="copy"]');
    assert.equal(await guest.evaluate(() => navigator.clipboard.readText()), reply);
    if (sameTab) await host.goto(reply);
    else {
      const replyTab = await host.context().newPage();
      await replyTab.goto(reply);
      await replyTab.waitForSelector('.reply-delivered');
      await replyTab.close();
    }
    await guest.waitForFunction(name => document.querySelector('.instrument-name').textContent.includes(name), instrument);
    await host.waitForSelector('.connected-message');
    await closeShare(host);
    await closeShare(guest);
  }
  async function selected(p, cell, user, expected = true) {
    await p.waitForFunction(({ cell, user, expected }) => {
      const slot = user.charCodeAt(0) - 65;
      const pad = document.querySelector(`[data-player="${slot}"] share-beat`)?.querySelectorAll('.pad')[cell];
      return !!pad?.classList.contains('user' + user) === expected;
    },
      { cell, user, expected });
  }
  try {
    const host = await page();
    await host.locator('.matrix .pad').nth(34).click();
    const b = await page();
    await join(host, b, 'Drums');
    assert.equal(await host.locator('share-beat').count(), 2, 'joining adds a player grid');
    assert.equal(await b.locator('.remote-player share-beat[readonly]').count(), 1);
    await selected(b, 34, 'A');
    await host.locator('[data-action="waveform"]').click();
    await b.waitForFunction(() => document.querySelector('share-beat').trackWaveforms[0] === 'triangle');
    assert.equal(await b.locator('[data-action="waveform"]').count(), 0, 'drums keep their instrument label');
    const c = await page();
    await join(host, c, 'Bass', true);
    assert.equal(await c.evaluate(() => document.querySelector('share-beat').trackWaveforms[0]), 'triangle', 'joining receives the selected waveform');
    await c.locator('[data-action="waveform"]').click();
    for (const p of pages) await p.waitForFunction(() => document.querySelector('share-beat').trackWaveforms[2] === 'triangle');
    assert.equal(await c.locator('.local-player share-beat').getAttribute('oscillator-type'), 'triangle', 'controls set the grid attribute');
    const d = await page();
    await join(host, d, 'Saw');
    for (const p of pages) {
      assert.equal(await p.locator('.remote-player share-beat[readonly]').count(), 3);
      assert.equal(await p.locator('.remote-player .pad:not(:disabled)').count(), 0, 'remote grids cannot be edited');
    }
    await b.locator('.matrix .pad').nth(51).click();
    for (const p of pages) await selected(p, 51, 'B');
    await b.locator('.matrix .pad').nth(67).click();
    for (const p of pages) { await selected(p, 51, 'B', false); await selected(p, 67, 'B'); }
    await b.locator('.matrix .pad').nth(67).click();
    for (const p of pages) await selected(p, 67, 'B', false);
    await share(host);
    assert.equal(await host.locator('[data-action="invite"]').isDisabled(), true);
    await closeShare(host);
    await b.locator('.matrix .pad').nth(68).click();
    await selected(c, 68, 'B');
    await share(b);
    await b.locator('.link-help summary').click();
    await b.click('[data-action="leave"]');
    await host.waitForFunction(() => document.querySelectorAll('share-beat').length === 3);
    assert.equal(await b.locator('share-beat').count(), 1, 'leaving removes all remote grids');
    await selected(host, 68, 'B', false);
    await selected(c, 68, 'B', false);
    await join(host, b, 'Drums', true);
    await selected(b, 34, 'A');
    await share(host);
    await host.locator('.link-help summary').click();
    await host.click('[data-action="leave"]');
    for (const p of [b, c, d]) {
      await p.waitForFunction(() => document.querySelector('.instrument-name').textContent.includes('Sine'));
      await selected(p, 34, 'A', false);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], 'no CDN or application-service HTTP requests');
  } finally { await browser.close(); await server.close(); }
});
