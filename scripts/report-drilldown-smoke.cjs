/* Local fixture check. Uses the same PLAYWRIGHT_MODULE / BROWSER_EXECUTABLE /
   UI_URL / BROWSER_ENGINE options as the other browser smoke checks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const food = '00000000-0000-4000-8000-000000000101';
const travel = '00000000-0000-4000-8000-000000000102';
const meal = '00000000-0000-4000-8000-000000000201';
const drink = '00000000-0000-4000-8000-000000000202';
const taxi = '00000000-0000-4000-8000-000000000203';
const cash = '00000000-0000-4000-8000-000000000301';
const card = '00000000-0000-4000-8000-000000000302';
const tx = (id, date, amount, overrides = {}) => ({ id, occurred_on: date, amount, type: 'expense', category_id: food,
  subcategory_id: meal, account_id: cash, merchant: 'Lunch fixture', notes: '', is_recurring: false, ...overrides });
const fixture = {
  accounts: [{ id: cash, name: 'Cash', type: 'cash', opening_balance: 10000, color: '#3d7485' }, { id: card, name: 'Card', type: 'checking', opening_balance: 10000, color: '#bd5b4b' }],
  categories: [{ id: food, name: 'Food', kind: 'expense', icon: 'tag', color: '#bd5b4b', monthly_budget: 1000 }, { id: travel, name: 'Travel', kind: 'expense', icon: 'tag', color: '#3d7485', monthly_budget: 500 }],
  subcategories: [{ id: meal, category_id: food, name: 'Meal' }, { id: drink, category_id: food, name: 'Drink' }, { id: taxi, category_id: travel, name: 'Taxi' }],
  transactions: [
    ...Array.from({ length: 65 }, (_, i) => tx(`jan-meal-${i}`, `2026-01-0${i % 2 + 1}`, 10.25)),
    tx('jan-recurring', '2026-01-01', 30.5, { is_recurring: true }),
    tx('jan-drink', '2026-01-02', 20, { subcategory_id: drink, account_id: card, merchant: 'Coffee' }),
    tx('jan-none', '2026-01-03', 7.5, { subcategory_id: null, merchant: 'Food miscellaneous' }),
    tx('jan-taxi', '2026-01-01', 15, { category_id: travel, subcategory_id: taxi, merchant: 'Taxi' }),
    tx('jan-archived', '2026-01-03', 4.75, { category_id: 'archived', subcategory_id: null, merchant: 'Archived expense' }),
    tx('dec-meal', '2025-12-31', 11),
    tx('dec-recurring', '2025-12-31', 12, { is_recurring: true }),
    tx('dec-drink', '2025-12-31', 5.5, { subcategory_id: drink, merchant: 'Coffee', is_recurring: true }),
    tx('dec-dinner', '2025-12-31', 9, { merchant: 'Dinner', is_recurring: true }),
    tx('income', '2026-01-01', 50000, { type: 'income' })
  ]
};

(async () => {
  const base = process.env.UI_URL || 'http://localhost:3100';
  assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run this fixture check against a local app');
  const config = fs.readFileSync('apps/web/.env.local', 'utf8');
  const supabaseUrl = new URL(config.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]);
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'report-fixture@example.com', aud: 'authenticated', role: 'authenticated' };
  const now = Math.floor(Date.now() / 1000);
  const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, exp: now + 3600, aud: 'authenticated' })).toString('base64url'), 'fixture'].join('.');
  const engine = process.env.BROWSER_ENGINE || 'chromium';
  const browser = await playwright[engine].launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  fs.mkdirSync('artifacts/ui', { recursive: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.addInitScript(({ user, token, now }) => {
          delete Navigator.prototype.serviceWorker;
          localStorage.setItem('athonesayate-auth', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: now + 3600,
            expires_in: 3600, token_type: 'bearer', user }));
        }, { user, token, now });
        // Every backend request is intercepted; no real credentials or account data leave the browser.
        await page.route(`${supabaseUrl.origin}/**`, route => {
          assert.equal(route.request().method(), 'GET', 'Report interactions must not write data');
          const table = new URL(route.request().url()).pathname.split('/').at(-1);
          return route.fulfill({ json: fixture[table] || [] });
        });
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.evaluate(() => {
          window.reportTransactionScrolls = 0;
          const scrollIntoView = Element.prototype.scrollIntoView;
          Element.prototype.scrollIntoView = function (...args) {
            if (this.id === 'report-transactions-title') window.reportTransactionScrolls += 1;
            return scrollIntoView.apply(this, args);
          };
        });
        await page.locator('nav:visible').getByRole('button', { name: 'Reports', exact: true }).click();
        const heading = page.locator('#report-transactions-title');
        const details = page.getByRole('region', { name: /transactions$/ });
        const month = page.locator('input[type="month"]:visible').first();
        const rows = () => details.locator(width < 768 ? 'article' : 'tbody tr');
        const activate = async (locator, key) => {
          if (key) { await locator.focus(); await locator.press(key); }
          else if (width < 768) await locator.tap();
          else await locator.click();
        };
        const assertSelection = async (title, count, total) => {
          await page.waitForFunction(({ title, count }) => {
            const h = document.getElementById('report-transactions-title');
            return h?.textContent.trim() === title && h.parentElement.querySelector('[role="status"]')?.textContent.startsWith(`${count} entries`);
          }, { title, count });
          const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(total);
          assert((await details.getByRole('status').textContent()).includes(money), 'Clicked amount must match the detail total');
        };
        const assertFocus = async () => {
          assert(await heading.evaluate(node => node === document.activeElement), 'Drill-down must focus the transaction heading');
          const rect = await heading.boundingBox();
          assert(rect.y >= 0 && rect.y < 900, 'Transaction heading must scroll into view');
        };
        const assertMonthHighlight = async monthKey => {
          assert.equal(await month.inputValue(), monthKey.slice(0, 7), 'Chart selection must synchronize the top month selector');
          const selected = page.locator(`[data-report-month="${monthKey}"]`);
          assert.equal(await selected.count(), 2);
          assert.deepEqual(await selected.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-pressed'))), ['true', 'true']);
          assert.equal(await page.locator('[data-report-month][aria-pressed="true"]').count(), 2, 'Only one month is selected');
          assert(await selected.filter({ has: page.locator('rect.fill-river') }).count(), 'Selected month bar must have a distinct fill');
        };
        const activateMonth = async (monthKey, target, key) => {
          const locator = page.locator(`[data-report-month="${monthKey}"][data-report-target="${target}"]`);
          await locator.scrollIntoViewIfNeeded();
          const before = await page.evaluate(() => ({ y: scrollY, scrolls: window.reportTransactionScrolls }));
          const choices = await page.locator('[data-report-target="label"]').evaluateAll(nodes => nodes.map(node => node.dataset.reportMonth));
          await activate(locator, key);
          await page.waitForFunction(monthKey => document.querySelector(`[data-report-month="${monthKey}"]`)?.getAttribute('aria-pressed') === 'true', monthKey);
          await assertMonthHighlight(monthKey);
          assert.deepEqual(await page.locator('[data-report-target="label"]').evaluateAll(nodes => nodes.map(node => node.dataset.reportMonth)), choices,
            'Changing months within the graph must preserve the six choices so users can switch back');
          const after = await page.evaluate(() => ({ y: scrollY, scrolls: window.reportTransactionScrolls, focus: document.activeElement?.id }));
          assert.equal(after.scrolls, before.scrolls, 'Month selection must not request a transaction-list scroll');
          assert.notEqual(after.focus, 'report-transactions-title', 'Month selection must not move focus to transactions');
          assert(Math.abs(after.y - before.y) < 2, 'Month selection must stay at the graph');
        };
        const clear = () => details.getByRole('button', { name: 'Clear filters', exact: true }).click();
        await month.fill('2026-01');
        await assertSelection('January 2026 transactions', 70, 744);
        await assertMonthHighlight('2026-01-01');
        await page.screenshot({ path: `artifacts/ui/report-overview-${width}.png` });
        assert.equal(await rows().count(), 50);
        await details.getByRole('button', { name: 'Show more', exact: true }).click();
        assert.equal(await rows().count(), 70);
        await activate(page.getByRole('button', { name: 'View Meal expenses', exact: true }), 'Enter');
        await assertSelection('January 2026 transactions', 66, 696.75);
        await assertFocus();
        assert.equal(await rows().count(), 50, 'Changing selection resets the visible batch');
        assert((await rows().allTextContents()).every(text => text.includes('Food / Meal')));
        await details.getByRole('button', { name: 'Show more', exact: true }).click();
        assert.equal(await rows().count(), 66);
        await activate(page.getByRole('button', { name: 'View Meal expenses', exact: true }));
        await assertFocus();
        assert.equal(await rows().count(), 50, 'Repeating a drill-down resets the batch without toggling it off');
        await details.getByRole('button', { name: 'Remove Food filter', exact: true }).click();
        await assertSelection('January 2026 transactions', 70, 744);
        assert.equal(await details.getByRole('button', { name: 'Remove Meal filter', exact: true }).count(), 0);

        await activate(page.getByRole('button', { name: 'View Food expenses', exact: true }));
        await assertSelection('January 2026 transactions', 68, 724.25);
        await assertFocus();
        await activate(page.getByRole('button', { name: 'View Card account expenses', exact: true }));
        await assertSelection('January 2026 transactions', 1, 20);
        await clear();

        const day = page.locator('[data-report-day="2026-01-01"]');
        await activate(day, ' ');
        await assertSelection('Jan 1, 2026 transactions', 35, 383.75);
        await assertFocus();
        assert((await rows().allTextContents()).every(text => text.includes('Jan 1')));
        assert((await page.getByText('Total expenses', { exact: true }).locator('..').textContent()).includes('744'), 'Day selection must keep summary metrics monthly');
        await details.getByRole('button', { name: 'Remove Jan 1, 2026 filter', exact: true }).click();
        await assertSelection('January 2026 transactions', 70, 744);
        await activate(page.locator('[data-report-day="2026-01-31"]'));
        await assertSelection('Jan 31, 2026 transactions', 0, 0);
        await details.getByRole('button', { name: 'Back to charts', exact: true }).click();
        assert(await page.getByRole('heading', { name: 'Expense breakdowns' }).evaluate(node => node === document.activeElement));

        // Graph months behave like the top selector, retain position, and allow switching back.
        await activateMonth('2025-12-01', 'label', 'Enter');
        await assertSelection('December 2025 transactions', 4, 37.5);
        await activateMonth('2026-01-01', 'bar', ' ');
        await assertSelection('January 2026 transactions', 70, 744);
        await month.fill('2026-02');
        await assertSelection('February 2026 transactions', 0, 0);
        await assertMonthHighlight('2026-02-01');
        await activateMonth('2026-01-01', 'bar');
        await assertSelection('January 2026 transactions', 70, 744);
        await activateMonth('2025-11-01', 'label');
        await assertSelection('November 2025 transactions', 0, 0);

        // Compare rows, bars, total cards, absent subcategories, and zero values.
        await month.fill('2026-01');
        const compare = () => page.getByRole('button', { name: 'compare', exact: true }).click();
        await compare();
        await page.locator('input[type="month"]:visible').last().fill('2025-12');
        let choice = page.getByRole('button', { name: 'View Food expenses for December 2025', exact: true }).filter({ visible: true });
        await activate(choice.first());
        await assertSelection('December 2025 transactions', 4, 37.5);
        await assertFocus();
        await clear();
        await month.fill('2026-01');
        await compare();
        choice = page.getByRole('button', { name: 'View Travel expenses for December 2025', exact: true }).filter({ visible: true });
        await activate(choice.last(), 'Enter');
        await assertSelection('December 2025 transactions', 0, 0);
        await clear();
        await month.fill('2026-01');
        await activate(page.getByRole('button', { name: 'View Food expenses', exact: true }));
        await compare();
        await activate(page.getByRole('button', { name: 'View No subcategory expenses for January 2026', exact: true }).filter({ visible: true }).first());
        await assertSelection('January 2026 transactions', 1, 7.5);
        await assertFocus();
        assert(await details.getByRole('button', { name: 'Remove No subcategory filter', exact: true }).isVisible());
        await compare();
        await activate(page.getByRole('button', { name: 'View No subcategory expenses for December 2025', exact: true }).filter({ visible: true }).last());
        await assertSelection('December 2025 transactions', 0, 0);
        await clear();

        // Manual top filters compose with shortcuts and share the trend's predicate.
        await month.fill('2026-01');
        await activate(page.getByRole('button', { name: 'View Meal expenses', exact: true }));
        await page.getByRole('textbox', { name: 'Search monthly expenses', exact: true }).filter({ visible: true }).fill(' Lunch ');
        if (width < 768) {
          await page.getByRole('button', { name: /^Filters/ }).click();
          const filters = page.getByRole('dialog', { name: 'Report filters' });
          await filters.getByRole('button', { name: 'Recurring', exact: true }).click();
          await filters.getByRole('button', { name: 'Apply', exact: true }).click();
          await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        } else await page.getByRole('combobox', { name: 'Report recurring filter', exact: true }).selectOption('recurring');
        await assertSelection('January 2026 transactions', 1, 30.5);
        const decemberBar = page.locator('[data-report-month="2025-12-01"][data-report-target="bar"]');
        const decemberAmount = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(12);
        assert.equal(await decemberBar.locator('desc').textContent(), `${decemberAmount} expenses`, 'Trend must honor both subcategory and search, excluding recurring coffee and dinner');
        await activateMonth('2025-12-01', 'bar');
        await assertSelection('December 2025 transactions', 1, 12);
        await compare();
        await page.locator('input[type="month"]:visible').last().fill('2026-01');
        await activate(page.getByRole('button', { name: 'View all filtered expenses for January 2026', exact: true }));
        await assertSelection('January 2026 transactions', 1, 30.5);
        await assertFocus();
        await compare();
        await activate(page.getByRole('button', { name: 'View all filtered expenses for January 2026', exact: true }).first());
        await assertSelection('January 2026 transactions', 1, 30.5);
        await clear();
        await assertSelection('January 2026 transactions', 70, 744);

        // Switching away and back to a previous filter must still reset pagination.
        await details.getByRole('button', { name: 'Show more', exact: true }).click();
        await page.getByRole('textbox', { name: 'Search monthly expenses', exact: true }).filter({ visible: true }).fill('Lunch');
        await assertSelection('January 2026 transactions', 66, 696.75);
        await page.getByRole('textbox', { name: 'Search monthly expenses', exact: true }).filter({ visible: true }).fill('');
        await assertSelection('January 2026 transactions', 70, 744);
        assert.equal(await rows().count(), 50);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await activateMonth('2025-12-01', 'label');
        await assertSelection('December 2025 transactions', 4, 37.5);
        await activateMonth('2026-01-01', 'bar');
        await assertSelection('January 2026 transactions', 70, 744);
        await page.screenshot({ path: `artifacts/ui/report-month-selection-${width}.png` });
        await activate(page.getByRole('button', { name: 'View Meal expenses', exact: true }));
        assert(await heading.evaluate(node => node === document.activeElement), 'Normal-motion drill-down must focus details');
        await page.waitForFunction(() => {
          const y = document.getElementById('report-transactions-title').getBoundingClientRect().y;
          return y >= 0 && y < innerHeight;
        });
        await page.screenshot({ path: `artifacts/ui/report-drilldown-${width}.png` });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Report must fit the viewport');
        assert.deepEqual(errors, [], 'Browser runtime errors');
        console.log(`PASS (${engine}, ${width}px): Month selection stays at the graph, highlights and synchronizes the selected month, retains choices for switching back, and preserves report drill-downs, filters, pagination, keyboard/touch, and motion behavior.`);
      } catch (error) {
        await page.screenshot({ path: `artifacts/ui/report-drilldown-failure-${width}.png`, fullPage: true }).catch(() => {});
        throw error;
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
