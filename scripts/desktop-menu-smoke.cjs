const assert = require('node:assert/strict');
const fs = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const base = process.env.UI_URL || 'http://localhost:3100';
  assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run this fixture check against a local app');
  const config = fs.readFileSync('apps/web/.env.local', 'utf8');
  const supabaseUrl = new URL(config.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]);
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'a.very.long.email.address.that.should.stay.inside.the.sidebar@example.com', aud: 'authenticated', role: 'authenticated' };
  const now = Math.floor(Date.now() / 1000);
  // This is a local rendering fixture, not a real session. All backend requests
  // are intercepted below, so no credentials or account data are sent remotely.
  const token = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, exp: now + 3600, aud: 'authenticated' })).toString('base64url'),
    'fixture'
  ].join('.');
  const browser = await playwright[process.env.BROWSER_ENGINE || 'chromium'].launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 720 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('artifacts/ui', { recursive: true });
  try {
    await page.addInitScript(({ user, token, now }) => {
      // Keep service-worker network interception out of this layout fixture.
      delete Navigator.prototype.serviceWorker;
      localStorage.setItem('athonesayate-auth', JSON.stringify({
        access_token: token, refresh_token: 'fixture', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user
      }));
    }, { user, token, now });
    await page.route(`${supabaseUrl.origin}/**`, route => route.fulfill({ json: new URL(route.request().url()).pathname === '/rest/v1/accounts' ? [
      { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture account', type: 'checking', opening_balance: 1234567891234.5, color: '#2563eb', archived: false }
    ] : [] }));
    await page.goto(base, { waitUntil: 'networkidle' });
    const sidebar = page.locator('aside.liquid-chrome');
    await sidebar.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    // Windows WebKit reserves space for classic scrollbars. Compare the same
    // usable CSS width as Chromium, whose scrollbars overlay the content.
    const scrollbarWidth = await page.evaluate(() => innerWidth - document.documentElement.clientWidth);
    for (const language of ['en', 'my']) {
      if (language === 'my') await page.locator('header button[aria-pressed="false"]').click();
      for (const size of [{ width: 1280, height: 720 }, { width: 1440, height: 350 }, { width: 1600, height: 900 }]) {
        await page.setViewportSize({ width: size.width + scrollbarWidth, height: size.height });
        assert(await sidebar.evaluate(node => node.scrollWidth <= node.clientWidth), `Sidebar width overflow: ${language} ${JSON.stringify(size)}`);
        assert(await page.locator('header').evaluate(node => node.scrollWidth <= node.clientWidth), 'Top-right controls must fit the header');
        const nav = sidebar.getByRole('navigation');
        for (const button of await nav.getByRole('button').all()) {
          await button.scrollIntoViewIfNeeded();
          const rect = await button.boundingBox();
          assert(rect.x >= 0 && rect.x + rect.width <= 256 && rect.y >= 0 && rect.y + rect.height <= size.height + 1, 'Every navigation item must be reachable within the sidebar');
          await button.click();
          assert.equal(await button.getAttribute('aria-current'), 'page');
        }
        const signOut = sidebar.getByRole('button', { name: 'Sign out', exact: true });
        await signOut.scrollIntoViewIfNeeded();
        assert(await signOut.evaluate(node => {
          const rect = node.getBoundingClientRect();
          const card = node.parentElement.getBoundingClientRect();
          return rect.left >= card.left && rect.right <= card.right && rect.bottom <= innerHeight;
        }), 'Sign out must stay inside its profile card and remain reachable');
        const email = sidebar.getByText(user.email, { exact: true });
        assert(await email.evaluate(node => node.scrollWidth > node.clientWidth), 'A long email must truncate instead of widening the menu');
        assert.equal(await email.getAttribute('title'), user.email);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: `artifacts/ui/desktop-menu-${language}-${size.width}-${size.height}.png` });
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: Signed-in desktop menu fits long emails and large balances; all navigation and sign-out controls remain reachable in English/Myanmar and short desktop windows.');
  } catch (error) {
    await page.screenshot({ path: 'artifacts/ui/desktop-menu-failure.png' });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
