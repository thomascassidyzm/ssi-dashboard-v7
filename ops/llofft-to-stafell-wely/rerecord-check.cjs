#!/usr/bin/env node
'use strict';
// Lists the Re-record card items mentioning llofft/stafell wely per booth voice (read-only, Popty).
(async () => {
  for (const v of process.argv.slice(2)) {
    const r = await (await fetch(`http://localhost:3470/api/recording/voice/${v}/rerecord`)).json();
    if (r.error) { console.log('==', v, r.error); continue; }
    const it = (r.items || []).filter((i) => /llofft|stafell wely/.test((i.oldText || '') + (i.text || '')));
    console.log('==', v, 'total', r.total, 'fresh', r.fresh, 'llofft items', it.length);
    it.forEach((i) => console.log(' ', i.why, '|', i.oldText, '->', i.text));
  }
})();
