const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('four browsers share additions, removals, snapshots and released instruments over native WebRTC', { timeout: 120000 }, async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const pages = [];
  const errors = [];
  const external = [];
  const base = server.resolvedUrls.local[0];
  async function page() {
    const context = await browser.newContext();
    const p = await context.newPage();
    p.on('pageerror', error => errors.push(error.message));
    p.on('request', request => { if (!request.url().startsWith(base)) external.push(request.url()); });
    await p.goto(base);
    await p.waitForSelector('#matrix .pad');
    await p.waitForFunction(() => document.querySelector('.instrument-pill').textContent.includes('Sine'));
    pages.push(p);
    return p;
  }
  async function join(host, guest, instrument) {
    await host.click('[data-action="invite"]');
    await host.waitForFunction(() => document.querySelector('#peer-output')?.value.includes('"offer"'));
    const offer = await host.locator('#peer-output').inputValue();
    await guest.click('[data-action="join-mode"]');
    await guest.fill('#peer-input', offer);
    await guest.click('[data-action="join"]');
    await guest.waitForFunction(() => document.querySelector('#peer-output')?.value.includes('"answer"'));
    if (instrument === 'Drums') {
      await host.fill('#peer-input', '{invalid');
      await host.click('[data-action="answer"]');
      await host.waitForFunction(() => document.querySelector('#peer-status').textContent.includes('complete connection code'));
    }
    await host.fill('#peer-input', await guest.locator('#peer-output').inputValue());
    await host.click('[data-action="answer"]');
    await guest.waitForFunction(name => document.querySelector('.instrument-pill').textContent.includes(name), instrument);
  }
  async function selected(p, cell, user, expected = true) {
    await p.waitForFunction(({ cell, user, expected }) =>
      document.querySelectorAll('#matrix .pad')[cell].classList.contains('user' + user) === expected,
      { cell, user, expected });
  }
  try {
    const host = await page();
    await host.locator('#matrix .pad').nth(34).click();
    const b = await page();
    await join(host, b, 'Drums');
    await selected(b, 34, 'A');
    const c = await page();
    await join(host, c, 'Bass');
    const d = await page();
    await join(host, d, 'Saw');
    await b.locator('#matrix .pad').nth(51).click();
    for (const p of pages) await selected(p, 51, 'B');
    // Replacing a note must clear its previous row on every browser.
    await b.locator('#matrix .pad').nth(67).click();
    for (const p of pages) {
      await selected(p, 51, 'B', false);
      await selected(p, 67, 'B');
    }
    await b.locator('#matrix .pad').nth(67).click();
    for (const p of pages) await selected(p, 67, 'B', false);
    assert.equal(await host.locator('[data-action="invite"]').isDisabled(), true, 'full sessions cannot create another invitation');
    await b.locator('#matrix .pad').nth(68).click();
    await selected(c, 68, 'B');
    await b.click('[data-action="leave"]');
    await selected(host, 68, 'B', false);
    await selected(c, 68, 'B', false);
    await b.waitForFunction(() => document.querySelector('.instrument-pill').textContent.includes('Sine'));
    await join(host, b, 'Drums');
    await selected(b, 34, 'A');
    await host.click('[data-action="leave"]');
    for (const p of [b, c, d]) {
      await p.waitForFunction(() => document.querySelector('.instrument-pill').textContent.includes('Sine'));
      await selected(p, 34, 'A', false);
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
    assert.deepEqual(external, [], 'no external service or CDN requests');
  } finally {
    await browser.close();
    await server.close();
  }
});
