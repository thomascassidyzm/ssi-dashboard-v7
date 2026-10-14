// Screenshots + phone click-through video of the three mockups (job #419). Local file:// pages only;
// no network. Usage: node shoot-mockups.cjs <out-dir>   (needs the dashboard repo's playwright)
const path = require('path');
const { chromium } = require(process.env.PW || '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/node_modules/playwright');
const OUT = process.argv[2]; const DIR = path.resolve(__dirname, '..');
const W = (p, ms = 700) => p.waitForTimeout(ms);
const OPTS = {
  a: { file: 'option-a-prompter.html', flow: async (p, shot) => {
    await shot('1-ready'); await W(p, 900);
    await p.click('#go'); await W(p, 1500); await shot('2-live');
    for (let k = 0; k < 3; k++) { await p.click('#next'); await W(p, 1100); }
    await W(p, 900); await shot('3-live-after-3');
    await p.click('#pause'); await W(p, 900); await shot('4-paused'); await p.click('#play'); await W(p, 1200);
    await p.click('#back'); await W(p, 900); await p.click('#next'); await W(p, 900); await p.click('#next'); await W(p, 1500);
    await p.click('#stop'); await W(p, 1200); await shot('5-done'); } },
  b: { file: 'option-b-script.html', flow: async (p, shot) => {
    await shot('1-ready'); await p.click('#go'); await W(p, 1500); await shot('2-live');
    for (let k = 0; k < 3; k++) { await p.click('#next'); await W(p, 1100); }
    await W(p, 900); await shot('3-live-after-3');
    await p.click('#pause'); await W(p, 1000); await shot('4-paused-fix');
    await p.click('[data-redo="1"]'); await W(p, 1300); await shot('5-reading-again'); await p.click('#next'); await W(p, 1500);
    await p.click('#next'); await W(p, 900); await p.click('#stop'); await W(p, 1200); } },
  c: { file: 'option-c-sets.html', flow: async (p, shot) => {
    await shot('1-ready'); await p.click('#go'); await W(p, 1500); await shot('2-live');
    for (let k = 0; k < 4; k++) { await p.click('#next'); await W(p, 800); }
    await shot('3-live-line5'); await p.click('#pause'); await W(p, 900); await shot('4-paused'); await p.click('#pause'); await W(p, 600);
    for (let k = 0; k < 6; k++) { await p.click('#next'); await W(p, 500); }
    await W(p, 1600); await shot('5-set-check');
    await p.click('[data-redo="3"]'); await W(p, 1300); await p.click('#next'); await W(p, 1700); await p.click('#go'); await W(p, 1300); } },
};
(async () => {
  const b = await chromium.launch();
  for (const [key, o] of Object.entries(OPTS)) {
    for (const [size, vp, mobile] of [['phone', { width: 390, height: 844 }, true], ['desktop', { width: 1440, height: 900 }, false]]) {
      const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, colorScheme: 'light',
        recordVideo: size === 'phone' ? { dir: OUT + '/vid-' + key, size: vp } : undefined });
      const p = await ctx.newPage();
      await p.goto('file://' + path.join(DIR, o.file)); await W(p, 600);
      await o.flow(p, (name) => p.screenshot({ path: `${OUT}/${key}-${size}-${name}.png` }));
      await W(p, 600); await ctx.close();
    }
  }
  await b.close();
})();
