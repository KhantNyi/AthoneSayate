const assert = require('node:assert/strict');
const fs = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const engine = process.env.BROWSER_ENGINE || 'chromium';
  const browser = await playwright[engine].launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('artifacts/ui', { recursive: true });
  const url = process.env.UI_URL || 'http://localhost:3100';
  const closed = () => page.waitForFunction(() => !document.querySelector('dialog[open]'));
  const lensAligned = async (track) => {
    await page.waitForTimeout(320);
    const geometry = await track.evaluate(node => {
      const lens = node.querySelector('.glass-nav-indicator').getBoundingClientRect();
      const button = [...node.querySelectorAll('[data-glass-key]')].find(item => item.dataset.glassKey === node.dataset.selected).getBoundingClientRect();
      return { lens: lens.toJSON(), button: button.toJSON() };
    });
    assert(geometry.button.width > 0, 'Check the visible navigation layout');
    for (const key of ['x', 'y', 'width', 'height']) {
      assert(Math.abs(geometry.lens[key] - geometry.button[key]) < 1.5, `Navigation indicator ${key} is misaligned: ${JSON.stringify(geometry)}`);
    }
  };
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const dock = page.locator('.ios-tabbar .glass-nav-track');
    await lensAligned(dock);
    await dock.evaluate(node => { window.originalGlassLens = node.querySelector('.glass-nav-indicator'); });
    await page.evaluate(async () => {
      for (const key of ['transactions', 'reports', 'dashboard', 'recurring', 'reports']) {
        document.querySelector(`.ios-tabbar [data-glass-key="${key}"]`).click();
        await new Promise(resolve => setTimeout(resolve, 35));
      }
    });
    await lensAligned(dock);
    assert.equal(await dock.getAttribute('data-selected'), 'reports');
    assert(await dock.evaluate(node => node.querySelector('.glass-nav-indicator') === window.originalGlassLens), 'Selection must glide with the same indicator');
    const more = page.getByRole('button', { name: 'More', exact: true });
    await more.click();
    await lensAligned(dock);
    assert.equal(await dock.getAttribute('data-selected'), 'more', 'More must own selection while open');
    await page.locator('#mobile-more-navigation').getByRole('button', { name: 'Budgets', exact: true }).click();
    await lensAligned(dock);
    assert.equal(await more.getAttribute('aria-expanded'), 'false');
    assert.equal(await dock.getAttribute('data-selected'), 'more', 'Secondary pages keep More selected');
    await page.evaluate(async () => {
      const button = document.querySelector('.ios-tabbar [data-glass-key="more"]');
      button.click();
      await new Promise(resolve => setTimeout(resolve, 25));
      button.click();
      await new Promise(resolve => setTimeout(resolve, 25));
      button.click();
    });
    await page.waitForTimeout(180);
    assert.equal(await more.getAttribute('aria-expanded'), 'true', 'Reopening cancels the pending menu exit');
    assert.equal(await page.locator('#mobile-more-navigation').count(), 1);
    await page.keyboard.press('Escape');
    await more.click();
    await page.keyboard.press('Escape');
    await page.locator('#mobile-more-navigation').waitFor({ state: 'detached' });
    assert(await more.evaluate(node => node === document.activeElement), 'Menu dismissal restores focus');
    await page.waitForTimeout(180);
    await more.click();
    await page.locator('#mobile-more-navigation').getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.locator('#mobile-more-navigation button[aria-pressed="false"]').click();
    await page.keyboard.press('Escape');
    for (const size of [{ width: 320, height: 844 }, { width: 844, height: 390 }, { width: 768, height: 900 }, { width: 1280, height: 720 }, { width: 1600, height: 900 }]) {
      await page.setViewportSize(size);
      await lensAligned(page.locator('.glass-nav-track:visible'));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Glass must not widen the page');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `artifacts/ui/glass-myanmar-dark-${engine}.png`, fullPage: true });
    await more.click();
    await page.locator('#mobile-more-navigation button[aria-pressed="false"]').click();
    await page.keyboard.press('Escape');
    const launcher = page.getByRole('button', { name: 'Quick add', exact: true });
    const dialog = page.locator('dialog[aria-labelledby="quick-add-title"]');
    // Safari touch clicks don't focus buttons. Set a known keyboard focus
    // origin so this assertion checks restoration across both engines.
    await launcher.focus();
    await launcher.press('Enter');
    await dialog.evaluate(node => Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished)));
    const bounds = await dialog.locator('form').boundingBox();
    assert(bounds.y >= 0 && bounds.y + bounds.height <= 845, 'Sheet must finish within the visible viewport');
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('17');
    // Reopen during an exit via an external state trigger. The native dialog
    // stays open throughout, retaining the draft and its original scroll lock.
    await page.evaluate(async () => {
      document.querySelector('button[aria-label="Close quick add"]').click();
      await new Promise(resolve => setTimeout(resolve, 25));
      document.querySelector('button[aria-label="Quick add"]').click();
    });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('dialog[open]').count(), 1);
    assert.equal(await dialog.getAttribute('data-state'), 'open');
    assert.equal(await dialog.getByRole('textbox', { name: 'Amount', exact: true }).inputValue(), '17');
    assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
    await page.keyboard.press('Escape');
    await closed();
    assert(await launcher.evaluate(node => node === document.activeElement));
    assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed');

    await launcher.click();
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('10');
    await dialog.locator('button[type="submit"]').click();
    const signup = page.getByRole('dialog', { name: 'Create an account to save this', exact: true });
    await signup.waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
    assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
    assert(await dialog.evaluate(node => node.contains(document.activeElement)), 'Nested exit restores parent focus');
    await page.keyboard.press('Escape');
    await closed();

    await launcher.click();
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('10');
    await dialog.locator('button[type="submit"]').click();
    await signup.getByRole('button', { name: 'Create free account', exact: true }).click();
    assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed', 'Unmounting nested dialogs must release every scroll lock');
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.ios-tabbar [data-glass-key="dashboard"]').click();
    await launcher.click();
    await page.keyboard.press('Escape');
    await closed();
    assert.equal(await page.locator('.glass-light:visible').count(), 0, 'Reduced motion removes pointer lighting');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await launcher.click();
    await page.evaluate(() => document.querySelector('button[aria-label="Close quick add"]').click());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await closed();
    assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed', 'Changing motion preference during exit releases the scroll lock');
    await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'more' });
    assert.equal(await page.locator('.ios-tabbar').evaluate(node => getComputedStyle(node).backdropFilter), 'none', 'Increased contrast removes backdrop filtering');

    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    desktop.on('pageerror', error => errors.push(error.message));
    await desktop.bringToFront();
    await desktop.goto(url, { waitUntil: 'networkidle' });
    const sidebar = desktop.locator('.glass-sidebar-track');
    const rect = await sidebar.boundingBox();
    await desktop.mouse.move(rect.x + rect.width / 2, rect.y + 25);
    await desktop.waitForTimeout(60);
    assert.equal(await sidebar.locator('.glass-light').getAttribute('data-lit'), 'true', 'Desktop pointer illuminates its surface');
    const light = await sidebar.locator('.glass-light').boundingBox();
    assert(light.width <= 160 && light.height <= 160, 'Lighting remains a bounded layer');
    await desktop.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await sidebar.locator('.glass-light').isVisible(), false);
    await desktop.emulateMedia({ reducedMotion: 'no-preference' });
    await desktop.waitForTimeout(1600);
    await desktop.screenshot({ path: `artifacts/ui/glass-desktop-${engine}.png`, fullPage: true });
    // Simulate an engine that ignores backdrop-filter declarations and enables
    // the compiled unsupported-filter fallback. Use the real production rules.
    const fallbacks = await desktop.evaluate(() => {
      let fallback = '';
      const visit = rules => {
        for (const rule of rules) {
          if (rule instanceof CSSSupportsRule && rule.conditionText.startsWith('not') && rule.conditionText.includes('backdrop-filter')) {
            fallback += [...rule.cssRules].map(item => item.cssText).join('\n');
          }
          if (rule instanceof CSSStyleRule) {
            rule.style.removeProperty('backdrop-filter');
            rule.style.removeProperty('-webkit-backdrop-filter');
          } else if (rule.cssRules) visit(rule.cssRules);
        }
      };
      for (const sheet of document.styleSheets) visit(sheet.cssRules);
      const style = document.createElement('style');
      // Initial unsupported-filter rendering has no fill transition. Avoid
      // introducing one only because this test swaps styles after loading.
      style.textContent = fallback + '\n.app-shell button.liquid-fab { transition: none !important; }';
      document.head.append(style);
      return fallback;
    });
    assert(fallbacks.includes('.app-shell'), 'Production CSS contains app-scoped filter fallbacks');
    await desktop.waitForTimeout(180); // Allow the button's fill transition to settle.
    const fallbackStyle = await desktop.locator('.liquid-fab').evaluate(node => {
      const style = getComputedStyle(node);
      return { color: style.backgroundColor, filter: style.backdropFilter };
    });
    assert(fallbackStyle.color.startsWith('rgb('), `Unsupported filters retain an opaque fill: ${JSON.stringify(fallbackStyle)}`);
    assert.equal(fallbackStyle.filter, 'none');
    await desktop.close();
    assert.deepEqual(errors, []);
    console.log(`PASS (${engine}): Gliding selection, More state, resizing/language, sheet resting bounds, interrupted and nested exits, unmount cleanup, live reduced motion, contrast, bounded lighting and simulated filter fallback.`);
  } catch (error) {
    await page.screenshot({ path: `artifacts/ui/glass-failure-${engine}.png`, fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
