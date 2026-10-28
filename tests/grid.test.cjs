const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('independent grids use attributes and external audio controllers with isolated lifecycles', { timeout: 60000 }, async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(server.resolvedUrls.local[0]);
    await page.waitForSelector('share-beat .pad');
    await page.evaluate(async () => {
      document.querySelector('share-beat-app').remove();
      window.contexts = [];
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor() { super(); window.contexts.push(this); }
        createOscillator() {
          const node = super.createOscillator();
          (this.oscillators ??= []).push(node);
          return node;
        }
      };
      const { GridAudioController } = await import('/src/audio/grid-audio-controller.ts');
      document.body.insertAdjacentHTML('afterbegin', `
        <div style="display:flex;gap:20px;align-items:start">
          <share-beat id="a" oscillator-type="triangle" style="width:240px"></share-beat>
          <share-beat id="b" oscillator-type="square" bpm="160" style="width:360px"></share-beat>
          <share-beat id="visual" style="width:120px"></share-beat>
        </div>`);
      for (const grid of document.querySelectorAll('share-beat')) await grid.updateComplete;
      window.gridA = document.querySelector('#a');
      window.gridB = document.querySelector('#b');
      window.controllers = [new GridAudioController(window.gridA), new GridAudioController(window.gridB)];
      window.notes = [];
      document.addEventListener('note-change', event => window.notes.push({ target: event.target.id, ...event.detail }));
    });
    assert.equal(await page.evaluate(() => window.contexts.length), 0, 'audio is lazy');
    assert.equal(await page.locator('share-beat .pad').count(), 768);
    assert.equal(await page.locator('share-beat [id], share-beat footer, share-beat dialog').count(), 0, 'grids contain only a matrix');
    for (const [id, width] of [['a', 240], ['b', 360]]) {
      const box = await page.locator(`#${id} .matrix`).boundingBox();
      assert.equal(box.width, width, 'grid fits its container');
      assert.equal(box.height, width);
    }
    await page.locator('#visual .pad').nth(128).click();
    assert.equal(await page.evaluate(() => window.contexts.length), 0, 'a visual grid does not create audio');
    await page.locator('#a .pad').nth(128).click();
    await page.waitForFunction(() => window.gridA.step >= 0);
    assert.equal(await page.evaluate(() => window.gridB.step), -1);
    assert.equal(await page.locator('#b .pad.selected').count(), 0);
    assert.equal(await page.evaluate(() => window.contexts[0].oscillators.slice(-3)[0].type), 'triangle');
    await page.locator('#b .pad').nth(144).click();
    await page.waitForFunction(() => window.gridB.step >= 0);
    assert.equal(await page.evaluate(() => window.contexts.length), 2);
    assert.equal(await page.evaluate(() => window.contexts[1].oscillators.slice(-3)[0].type), 'square');
    await page.evaluate(async () => { window.gridA.setAttribute('oscillator-type', 'sawtooth'); await window.gridA.updateComplete; });
    assert.equal(await page.evaluate(() => window.contexts[0].oscillators.slice(-3)[0].type), 'sawtooth');
    assert.equal(await page.evaluate(() => window.contexts[1].oscillators.slice(-3)[0].type), 'square');
    await page.evaluate(async () => { window.gridA.setAttribute('oscillator-type', 'invalid'); await window.gridA.updateComplete; });
    assert.equal(await page.evaluate(() => window.contexts[0].oscillators.slice(-3)[0].type), 'sine', 'invalid types use a safe default');
    await page.locator('#a').evaluate(el => el.setAttribute('readonly', ''));
    assert.equal(await page.locator('#a .pad').nth(129).isDisabled(), true);
    await page.locator('#a .pad').nth(129).dispatchEvent('click');
    assert.equal(await page.locator('#a .pad.selected').count(), 1, 'readonly blocks edits');
    assert.deepEqual(await page.evaluate(() => window.notes.map(note => note.target)), ['visual', 'a', 'b']);
    await page.evaluate(() => window.gridA.remove());
    await page.waitForFunction(() => window.contexts[0].state === 'closed');
    assert.equal(await page.evaluate(() => window.contexts[1].state), 'running', 'removing one grid keeps the other playing');
    await page.evaluate(() => {
      window.gridA.removeAttribute('readonly');
      window.gridA.setAttribute('oscillator-type', 'triangle');
      document.body.append(window.gridA);
    });
    await page.locator('#a .pad').nth(129).click();
    await page.waitForFunction(() => window.contexts.length === 3 && window.gridA.step >= 0);
    assert.equal(await page.evaluate(() => window.contexts[2].oscillators.slice(-3)[0].type), 'triangle');
    await page.evaluate(() => { window.gridA.remove(); window.gridB.remove(); });
    await page.waitForFunction(() => window.contexts.every(context => context.state === 'closed'));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
});
