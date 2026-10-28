const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('links validate expiry and payload size, and explain how to recover a reply opened in the wrong browser', { timeout: 60000 }, async () => {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(server.resolvedUrls.local[0]);
    const result = await page.evaluate(async () => {
      const { createSignalLink, readSignalLink } = await import('/src/signal-links.ts');
      const code = { app: 'sharebeat', version: 1, token: crypto.randomUUID(), expires: Date.now() + 600000,
        description: { type: 'answer', sdp: 'v=0\r\n' } };
      const link = await createSignalLink(JSON.stringify(code));
      const roundtrip = await readSignalLink(link);
      const failures = [];
      for (const invalid of ['not a URL', 'https://example.com/#reply=1.bad',
        await createSignalLink(JSON.stringify({ ...code, expires: Date.now() - 1000 })),
        await createSignalLink(JSON.stringify({ ...code, token: 'not-a-token' }))]) {
        try { await readSignalLink(invalid); failures.push('accepted invalid input'); }
        catch (error) { failures.push(error.message); }
      }
      // Reject a compressed decompression bomb without accepting unbounded data.
      const large = new TextEncoder().encode('x'.repeat(200000));
      const compressed = await new Response(new Blob([large]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
      const encoded = btoa(String.fromCharCode(...new Uint8Array(compressed))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
      try { await readSignalLink(location.origin + '/#reply=1.' + encoded); failures.push('accepted oversized input'); }
      catch (error) { failures.push(error.message); }
      return { link, roundtrip, failures };
    });
    assert.equal(result.roundtrip.kind, 'reply');
    assert.ok(result.roundtrip.code.includes('sharebeat'));
    assert.ok(result.failures[0].includes('complete ShareBeat link'));
    assert.ok(result.failures[1].includes('incomplete or damaged'));
    assert.ok(result.failures[2].includes('expired'));
    assert.ok(result.failures[3].includes('incomplete or damaged'));
    assert.ok(result.failures[4].includes('incomplete or damaged'));
    await page.goto(result.link);
    await page.waitForFunction(() => document.querySelector('#peer-status').textContent.includes('original tab was not found'));
    assert.equal(await page.locator('#share-dialog').isVisible(), true);
    assert.ok((await page.locator('#peer-output').inputValue()).includes('#reply='), 'reply remains available to paste into the original tab');
    await page.locator('.link-help summary').click();
    assert.equal(await page.locator('#peer-input').isVisible(), true);
    // A damaged incoming invitation opens an error instead of creating a peer.
    await page.goto(server.resolvedUrls.local[0] + '#invite=1.bad');
    await page.waitForFunction(() => document.querySelector('#peer-status').textContent.includes('incomplete or damaged'));
    assert.equal((await page.locator('.instrument-name').textContent()).trim(), 'Sine');
  } finally { await browser.close(); await server.close(); }
});
