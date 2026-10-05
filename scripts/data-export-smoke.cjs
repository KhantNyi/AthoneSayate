const assert = require('node:assert/strict');
const fs = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const engine = process.env.BROWSER_ENGINE || 'chromium';
  const browser = await playwright[engine].launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference', acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('artifacts/ui', { recursive: true });
  try {
    await page.goto(process.env.UI_URL || 'http://localhost:3100', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
    await page.locator('nav:visible').getByRole('button', { name: 'Reports', exact: true }).click();
    const launch = page.getByRole('button', { name: 'Export data', exact: true });
    // WebKit touch taps do not focus buttons. Establish a keyboard focus
    // origin so restoration is checked consistently in both browser engines.
    await launch.focus();
    await launch.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Export data', exact: true });
    await dialog.waitFor();
    await dialog.evaluate(node => Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished)));
    const downloadFile = async (format) => {
      const waiting = page.waitForEvent('download');
      await dialog.getByRole('button', { name: `Download ${format}` }).click();
      const download = await waiting;
      const filepath = `artifacts/ui/${download.suggestedFilename()}`;
      await download.saveAs(filepath);
      return { filename: download.suggestedFilename(), content: fs.readFileSync(filepath, 'utf8') };
    };
    const allFile = await downloadFile('JSON');
    const all = JSON.parse(allFile.content);
    assert.equal(all.metadata.source, 'demo');
    assert.equal(all.metadata.currency, 'THB');
    assert.equal(all.metadata.period.mode, 'all');
    assert(all.transactions.length > 0);
    assert.equal(all.summary.totals.transactionCount, all.transactions.length);
    assert(all.transactions.every(tx => tx.categoryName && tx.subcategoryName && tx.accountName));
    assert(all.categories.length && all.subcategories.length && all.accounts.length && all.goals.length && all.recurringRules.length);
    assert.equal(allFile.filename, 'athonesayate-sample-all-data.json');
    const fromMonth = all.transactions[0].occurredOn.slice(0, 7);
    const toMonth = all.transactions.at(-1).occurredOn.slice(0, 7);
    await dialog.getByLabel('Export period', { exact: true }).selectOption('months');
    await dialog.getByLabel('From month', { exact: true }).fill(fromMonth);
    await dialog.getByLabel('To month', { exact: true }).fill(toMonth);
    const months = JSON.parse((await downloadFile('JSON')).content);
    assert.equal(months.transactions.length, all.transactions.length, 'Month-to-month range should retain every matching transaction');
    await dialog.getByLabel('Export period', { exact: true }).selectOption('dates');
    const date = all.transactions[0].occurredOn.slice(0, 10);
    await dialog.getByLabel('From date', { exact: true }).fill(date);
    await dialog.getByLabel('To date', { exact: true }).fill(date);
    const daily = JSON.parse((await downloadFile('JSON')).content);
    assert.deepEqual(daily.transactions.map(tx => tx.id), all.transactions.filter(tx => tx.occurredOn.slice(0, 10) === date).map(tx => tx.id));
    await dialog.getByLabel('File format', { exact: true }).selectOption('csv');
    const csv = await downloadFile('CSV');
    assert(csv.content.startsWith('\uFEFFid,date,type,amount,currency,'));
    assert(csv.content.includes('THB'));
    await dialog.getByLabel('From date', { exact: true }).fill('2030-01-02');
    await dialog.getByLabel('To date', { exact: true }).fill('2030-01-01');
    assert(await dialog.getByRole('button', { name: 'Download CSV' }).isDisabled());
    assert(await dialog.getByRole('alert').isVisible());
    await dialog.getByLabel('From date', { exact: true }).fill('2030-01-01');
    assert(await dialog.getByText(/0 transactions selected/).isVisible());
    await dialog.getByLabel('File format', { exact: true }).selectOption('json');
    const empty = JSON.parse((await downloadFile('JSON')).content);
    assert.equal(empty.transactions.length, 0);
    assert.equal(empty.summary.totals.expenses, 0);
    for (const width of [320, 390, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      await page.waitForFunction(height => document.querySelector('dialog[open]').getBoundingClientRect().height <= height, page.viewportSize().height);
      const sheet = await dialog.locator('form').boundingBox();
      assert(sheet.y >= 0 && sheet.y + sheet.height <= page.viewportSize().height + 1, `Export sheet height at ${width}: ${JSON.stringify(sheet)}`);
      const overflow = await dialog.locator('input, select, button').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 1; }).map(node => node.outerHTML));
      assert.deepEqual(overflow, [], `Export control overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/ui/data-export-mobile.png' });
    await dialog.getByRole('button', { name: 'Close data export' }).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert(await launch.evaluate(node => node === document.activeElement), 'Export focus must restore to its launcher');
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.locator('#mobile-more-navigation').getByRole('button', { name: 'Category', exact: true }).click();
    await page.getByRole('button', { name: 'Export data', exact: true }).click();
    assert(await dialog.isVisible(), 'Export must be available in Settings');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.deepEqual(errors, []);
    console.log(`PASS (${engine}): Mobile JSON/CSV downloads, all/month/date selections, range validation, empty exports, categorization, Settings access and focus restoration.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
