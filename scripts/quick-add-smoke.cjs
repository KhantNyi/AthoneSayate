const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('artifacts/ui', { recursive: true });
  try {
    await page.goto(process.env.UI_URL || 'http://localhost:3100', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
    const quickAdd = page.getByRole('button', { name: 'Quick add', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Quick add', exact: true });
    for (const width of [320, 360, 390, 430, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      await quickAdd.click();
      const close = dialog.getByRole('button', { name: 'Close quick add' });
      assert(await close.evaluate(node => node === document.activeElement), 'Opening the sheet must not summon the keyboard');
      const overflow = await dialog.locator('input, select, button').evaluateAll(nodes => nodes.filter(node => {
        const r = node.getBoundingClientRect();
        return r.left < 0 || r.right > innerWidth + 1;
      }).map(node => node.outerHTML));
      assert.deepEqual(overflow, [], `Control overflow at ${width}`);
      await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('25');
      await dialog.getByRole('textbox', { name: 'Optional note' }).fill('Mobile keyboard check');
      // A soft keyboard shrinks/pans the visual viewport without resizing the
      // layout viewport on mobile Safari. A small desktop window misses this.
      await page.evaluate(() => {
        Object.defineProperty(visualViewport, 'height', { configurable: true, value: 300 });
        Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, value: 60 });
        visualViewport.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(100);
      for (const control of [close, dialog.locator('button[type="submit"]'), dialog.getByRole('textbox', { name: 'Optional note' })]) {
        const r = await control.boundingBox();
        assert(r.y >= 60 && r.y + r.height <= 361, `Control hidden by keyboard at ${width}: ${JSON.stringify(r)}`);
        assert(await control.evaluate(node => {
          const r = node.getBoundingClientRect();
          return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }), `Control obscured at ${width}`);
      }
      await page.screenshot({ path: `artifacts/ui/quick-add-keyboard-${width}.png` });
      await close.click();
      await page.evaluate(() => {
        delete visualViewport.height;
        delete visualViewport.offsetTop;
        visualViewport.dispatchEvent(new Event('resize'));
      });
      assert.equal(await page.locator('dialog[open]').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Quick Add fields, focus, pinned actions and simulated panned keyboard viewport at five mobile sizes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
