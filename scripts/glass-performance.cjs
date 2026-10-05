/* Comparable production interaction traces. These desktop/headless samples
   describe this machine, not physical mobile GPU or 120Hz performance. */
const fs = require('node:fs');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const label = process.env.GLASS_TRACE_LABEL || 'after';
  const browser = await playwright.chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  const output = 'artifacts/ui';
  fs.mkdirSync(output, { recursive: true });
  try {
    await page.goto(process.env.UI_URL || 'http://localhost:3100', { waitUntil: 'networkidle' });
    for (const name of ['Transactions', 'Reports', 'Dashboard']) {
      await page.locator('nav:visible').getByRole('button', { name, exact: true }).click();
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${output}/glass-${label}-mobile.png`, fullPage: true });
    const session = await page.context().newCDPSession(page);
    await session.send('Performance.enable');
    const before = (await session.send('Performance.getMetrics')).metrics;
    await session.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing', transferMode: 'ReturnAsStream' });
    await page.evaluate(() => {
      window.glassFrames = [];
      window.glassSampling = true;
      let previous = performance.now();
      const sample = now => {
        window.glassFrames.push(now - previous);
        previous = now;
        if (window.glassSampling) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    for (let i = 0; i < 3; i++) {
      for (const name of ['Transactions', 'Reports', 'Dashboard']) {
        await page.locator('nav:visible').getByRole('button', { name, exact: true }).click();
        await page.waitForTimeout(320);
      }
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#mobile-more-navigation').getAnimations().every(animation => animation.playState !== 'running'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(180);
      await page.getByRole('button', { name: 'Quick add', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('dialog[open]').getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
      await page.keyboard.press('Escape');
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
      await page.evaluate(() => new Promise(resolve => {
        const start = performance.now();
        const scroll = now => {
          const progress = Math.min((now - start) / 600, 1);
          window.scrollTo(0, Math.sin(progress * Math.PI) * 700);
          if (progress < 1) requestAnimationFrame(scroll); else resolve();
        };
        requestAnimationFrame(scroll);
      }));
    }
    const frames = await page.evaluate(() => { window.glassSampling = false; return window.glassFrames; });
    const completed = new Promise(resolve => session.once('Tracing.tracingComplete', resolve));
    await session.send('Tracing.end');
    const { stream } = await completed;
    let trace = '';
    while (true) {
      const chunk = await session.send('IO.read', { handle: stream });
      trace += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString() : chunk.data;
      if (chunk.eof) break;
    }
    await session.send('IO.close', { handle: stream });
    fs.writeFileSync(`${output}/glass-${label}-trace.json`, trace);
    const after = (await session.send('Performance.getMetrics')).metrics;
    const metric = (metrics, name) => metrics.find(item => item.name === name)?.value || 0;
    const ordered = [...frames].sort((a, b) => a - b);
    const summary = {
      label, browser: browser.version(), frames: frames.length,
      frameMedianMs: ordered[Math.floor(ordered.length * .5)],
      frameP95Ms: ordered[Math.floor(ordered.length * .95)],
      framesOver34ms: frames.filter(time => time > 34).length,
      scriptDurationMs: (metric(after, 'ScriptDuration') - metric(before, 'ScriptDuration')) * 1000,
      layoutDurationMs: (metric(after, 'LayoutDuration') - metric(before, 'LayoutDuration')) * 1000,
      taskDurationMs: (metric(after, 'TaskDuration') - metric(before, 'TaskDuration')) * 1000
    };
    fs.writeFileSync(`${output}/glass-${label}-metrics.json`, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
