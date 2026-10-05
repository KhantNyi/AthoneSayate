/* Run against a local demo server. Set PLAYWRIGHT_MODULE / BROWSER_EXECUTABLE
   when using an existing Playwright installation and system browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await playwright[process.env.BROWSER_ENGINE || 'chromium'].launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  // Use touch emulation for the responsive/mobile flow. Fine-pointer desktop
  // behavior has its own desktop-menu and glass interaction checks.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const output = process.env.UI_SCREENSHOTS || 'artifacts/ui';
  fs.mkdirSync(output, { recursive: true });
  try {
    await page.goto(process.env.UI_URL || 'http://localhost:3100', { waitUntil: 'networkidle' });
    // The development-only Next badge overlaps the first dock button at 360px.
    // Runtime errors are still collected above; production has no such badge.
    await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
    await page.getByRole('button', { name: 'More', exact: true }).waitFor();
    const selectTab = async (name, mobile) => {
      mobile = await page.locator('.ios-tabbar').isVisible();
      if (mobile && ['Budgets', 'Recurring', 'Goals', 'Category'].includes(name)) {
        await page.getByRole('button', { name: 'More', exact: true }).click();
        const item = page.locator('#mobile-more-navigation').getByRole('button', { name, exact: true });
        if (await item.count()) { await item.click(); return; }
        await page.keyboard.press('Escape');
      }
      await page.locator('nav:visible').getByRole('button', { name, exact: true }).click();
    };
    for (const width of [320, 360, 390, 768, 1280, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      for (const tab of ['Dashboard', 'Transactions', 'Reports', 'Budgets', 'Recurring', 'Goals', 'Category']) {
        await selectTab(tab, width < 1280);
        await page.waitForTimeout(250);
        const editor = page.getByRole('button', { name: /^Edit (transaction|budget|goal|recurring|account|category)/ }).first();
        if (await editor.isVisible()) await editor.click();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${tab} page overflow at ${width}`);
        // Catch clipped form controls even when the root deliberately clips overflow.
        const overflow = await page.locator('input:visible, select:visible, form:visible').evaluateAll(nodes => nodes.filter(node => {
          const r = node.getBoundingClientRect();
          return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2);
        }).map(node => node.outerHTML.slice(0, 150)));
        assert.deepEqual(overflow, [], `${tab} form overflow at ${width}`);
      }
      await selectTab('Dashboard', width < 1280);
      await page.waitForTimeout(1600); // Recharts animates in JS, independently of CSS motion.
      await page.screenshot({ path: `${output}/dashboard-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await selectTab('Transactions', true);
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'Tab change must return to the top');
    await selectTab('Dashboard', true);
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = async () => { window.installPromptCalled = true; };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    await page.getByRole('button', { name: 'Install app', exact: true }).click();
    assert(await page.evaluate(() => window.installPromptCalled), 'Install prompt was not called');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole('button', { name: 'Quick add', exact: true }).click();
    const landscapeSheet = await page.locator('dialog[open] form').boundingBox();
    assert(landscapeSheet.y >= 0 && landscapeSheet.y + landscapeSheet.height <= 391, 'Landscape sheet exceeds viewport');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    const more = page.getByRole('button', { name: 'More', exact: true });
    await more.click();
    await page.keyboard.press('Escape');
    assert.equal(await more.getAttribute('aria-expanded'), 'false');
    assert(await more.evaluate(node => node === document.activeElement));
    await more.click();
    await page.locator('h1').click();
    assert.equal(await more.getAttribute('aria-expanded'), 'false');
    const quickAdd = page.getByRole('button', { name: 'Quick add', exact: true });
    await quickAdd.focus();
    await quickAdd.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Quick add', exact: true });
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      assert(await dialog.evaluate(node => node.contains(document.activeElement)), 'Focus escaped Quick Add');
    }
    await page.screenshot({ path: `${output}/quick-add-light.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert(await quickAdd.evaluate(node => node === document.activeElement));
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await quickAdd.click();
    await page.screenshot({ path: `${output}/quick-add-dark.png` });
    await page.setViewportSize({ width: 390, height: 420 });
    const rect = await dialog.locator('form').boundingBox();
    assert(rect.y >= 0 && rect.y + rect.height <= 421, 'Sheet exceeds short viewport');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await selectTab('Reports', true);
    await page.getByRole('button', { name: /^Filters/ }).click();
    const filters = page.getByRole('dialog', { name: 'Report filters' });
    await filters.waitFor();
    assert(await filters.evaluate(node => node.matches(':modal')), 'Filters are not in top layer');
    await page.screenshot({ path: `${output}/report-filters-dark.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(await page.locator('dialog[open]').count(), 0);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const tab of ['Dashboard', 'Transactions', 'Reports', 'Budgets', 'Recurring', 'Goals', 'Category']) {
        await selectTab(tab, width < 1280);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Dark ${tab} overflow`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await selectTab('Dashboard', true);
    // Clearing the native month control must not turn state into an Invalid Date.
    await page.locator('input[type="month"]:visible').first().fill('');
    await quickAdd.click();
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('10');
    await dialog.locator('button[type="submit"]').click();
    const signup = page.getByRole('dialog', { name: 'Create an account to save this' });
    await signup.waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
    assert.equal(await page.locator('dialog[open]').count(), 1);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await more.click();
    await page.locator('#mobile-more-navigation').getByRole('button', { name: 'မြန်မာ', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('main').getAttribute('lang'), 'my');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${output}/dashboard-myanmar-dark.png`, fullPage: true });
    await page.locator('.liquid-fab').click();
    assert(await page.getByRole('dialog').isVisible());
    await page.screenshot({ path: `${output}/quick-add-myanmar-dark.png` });
    await page.keyboard.press('Escape');
    if (process.env.UI_LANDING_URL) {
      await page.goto(process.env.UI_LANDING_URL, { waitUntil: 'networkidle' });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Landing overflow at ${width}`);
        await page.screenshot({ path: `${output}/landing-${width}.png` });
      }
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      await page.getByRole('button', { name: 'မြန်မာ', exact: true }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.locator('html').getAttribute('lang'), 'my');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Myanmar landing overflow');
      await page.screenshot({ path: `${output}/landing-myanmar-dark.png` });
    }
    assert.deepEqual(errors, [], 'Browser errors');
    console.log('PASS: seven tabs at six widths, form bounds, tab scroll reset, install prompt, landscape sheet, menu dismissal, modal focus/restore, short viewport, report overlay; screenshots saved.');
  } catch (error) {
    await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
    console.error('Browser errors:', errors);
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
