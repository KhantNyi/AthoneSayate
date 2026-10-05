const assert = require('node:assert/strict');
const fs = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const engine = process.env.BROWSER_ENGINE || 'chromium';
  const browser = await playwright[engine].launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('artifacts/ui', { recursive: true });
  try {
    await page.goto(process.env.UI_URL || 'http://localhost:3100', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
    // Native focus must see safe resting bounds before visual playback starts.
    await page.evaluate(() => {
      window.popupOpenings = [];
      const showModal = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function () {
        showModal.call(this);
        const sheet = this.querySelector('.liquid-sheet');
        const title = document.getElementById(this.getAttribute('aria-labelledby'));
        window.popupOpenings.push({
          sheet: sheet.getBoundingClientRect().toJSON(), title: title.getBoundingClientRect().toJSON(),
          focusTag: document.activeElement.tagName,
          viewportTop: visualViewport.offsetTop, viewportHeight: visualViewport.height
        });
      };
    });
    const checkOpening = async (name) => {
      const dialog = page.getByRole('dialog', { name, exact: true });
      await dialog.waitFor();
      const opening = await page.evaluate(() => window.popupOpenings.at(-1));
      const { sheet, title, viewportTop: top, viewportHeight: height } = opening;
      assert(sheet.y >= top - 1 && sheet.bottom <= top + height + 1, `${name} must fit on the very first frame: ${JSON.stringify(opening)}`);
      assert(title.y >= top && title.bottom <= top + height, `${name} title must be visible without tapping again`);
      assert(!['INPUT', 'SELECT', 'TEXTAREA'].includes(opening.focusTag), `${name} must not summon a keyboard or picker on opening`);
      assert(await dialog.evaluate(node => document.activeElement === document.getElementById(node.getAttribute('aria-labelledby'))), `${name} must start with focus on its title`);
      await dialog.evaluate(node => Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished)));
      return dialog;
    };
    const keyboardCheck = async (dialog, controls) => {
      await page.evaluate(() => {
        Object.defineProperty(visualViewport, 'height', { configurable: true, value: 300 });
        Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, value: 60 });
        visualViewport.dispatchEvent(new Event('resize'));
        visualViewport.dispatchEvent(new Event('scroll'));
      });
      for (const control of controls) {
        await control.scrollIntoViewIfNeeded();
        const rect = await control.boundingBox();
        assert(rect.y >= 59 && rect.y + rect.height <= 361, `Popup control must remain reachable above keyboard: ${JSON.stringify(rect)}`);
        assert(await control.evaluate(node => {
          const r = node.getBoundingClientRect();
          return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }), 'Keyboard must not obscure popup controls');
      }
      await page.evaluate(() => {
        delete visualViewport.height;
        delete visualViewport.offsetTop;
        visualViewport.dispatchEvent(new Event('resize'));
      });
    };
    const selectTab = async name => {
      if (name === 'Category') {
        await page.getByRole('button', { name: 'More', exact: true }).click();
        await page.locator('#mobile-more-navigation').getByRole('button', { name, exact: true }).click();
      } else {
        await page.locator('nav:visible').getByRole('button', { name, exact: true }).click();
      }
    };
    for (const width of [320, 390, 430, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      for (const tab of ['Reports', 'Category']) {
        await selectTab(tab);
        const launcher = page.getByRole('button', { name: 'Export data', exact: true });
        await launcher.scrollIntoViewIfNeeded();
        const scrollY = await page.evaluate(() => window.scrollY);
        await launcher.click();
        const dialog = await checkOpening('Export data');
        await dialog.getByLabel('Export period', { exact: true }).selectOption('dates');
        await keyboardCheck(dialog, [dialog.getByRole('button', { name: 'Close data export' }), dialog.getByLabel('To date', { exact: true }), dialog.getByRole('button', { name: 'Download JSON' })]);
        await dialog.getByRole('button', { name: 'Close data export' }).click();
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        assert.equal(await page.evaluate(() => window.scrollY), scrollY, 'Export must restore the background position');
        await launcher.click();
        await checkOpening('Export data');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      }
      if (width < 768) {
        await selectTab('Reports');
        await page.getByRole('button', { name: /^Filters/ }).click();
        const dialog = await checkOpening('Report filters');
        await keyboardCheck(dialog, [dialog.getByRole('button', { name: 'Close report filters' }), dialog.getByRole('button', { name: 'Apply', exact: true })]);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      }
      await selectTab('Dashboard');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const scrollY = await page.evaluate(() => window.scrollY);
      await page.getByRole('button', { name: 'Quick add', exact: true }).click();
      const quickAdd = await checkOpening('Quick add');
      await quickAdd.getByRole('textbox', { name: 'Amount', exact: true }).fill('10');
      await quickAdd.locator('button[type="submit"]').click();
      const signup = await checkOpening('Create an account to save this');
      await keyboardCheck(signup, [signup.getByRole('button', { name: 'Create free account' }), signup.getByRole('button', { name: 'Keep looking around' })]);
      await signup.getByRole('button', { name: 'Keep looking around' }).click();
      await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
      assert.equal(await page.locator('dialog[open]').count(), 1);
      assert.equal(await page.evaluate(() => document.body.style.position), 'fixed', 'A nested popup must keep the background locked');
      await quickAdd.getByRole('button', { name: 'Close quick add' }).click();
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.equal(await page.evaluate(() => window.scrollY), scrollY);
      assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS (${engine}): Native modal opening uses safe resting bounds and title focus; animated sheets support keyboard panning, reopening and nested scroll locks.`);
  } catch (error) {
    await page.screenshot({ path: `artifacts/ui/mobile-popups-failure-${engine}.png` });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
