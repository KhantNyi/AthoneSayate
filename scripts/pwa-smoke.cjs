/* Run against a local production build. Temporarily changes the generated
   worker to exercise a real update; always restores it before exiting. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const workerPath = 'apps/web/public/sw.js';
  const original = fs.readFileSync(workerPath, 'utf8');
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const base = process.env.UI_URL || 'http://localhost:3100';
  try {
    const manifest = await (await context.request.get(`${base}/manifest.webmanifest`)).json();
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.orientation, 'any');
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.getByRole('button', { name: 'More', exact: true }).waitFor();

    fs.writeFileSync(workerPath, `${original}\n// smoke update ${Date.now()}\n`);
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await page.getByRole('button', { name: 'Update now', exact: true }).waitFor();
    assert(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting)), 'Update must wait for the user');
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Update now', exact: true }).click()
    ]);
    await page.getByRole('button', { name: 'More', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Update now', exact: true }).count(), 0);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.getByRole('button', { name: 'More', exact: true }).waitFor();
    await page.goto(`${base}/not-cached-offline-test`, { waitUntil: 'load' });
    await page.getByRole('heading', { name: "You're offline" }).waitFor();
    await page.getByRole('link', { name: 'Return to app' }).click();
    await page.getByRole('button', { name: 'More', exact: true }).waitFor();
    console.log('PASS: manifest, worker activation, user-controlled update/reload, offline app reload, offline fallback and return.');
  } finally {
    fs.writeFileSync(workerPath, original);
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
