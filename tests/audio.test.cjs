const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('bass pitch changes and interrupted envelopes stay continuous at 44.1 and 48 kHz', { timeout: 60000 }, async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(server.resolvedUrls.local[0]);
    const results = await page.evaluate(async () => {
      const { Sine } = await import('/src/audio/instruments/sine.ts');
      const measurements = [];
      for (const rate of [44100, 48000]) {
        const context = new OfflineAudioContext(1, rate, rate);
        const output = context.createGain();
        output.connect(context.destination);
        const bass = new Sine(context, output);
        bass.durationFadeIn = 0.025;
        bass.durationFadeOut = 0.16;
        bass.glideTime = 0.012;
        bass.start(55);
        const events = [[0.07, 82.4069], [0.11, null], [0.125, 65.4064], [0.2, 110],
          [0.25, null], [0.29, 55], [0.35, 98], [0.4, null], [0.41, 73.4162], [0.7, null]];
        const suspensions = events.map(([time]) => context.suspend(time));
        const rendering = context.startRendering();
        for (let i = 0; i < events.length; i++) {
          await suspensions[i];
          events[i][1] === null ? bass.stop() : bass.start(events[i][1]);
          await context.resume();
        }
        const samples = (await rendering).getChannelData(0);
        let maxDelta = 0, peak = 0, tail = 0;
        for (let i = 1; i < samples.length; i++) {
          maxDelta = Math.max(maxDelta, Math.abs(samples[i] - samples[i - 1]));
          peak = Math.max(peak, Math.abs(samples[i]));
          if (i > rate * 0.95) tail = Math.max(tail, Math.abs(samples[i]));
        }
        measurements.push({ rate, maxDelta, peak, tail, first: samples[0] });
      }
      return measurements;
    });
    for (const result of results) {
      assert.ok(Number.isFinite(result.maxDelta) && result.maxDelta < 0.012, JSON.stringify(result));
      assert.ok(result.peak > 0.4 && result.peak <= 0.501, 'signal is audible and does not clip');
      assert.ok(result.tail < 0.001, 'release decays smoothly to silence');
      assert.ok(Math.abs(result.first) < 0.0001, 'oscillator starts from silence');
      console.log('Bass continuity:', JSON.stringify(result));
    }
  } finally { await browser.close(); await server.close(); }
});
