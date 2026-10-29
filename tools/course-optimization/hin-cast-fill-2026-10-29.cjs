#!/usr/bin/env node
'use strict';
// Hindi cast-and-fill (job #563, Kai 29 Oct 2026): fill the silent Hindi (and 9 English) slots through the ONE audio route
// (POST /api/audio/render: library first, spend guard, ONE render, no retries), then file each clip into its slot with link-clip.
//   node …cjs plan <list.json>                       # counts + characters per set, no calls
//   node …cjs dry|render <log.jsonl> <set> [--limit N] # set = hin-target | hin-known-en | efh-known ; one call per distinct (course,role,text); stops on 402/network failure
//   node …cjs link-dry|link <log.jsonl> <set> <list.json>  # POST link-clip (fill-only) for every slot whose (role,text) has a logged clip
const fs = require('fs');
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'kai-563-hin-cast-and-fill';
const PURPOSE = 'job #563 Hindi cast-and-fill (Kai 29 Oct 2026)';
// A practice phrase's id is '<course>:<id>' (course_practice_phrases.id); the lists carry the bare form.
const slotOf = (id, course) => /^S\d{4}$/.test(id) ? { seedNumber: Number(id.slice(1)) } : /^S\d{4}L\d{2}$/.test(id) ? { legoId: id } : { phraseId: id.includes(':') ? id : `${course}:${id}` };

async function efhKnownEmpties() {
  const j = await (await fetch(`${POPTY}/api/production/eng_for_hin/seeds`)).json();
  const out = [];
  for (const n of [607, 117]) {
    const s = j.seeds.find((x) => x.seed_number === n);
    const chk = (o, id) => { if (!o.known_audio_id) out.push({ id, role: 'known', text: o.known_text }); };
    chk(s, `S${String(n).padStart(4, '0')}`);
    for (const l of s.legos) { chk(l, l.lego_id); for (const p of l.basket_phrases || []) chk(p, p.id || p.phrase_id); }
  }
  return out;
}

async function slots(set, listFile) {
  if (set === 'efh-known') return (await efhKnownEmpties()).map((e) => ({ course: 'eng_for_hin', ...e }));
  const j = JSON.parse(fs.readFileSync(listFile, 'utf8'));
  if (set === 'hin-target') return j.target_slots_to_render.map(([id, , role, text]) => ({ course: 'hin_for_eng', id, role, text }));
  if (set === 'hin-known-en') return j.known_slots.map(([id, text]) => ({ course: 'hin_for_eng', id, role: 'known', text }));
  throw new Error('set?');
}

const call = async (path, body) => {
  const r = await fetch(`${POPTY}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

(async () => {
  const [mode, a, b, c, d] = process.argv.slice(2);
  if (mode === 'plan') {
    for (const set of ['hin-target', 'hin-known-en', 'efh-known']) {
      const s = await slots(set, a); const k = new Map(s.map((x) => [`${x.course}\0${x.role}\0${x.text}`, x]));
      console.log(set, 'slots', s.length, 'distinct asks', k.size, 'chars', [...k.values()].reduce((n, x) => n + [...x.text].length, 0));
    }
    return;
  }
  if (mode === 'dry' || mode === 'render') {
    const log = a, set = b, li = process.argv.indexOf('--limit'), limit = li > 0 ? Number(process.argv[li + 1]) : Infinity;
    const seen = new Set(fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((l) => l.status === 200).map((l) => l.k) : []);
    const asks = new Map(); for (const x of await slots(set, process.argv[process.argv.indexOf(set) + 1])) asks.set(`${x.course}\0${x.role}\0${x.text}`, x);
    let n = 0;
    for (const [k, x] of asks) {
      if (seen.has(k)) continue; if (n++ >= limit) break;
      let r; // Popty restarts on every deploy. A dropped connection (status 0) waits and asks the SAME words again: the route is library-first, so a clip
      // that was in fact rendered before the drop is linked free, never paid twice. A refusal or 402 is an answer and is never retried.
      for (let t = 0; t < 10; t++) {
        try { r = await call('/api/audio/render', { courseCode: x.course, role: x.role, text: x.text, purpose: PURPOSE, dryRun: mode === 'dry' }); } catch (e) { r = { status: 0, body: { error: String(e.name) } }; }
        if (r.status !== 0) break;
        await new Promise((res) => setTimeout(res, 45000));
      }
      fs.appendFileSync(log, JSON.stringify({ k, course: x.course, role: x.role, text: x.text, status: r.status, body: r.body }) + '\n');
      if (r.status !== 200) { console.log('STOP', r.status, JSON.stringify(r.body).slice(0, 300)); break; }
    }
    console.log('done', n, 'asks this run of', asks.size);
    return;
  }
  if (mode === 'link-dry' || mode === 'link') {
    const log = a, set = b;
    const clip = new Map(); for (const l of fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((x) => JSON.parse(x))) if (l.body && l.body.audioId && !l.body.dryRun) clip.set(l.k, l.body.audioId);
    const s = (await slots(set, c)).filter((x) => clip.has(`${x.course}\0${x.role}\0${x.text}`));
    const course = s.length ? s[0].course : null;
    const links = s.map((x) => ({ ...slotOf(x.id, x.course), role: x.role, audioId: clip.get(`${x.course}\0${x.role}\0${x.text}`) }));
    // link-clip takes at most 500 links a request.
    let ok = 0, linked = 0; const bad = []; let status = 0;
    for (let i = 0; i < links.length; i += 400) {
      const r = await call(`/api/production/${course}/link-clip`, { links: links.slice(i, i + 400), dryRun: mode === 'link-dry' });
      status = r.status; ok += (r.body.results || []).filter((x) => x.ok).length; linked += r.body.linked || 0; bad.push(...(r.body.results || []).filter((x) => !x.ok));
      if (!r.body.results) { console.log(r.status, JSON.stringify(r.body).slice(0, 300)); break; }
    }
    const codes = {}; for (const x of bad) codes[x.code] = (codes[x.code] || 0) + 1;
    console.log(status, 'links', links.length, 'ok', ok, 'linked', linked, 'refused', bad.length, JSON.stringify(codes), JSON.stringify(bad.slice(0, 3)));
    return;
  }
  console.error('usage: plan | dry|render | link-dry|link'); process.exit(1);
})();
