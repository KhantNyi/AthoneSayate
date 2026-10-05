/* Exercise actual rendered poses at controlled animation times, including
   interruption. This avoids timing-sensitive sleeps on loaded CI machines. */
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
    await page.evaluate(() => {
      window.freezePopups = true;
      window.popupLayouts = [];
      const original = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function () {
        original.call(this);
        const sheet = this.querySelector('.liquid-sheet');
        window.popupLayouts.push({ name: this.getAttribute('aria-labelledby'), sheet: sheet.getBoundingClientRect().toJSON(), dialog: this.getBoundingClientRect().toJSON(), focus: document.activeElement.id });
      };
      const seen = new WeakSet();
      new MutationObserver(() => {
        for (const popup of document.querySelectorAll('dialog[open], #mobile-more-navigation')) {
          for (const animation of popup.getAnimations({ subtree: true })) {
            if (seen.has(animation)) continue;
            seen.add(animation);
            if (window.freezePopups) { animation.pause(); animation.currentTime = 0; }
          }
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'data-state'] });
    });
    const launcher = page.getByRole('button', { name: 'Quick add', exact: true });
    const dialog = page.locator('dialog[aria-labelledby="quick-add-title"]');
    const paused = popup => popup.evaluate(node => {
      const animations = node.getAnimations({ subtree: true });
      return animations.length && animations.every(animation => animation.playState === 'paused');
    });
    const pose = popup => popup.evaluate(node => {
      const sheet = node.querySelector('.liquid-sheet') || node;
      return { sheet: sheet.getBoundingClientRect().toJSON(), dialog: node.getBoundingClientRect().toJSON(), opacity: Number(getComputedStyle(sheet).opacity), backdrop: node instanceof HTMLDialogElement ? Number(getComputedStyle(node, '::backdrop').opacity) : null };
    });
    const at = (popup, time) => popup.evaluate((node, ms) => node.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = ms; }), time);
    const finish = popup => popup.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
    const closed = () => page.waitForFunction(() => !document.querySelector('dialog[open]'));
    const open = async () => {
      await launcher.evaluate(node => { node.focus(); node.click(); });
      await dialog.waitFor();
      assert(await paused(dialog), 'Capture the entrance before its first visible frame');
    };

    await open();
    const layout = await page.evaluate(() => popupLayouts.at(-1));
    assert(layout.sheet.y >= 0 && layout.sheet.bottom <= 845, 'Native focus must use resting sheet bounds');
    assert.equal(layout.focus, 'quick-add-title');
    const first = await pose(dialog);
    assert(first.sheet.y >= 844, 'The first visual pose must start below the viewport');
    assert.equal(first.opacity, 0, 'No flash of the fully visible sheet');
    assert.equal(first.backdrop, 0, 'Backdrop starts transparent');
    await at(dialog, 60);
    const middle = await pose(dialog);
    assert(middle.sheet.y < first.sheet.y && middle.sheet.y > layout.sheet.y, 'Sheet must visibly glide toward its resting bounds');
    assert(middle.opacity > 0 && middle.opacity < 1);
    assert(middle.backdrop > 0 && middle.backdrop < 1);
    assert.deepEqual(middle.dialog, layout.dialog, 'Native viewport container must stay stationary');
    await page.screenshot({ path: `artifacts/ui/popup-mid-${engine}.png` });
    await finish(dialog);
    await page.waitForFunction(() => document.querySelector('dialog[open] .liquid-sheet').getAnimations().length === 0);
    assert(Math.abs((await pose(dialog)).sheet.y - layout.sheet.y) < 1);
    assert.equal(await dialog.locator('form').evaluate(node => node.style.willChange), '', 'Release the compositing hint after playback');
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('17');

    await page.evaluate(() => document.querySelector('button[aria-label="Close quick add"]').click());
    assert(await paused(dialog));
    await at(dialog, 80);
    const exiting = await pose(dialog);
    await page.waitForTimeout(260);
    assert.equal(await dialog.evaluate(node => node.open), true, 'Animation completion must own closure instead of a timer');
    assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
    await dialog.locator('button[type="submit"]').evaluate(node => node.click());
    assert.equal(await page.locator('dialog[open]').count(), 1, 'Closing sheets must reject a late form activation');
    await launcher.evaluate(node => node.click());
    assert(await paused(dialog));
    const reopening = await pose(dialog);
    assert(Math.abs(exiting.sheet.y - reopening.sheet.y) < 1, 'Reopen from the currently displayed position');
    assert(Math.abs(exiting.opacity - reopening.opacity) < .01);
    assert(Math.abs(exiting.backdrop - reopening.backdrop) < .01);
    assert.equal(await dialog.getByRole('textbox', { name: 'Amount', exact: true }).inputValue(), '17');
    await finish(dialog);
    await page.keyboard.press('Escape');
    assert(await paused(dialog));
    await at(dialog, 120);
    const dismissing = await pose(dialog);
    assert(dismissing.sheet.y > layout.sheet.y && dismissing.opacity < 1, 'Dismissal slides downward and fades');
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true, 'Focus stays in the dialog through exit');
    await finish(dialog);
    await closed();
    assert(await launcher.evaluate(node => document.activeElement === node), 'Restore focus after completed exit');
    assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed');

    // A real early touch must settle before default input focus/keyboard work.
    await open();
    await at(dialog, 100);
    const amount = dialog.getByRole('textbox', { name: 'Amount', exact: true });
    const inputBounds = await amount.boundingBox();
    await page.touchscreen.tap(inputBounds.x + inputBounds.width / 2, inputBounds.y + inputBounds.height / 2);
    assert(await amount.evaluate(node => document.activeElement === node));
    assert.equal(await dialog.locator('form').evaluate(node => getComputedStyle(node).transform), 'none');
    await page.keyboard.press('Escape');
    await finish(dialog);
    await closed();

    // A cancelled touch or a release without activation must not leave the
    // presentation frozen partway through its entrance.
    for (const release of ['pointercancel', 'pointerup']) {
      await open();
      await at(dialog, 100);
      await amount.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
      await amount.dispatchEvent(release, { pointerType: 'touch', isPrimary: true });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('dialog[open] .liquid-sheet')).transform === 'none');
      await page.keyboard.press('Escape');
      await finish(dialog);
      await closed();
    }

    // The keyboard can resize the viewport while the entrance is still moving.
    await open();
    await page.evaluate(() => {
      Object.defineProperty(visualViewport, 'height', { configurable: true, value: 300 });
      Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, value: 60 });
      visualViewport.dispatchEvent(new Event('resize'));
    });
    const keyboard = await pose(dialog);
    assert(keyboard.sheet.y >= 59 && keyboard.sheet.bottom <= 361);
    assert.equal(keyboard.opacity, 1);
    const close = dialog.getByRole('button', { name: 'Close quick add' });
    await close.scrollIntoViewIfNeeded();
    assert(await close.evaluate(node => { const r = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }));
    await page.keyboard.press('Escape');
    await at(dialog, 70);
    await page.evaluate(() => { delete visualViewport.height; delete visualViewport.offsetTop; visualViewport.dispatchEvent(new Event('resize')); });
    await finish(dialog);
    await closed();

    // Centered child popups keep the parent's focus and scroll lock alive.
    await open();
    await finish(dialog);
    await amount.fill('10');
    await dialog.locator('button[type="submit"]').click();
    const signup = page.getByRole('dialog', { name: 'Create an account to save this', exact: true });
    assert(await paused(signup));
    const signupLayout = await page.evaluate(() => popupLayouts.at(-1));
    const signupFirst = await pose(signup);
    assert(signupFirst.sheet.y > signupLayout.sheet.y && signupFirst.sheet.width < signupLayout.sheet.width, 'Centered popup lifts and scales');
    await finish(signup);
    await page.keyboard.press('Escape');
    await finish(signup);
    await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
    assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
    assert(await dialog.evaluate(node => node.contains(document.activeElement)));
    await page.keyboard.press('Escape');
    await finish(dialog);
    await closed();

    const moreButton = page.getByRole('button', { name: 'More', exact: true });
    const more = page.locator('#mobile-more-navigation');
    await moreButton.evaluate(node => node.click());
    assert(await paused(more));
    const moreFirst = await pose(more);
    await at(more, 80);
    const moreMiddle = await pose(more);
    assert(moreMiddle.sheet.y < moreFirst.sheet.y && moreMiddle.opacity > moreFirst.opacity, 'More menu visibly lifts and fades');
    await finish(more);
    await page.keyboard.press('Escape');
    await at(more, 90);
    const moreExiting = await pose(more);
    await moreButton.evaluate(node => node.click());
    assert(await paused(more));
    assert(Math.abs((await pose(more)).sheet.y - moreExiting.sheet.y) < 1, 'Menu reopening retains its displayed position');
    await finish(more);
    await page.keyboard.press('Escape');
    await finish(more);
    await more.waitFor({ state: 'detached' });
    assert(await moreButton.evaluate(node => node === document.activeElement));

    await open();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal((await pose(dialog)).opacity, 1, 'Changing motion preference settles the entrance');
    await page.keyboard.press('Escape');
    await closed();
    await launcher.click();
    assert.equal(await dialog.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => Number(animation.effect.getTiming().duration) > 1).length), 0, 'Reduced motion skips popup animation');
    await page.keyboard.press('Escape');
    await closed();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open();
    await finish(dialog);
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await closed();
    assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await open();
    await finish(dialog);
    await amount.fill('10');
    await dialog.locator('button[type="submit"]').click();
    await signup.getByRole('button', { name: 'Create free account' }).evaluate(node => node.click());
    assert.notEqual(await page.evaluate(() => document.body.style.position), 'fixed', 'Unmount during child entrance releases every scroll lock');
    assert.deepEqual(errors, []);
    console.log(`PASS (${engine}): Visible popup motion, first-paint poses, completion-owned exits, continuous reopen, early touch/keyboard resizing, nested dialogs, reduced motion and unmount cleanup.`);
  } catch (error) {
    await page.screenshot({ path: `artifacts/ui/popup-motion-failure-${engine}.png` });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
