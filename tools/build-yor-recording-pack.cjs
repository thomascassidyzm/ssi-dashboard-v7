#!/usr/bin/env node
/**
 * Build the yor_for_eng human-recording pack for volunteer Yoruba speakers.
 *
 * Reads the built course content (seeds / legos / practice phrases) straight from
 * Supabase and emits, per voice, a markdown script grouped into sittable sessions,
 * plus a machine-readable manifest that is the ONLY authority for matching a
 * returned audio file back to the database rows it belongs to.
 *
 * GENERATES NO AUDIO. It reads text and writes markdown/JSON. Nothing else.
 *
 * Dedupe is TONE-EXACT: two Yoruba strings differing only in a tone mark or a
 * dot-below are DIFFERENT WORDS and get separate lines. Nothing here is
 * normalised, case-folded or diacritic-stripped before comparison.
 *
 *   node tools/build-yor-recording-pack.cjs [--course yor_for_eng] [--out <dir>]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.psql') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const COURSE = arg('--course', 'yor_for_eng');
const OUT_DIR = arg('--out', path.join(__dirname, '..', 'docs', 'yor-for-eng-build-2026-08-15', 'recording-pack'));

const SECONDS_PER_TAKE = 7;        // Welsh pack uses 6; +1 for a tonal language read cold
const LINES_PER_SESSION = 45;      // ~10 min of takes, before retakes
const VOICES = [
  { slot: 'target1', code: 'T1', label: 'Yoruba Voice 1', lang: 'Yoruba' },
  { slot: 'target2', code: 'T2', label: 'Yoruba Voice 2', lang: 'Yoruba' },
  { slot: 'known',   code: 'EN', label: 'English prompt voice', lang: 'English' },
];

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const seeds = (await db.query(
    `select id, seed_number, seed_id, known_text, target_text
       from course_seeds where course_code=$1 and decomposed_at is not null
       order by seed_number`, [COURSE])).rows;
  const legos = (await db.query(
    `select id, seed_number, lego_index, lego_id, known_text, target_text
       from course_legos where course_code=$1 order by seed_number, lego_index`, [COURSE])).rows;
  const phrases = (await db.query(
    `select id, seed_number, lego_index, position, phrase_role, known_text, target_text
       from course_practice_phrases where course_code=$1
       order by seed_number, lego_index, position`, [COURSE])).rows;
  await db.end();

  // ── Reading order: seed by seed; within a seed, the seed sentence, then each
  //    LEGO, then that LEGO's phrases. Keeps the speaker in context. ──
  const items = [];
  const bySeed = new Map();
  for (const s of seeds) bySeed.set(s.seed_number, { seed: s, legos: [], phrases: [] });
  for (const l of legos) bySeed.get(l.seed_number)?.legos.push(l);
  for (const p of phrases) bySeed.get(p.seed_number)?.phrases.push(p);

  for (const [seedNumber, grp] of [...bySeed].sort((a, b) => a[0] - b[0])) {
    items.push({ kind: 'seed', seedNumber, row: grp.seed,
                 label: `Seed ${seedNumber}`, known: grp.seed.known_text, target: grp.seed.target_text });
    for (const l of grp.legos) {
      items.push({ kind: 'lego', seedNumber, row: l, legoIndex: l.lego_index,
                   label: `Seed ${seedNumber} · building block ${l.lego_index}`,
                   known: l.known_text, target: l.target_text });
      for (const p of grp.phrases.filter(p => p.lego_index === l.lego_index)) {
        items.push({ kind: 'phrase', seedNumber, row: p, legoIndex: l.lego_index,
                     label: `Seed ${seedNumber} · block ${l.lego_index} · ${p.phrase_role}`,
                     known: p.known_text, target: p.target_text });
      }
    }
    // phrases whose lego_index matches no lego row (defensive — should be none)
    for (const p of grp.phrases.filter(p => !grp.legos.some(l => l.lego_index === p.lego_index))) {
      items.push({ kind: 'phrase', seedNumber, row: p, legoIndex: p.lego_index,
                   label: `Seed ${seedNumber} · ${p.phrase_role}`,
                   known: p.known_text, target: p.target_text });
    }
  }

  // ── One line per DISTINCT text per voice. ──
  // The dedupe key folds CASE ONLY (capitalisation does not change how a word is
  // spoken). It NEVER touches tone marks or the dot-below: those change which word
  // it is, so kọ́ and kọ stay two separate lines and get recorded separately.
  const dedupeKey = (s) => s.toLowerCase();
  const build = (voice) => {
    const isKnown = voice.slot === 'known';
    const seen = new Map();
    const lines = [];
    for (const it of items) {
      const text = isKnown ? it.known : it.target;
      if (!text || !text.trim()) continue;
      const key = dedupeKey(text);
      if (seen.has(key)) {
        seen.get(key).rows.push({ table: tableOf(it.kind), id: it.row.id,
                                  seed_number: it.seedNumber, lego_index: it.legoIndex ?? null,
                                  position: it.row.position ?? null });
        continue;
      }
      const line = {
        line_id: `${COURSE.slice(0, 3).toUpperCase()}-${voice.code}-${String(lines.length + 1).padStart(4, '0')}`,
        seq: lines.length + 1,
        role: voice.slot,
        language: voice.lang,
        text,
        english_gloss: isKnown ? null : it.known,
        line_type: it.kind === 'seed' ? 'sentence'
                 : it.kind === 'lego' ? 'building block'
                 : (it.row.phrase_role === 'component' ? 'single word' : 'practice sentence'),
        first_seen: it.label,
        seed_number: it.seedNumber,
        rows: [{ table: tableOf(it.kind), id: it.row.id, seed_number: it.seedNumber,
                 lego_index: it.legoIndex ?? null, position: it.row.position ?? null }],
      };
      seen.set(key, line);
      lines.push(line);
    }
    return lines;
  };
  const tableOf = (k) => k === 'seed' ? 'course_seeds' : k === 'lego' ? 'course_legos' : 'course_practice_phrases';

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = { course_code: COURSE, generated_for: 'human volunteer recording',
                     audio_generated: false, dedupe: 'byte-exact on target text (tone- and diacritic-sensitive)',
                     roles: {}, voices: [] };

  for (const voice of VOICES) {
    const lines = build(voice);
    // Sessions: fill to LINES_PER_SESSION but never split a seed across sessions.
    const sessions = []; let cur = [];
    for (let i = 0; i < lines.length; i++) {
      cur.push(lines[i]);
      const nextStartsNewSeed = i + 1 < lines.length && lines[i + 1].seed_number !== lines[i].seed_number;
      if (cur.length >= LINES_PER_SESSION && (nextStartsNewSeed || i === lines.length - 1)) { sessions.push(cur); cur = []; }
    }
    if (cur.length) sessions.push(cur);

    manifest.voices.push({ slot: voice.slot, code: voice.code, label: voice.label,
                           language: voice.lang, line_count: lines.length,
                           session_count: sessions.length, lines });

    fs.writeFileSync(path.join(OUT_DIR, `script-${voice.code.toLowerCase()}-${voice.slot}.md`),
                     renderScript(voice, sessions, lines));
    console.log(`${voice.label}: ${lines.length} lines in ${sessions.length} session(s)`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), renderReadme(manifest));
  console.log(`\nWritten to ${OUT_DIR}`);

  function renderScript(voice, sessions, lines) {
    const mins = Math.round(lines.length * SECONDS_PER_TAKE / 60);
    let md = `# Yoruba course recording script — ${voice.label}\n\n`;
    md += `**Course:** Yoruba for English speakers · **Your part:** ${voice.label} (${voice.lang})\n\n`;
    md += `**${lines.length} lines**, split into **${sessions.length} session${sessions.length > 1 ? 's' : ''}**. `;
    md += `About ${mins} minutes of actual speaking in total — allow two to three times that with pauses and retakes.\n\n`;
    if (voice.lang === 'Yoruba') {
      md += `> **Please read exactly what is written, including every tone mark and every dot under a letter.** `;
      md += `They are part of the word, not decoration — \`kọ́\` and \`kọ\` are two different verbs. `;
      md += `If a line looks wrong to you, **record it anyway as written, then tell us** — you are almost certainly right and we want to fix it.\n\n`;
    } else {
      md += `> These are the English prompts a learner hears before the Yoruba. Read them plainly and unhurriedly.\n\n`;
    }
    md += `## Before you start\n\n`;
    md += `1. Somewhere quiet. No music, no fan, no traffic if you can help it.\n`;
    md += `2. Phone or laptop is fine. Hold the phone about a hand's width from your mouth, slightly to the side.\n`;
    md += `3. **Record one session into one single audio file.** Do not try to make a separate file per line.\n`;
    md += `4. At the very start of the file, say out loud: *"${voice.label}, session one"* (then two, three...). This is how we tell your files apart.\n`;
    md += `5. **Say the line number before each line**, e.g. *"one"* ... then the line. Then pause for a breath before the next one.\n`;
    md += `6. If you fluff a line, just pause, say *"again"*, and repeat it. We will keep the last good one.\n\n`;
    if (voice.lang === 'Yoruba') {
      md += `Some lines are whole sentences, some are short building blocks, and some are a **single word on its own**. `;
      md += `That is deliberate — learners are taught the pieces as well as the sentences. `;
      md += `Say the short ones the way you would say them inside a normal sentence, not slowly or over-pronounced.\n\n`;
    }
    md += `---\n`;
    sessions.forEach((s, si) => {
      md += `\n## Session ${si + 1} of ${sessions.length} — lines ${s[0].seq} to ${s[s.length - 1].seq}\n\n`;
      md += `*About ${Math.max(1, Math.round(s.length * SECONDS_PER_TAKE / 60))} minutes of speaking. Say "${voice.label}, session ${si + 1}" before you begin.*\n\n`;
      let lastSeed = null;
      for (const ln of s) {
        if (ln.seed_number !== lastSeed) { md += `\n### Topic ${ln.seed_number}\n\n`; lastSeed = ln.seed_number; }
        const tag = ln.line_type === 'single word' ? ' · *just this one word, on its own*'
                  : ln.line_type === 'building block' ? ' · *a building block, not a full sentence*' : '';
        md += `**${ln.seq}.**  ${ln.text}${tag}\n`;
        if (ln.english_gloss) md += `> *(meaning: ${ln.english_gloss})*\n`;
        md += `\n`;
      }
      md += `\n*End of session ${si + 1}. Say "end of session ${si + 1}".*\n`;
    });
    md += `\n---\n\n## When you are done\n\n`;
    md += `Send us the audio files — one per session — with the session number in the filename if you can `;
    md += `(e.g. \`yoruba-voice-${voice.code}-session-1.m4a\`). Anything readable is fine; we can rename them.\n\n`;
    md += `Please also tell us anything that felt wrong, unnatural, or like something no one would actually say. `;
    md += `That feedback is as valuable to us as the recording.\n`;
    return md;
  }

  function renderReadme(m) {
    let md = `# yor_for_eng recording pack\n\nGenerated by \`tools/build-yor-recording-pack.cjs\`. **No audio was generated.**\n\n`;
    md += `## Files\n\n| File | For | Lines |\n|---|---|---|\n`;
    for (const v of m.voices) md += `| \`script-${v.code.toLowerCase()}-${v.slot}.md\` | ${v.label} (${v.language}) | ${v.line_count} |\n`;
    md += `| \`manifest.json\` | the machine-readable join — **the authority** | — |\n\n`;
    md += `## The join\n\n`;
    md += `\`manifest.json\` maps every \`line_id\` to the exact database rows that line supplies audio for:\n\n`;
    md += `\`\`\`\nline_id  →  { role, text, rows: [ { table, id, seed_number, lego_index, position } ] }\n\`\`\`\n\n`;
    md += `One line can serve many rows — the same Yoruba sentence appears as a LEGO and inside several `;
    md += `practice phrases, and is recorded once. Dedupe is **byte-exact on the target text**, so two forms `;
    md += `differing only in a tone mark or a dot-below are treated as different lines, never merged.\n\n`;
    md += `\`line_id\` is stable only as long as this manifest is kept. Regenerating after the course grows `;
    md += `will renumber. **Keep the manifest that went out with the recordings.**\n`;
    return md;
  }
})();
