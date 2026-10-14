// Usage: node shoot-staging-current.cjs <out-dir> [booth url] [prefix]. Needs the Private Network Access flag below: staging.popty.app calls the API on the tailnet host.
// Screenshot staging's batch recording screen. ALL non-GET requests are aborted: no take, no tick, no write.
const { chromium } = require('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/node_modules/playwright');
const OUT = process.argv[2];
const URL = process.argv[3] || 'https://staging.popty.app/r/human_aran_eng?track=seed.cym_nv2_for_eng&batch=1';
const PFX = process.argv[4] || 'current';
const blocked = [];
(async () => {
  const browser = await chromium.launch({ args: ['--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,LocalNetworkAccessChecks', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  for (const [name, vp, mobile] of [['phone', { width: 390, height: 844 }, true], ['desktop', { width: 1440, height: 900 }, false]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, colorScheme: 'light', permissions: ['microphone'] });
    await ctx.addInitScript(() => { try { localStorage.setItem('theme', 'light'); localStorage.setItem('popty-theme', 'light'); } catch {} });
    await ctx.route('**/*', r => { const m = r.request().method(); if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') { blocked.push(m + ' ' + r.request().url()); return r.abort(); } return r.continue(); });
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto', e.message));
    await p.waitForTimeout(4000);
    await p.screenshot({ path: `${OUT}/${PFX}-ready-${name}.png` });
    await p.screenshot({ path: `${OUT}/${PFX}-ready-${name}-full.png`, fullPage: true });
    console.log(name, 'text:', (await p.innerText('body')).slice(0, 1500).replace(/\n+/g, ' | '));
    // Turn auto-advance off so nothing moves on by itself, then start: the stage opens; Next is never pressed.
    const auto = p.locator('label.toggle-row:has-text("Move on by itself") input');
    if (await auto.count() && await auto.isChecked()) await auto.uncheck();
    const start = p.locator('button.btn-begin').first();
    if (await start.count()) {
      await start.click(); await p.waitForTimeout(3500);
      await p.screenshot({ path: `${OUT}/${PFX}-stage-${name}.png` });
      await p.screenshot({ path: `${OUT}/${PFX}-stage-${name}-full.png`, fullPage: true });
      console.log(name, 'STAGE:', (await p.innerText('body')).slice(0, 1500).replace(/\n+/g, ' | '));
      const pause = p.locator('button.ctl-pause'); if (await pause.count()) { await pause.click(); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/${PFX}-paused-${name}.png` }); }
    }
    await ctx.close();
  }
  await browser.close();
  console.log('BLOCKED writes:', blocked.length ? blocked : 'none attempted');
})();
