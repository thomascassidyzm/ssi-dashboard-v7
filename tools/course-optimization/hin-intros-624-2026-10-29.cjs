#!/usr/bin/env node
'use strict';
// Hindi presentation intros through the ONE audio route (job #624, Kai 29 Oct 2026; follow-up to #563).
// Text is never composed here: it is presentation-author's own render (renderIntro over the course's known-language template,
// frame A/B from its judge), and the clip goes through POST /api/audio/render with legoId so it links to the LEGO and overrides
// any legacy lego_introductions row. Kai's rules: the intro mirrors the LEGO (quotes its known_text byte-for-byte) and no
// target-language word is spoken except what the template itself carries.
//   node …cjs plan <out.json> [--efh-plan <eng-for-hin-reauthor-intros plan.json>]
//        hin_for_eng: every is_new LEGO with no presentation clip (a not-new LEGO's intro is never played); eng_for_hin: S0117L03, S0607L02
//   node …cjs dry|render <plan.json> <log.jsonl>      # one call per LEGO; a refusal is logged and never retried; stops on 402/network failure
const fs = require('fs');
const author = require('../../services/phases/presentation-author.cjs');
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'kai-624-hin-intros';
const PURPOSE = 'job #624 Hindi presentation intros (Kai 29 Oct 2026)';
// The active English-known template (presentation_templates, known_lang eng), as every linked eng intro reads: "The Italian for: 'seem', as in — '…', is:".
const ENG_TEMPLATE = "The {target_lang_name} for: '{known}', as in — '{seed}', is:";
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121';
const EFH_LEGOS = ['S0117L03', 'S0607L02'];

const getJson = async (p) => (await fetch(`${POPTY}${p}`)).json();
const post = async (p, body) => {
  const r = await fetch(`${POPTY}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

async function planHin() {
  const j = await getJson('/api/production/hin_for_eng/seeds');
  const items = [];
  for (const s of j.seeds) for (const l of s.legos) if (l.is_new && !l.presentation_audio_id) items.push({ lego_id: l.lego_id, known_text: l.known_text, target_text: l.target_text, seed: s.known_text });
  const judged = await author.judgeBatch(items.map((i) => ({ chunk: author.introChunk(i.known_text), form: i.target_text, seed: i.seed })), { knownLangName: 'English', targetLangName: 'Hindi' });
  return items.map((i, n) => {
    const frame = judged.frames[n] === 'B' ? 'B' : 'A';
    const text = author.renderIntro({ frame, template: ENG_TEMPLATE, targetLangName: 'Hindi', chunk: author.introChunk(i.known_text), seed: i.seed, knownLang: 'eng' });
    return { course: 'hin_for_eng', lego_id: i.lego_id, known_text: i.known_text, frame, text, flag: (judged.flags || []).filter((f) => f.index === n).map((f) => f.issue) };
  });
}

function planEfh(planFile) {
  const p = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  return EFH_LEGOS.map((id) => { const r = p.rows.find((x) => x.lego_id === id); return { course: 'eng_for_hin', lego_id: id, known_text: r.known_text, frame: r.frame, text: r.text, flag: [] }; });
}

(async () => {
  const [mode, a, b] = process.argv.slice(2);
  if (mode === 'plan') {
    const fi = process.argv.indexOf('--efh-plan');
    const rows = [...planEfh(process.argv[fi + 1]), ...(await planHin())];
    for (const r of rows) if (!r.text.includes(`'${author.introChunk(r.known_text)}'`)) throw new Error(`${r.lego_id}: intro does not quote its LEGO`);
    fs.writeFileSync(a, JSON.stringify(rows, null, 1));
    console.log('planned', rows.length, 'chars', rows.reduce((n, r) => n + [...r.text].length, 0));
    return;
  }
  if (mode === 'dry' || mode === 'render') {
    const rows = JSON.parse(fs.readFileSync(a, 'utf8'));
    const seen = new Set(fs.existsSync(b) ? fs.readFileSync(b, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((l) => l.status !== 0).map((l) => `${l.course}/${l.lego_id}`) : []);
    for (const r of rows) {
      if (seen.has(`${r.course}/${r.lego_id}`)) continue;
      // Job #705: the intro splicer renders a MISSING English piece as role 'known' in Charlotte, but resolveVoice says a hin_for_eng
      // English known slot is Tom-006, so the route refuses it (VOICE_POLICY). Until the splicer asks as role 'presentation' (which
      // resolves to Charlotte for a non-Tom-006 course), render each missing piece ourselves that way; the splice then finds it.
      if (mode === 'render' && r.course === 'hin_for_eng') {
        const d = await post('/api/audio/render', { courseCode: r.course, role: 'presentation', legoId: r.lego_id, text: r.text, purpose: PURPOSE, dryRun: true });
        for (const text of d.body.missing || []) await post('/api/audio/render', { courseCode: r.course, role: 'presentation', text, voiceId: CHARLOTTE, purpose: `${PURPOSE}: spliced intro piece` });
      }
      let res; // a dropped connection (Popty restarts on deploy) asks the SAME words again: library-first, so never paid twice
      for (let t = 0; t < 10; t++) {
        try { res = await post('/api/audio/render', { courseCode: r.course, role: 'presentation', legoId: r.lego_id, text: r.text, purpose: PURPOSE, dryRun: mode === 'dry' }); } catch (e) { res = { status: 0, body: { error: String(e.name) } }; }
        if (res.status !== 0) break;
        await new Promise((s) => setTimeout(s, 45000));
      }
      fs.appendFileSync(b, JSON.stringify({ course: r.course, lego_id: r.lego_id, text: r.text, status: res.status, body: res.body }) + '\n');
      // A refusal (403 VOICE_POLICY, say) is that LEGO's answer: logged, never retried, and the rest carry on. Only the spend cap (402) or a dead route stops the run.
      if (res.status !== 200) { console.log('REFUSED', r.lego_id, res.status, JSON.stringify(res.body).slice(0, 300)); if (res.status === 402 || res.status === 0) return; }
    }
    console.log('done', rows.length);
    return;
  }
  console.error('usage: plan | dry | render'); process.exit(1);
})();
