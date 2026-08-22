#!/usr/bin/env node
/**
 * A-108 non-draft pocket — isl/ell/est.
 *
 * Builds the per-row evaluation log. Read-only against the DB: every candidate
 * row in this pocket failed the whisper gate (the clip speaks the current,
 * wrong form), so there is nothing to write. The log records the evidence.
 *
 * Usage: node tools/a108/nondraft-plan.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PSQL = process.env.HOME + '/.local/pg17/bin/psql';
const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1); }

// One entry per distinct CLIP. find/replace are applied to target_text; every
// row sharing the clip gets the same edit. `rule` is which of Tom's three.
const EDITS = [
  // ---- isl_for_eng: gender (register is a zero in Icelandic, see report) ----
  { cc: 'isl_for_eng', sc: 4,  sn: 3,  rule: 'gender', find: 'ég er upptekin á morgun',      to: 'ég er upptekinn á morgun',
    why: 'speaker Friend is cast Gunnar (is-IS-GunnarNeural, male); self-reference takes masculine upptekinn' },
  { cc: 'isl_for_eng', sc: 8,  sn: 12, rule: 'gender', find: 'ég sé svangur',                to: 'ég sé svöng',
    why: 'speaker Customer 1 is cast Guðrún (female); self-reference takes feminine svöng' },
  { cc: 'isl_for_eng', sc: 10, sn: 7,  rule: 'gender', find: 'Ég er mjög þakklátur.',        to: 'Ég er mjög þakklát.',
    why: 'speaker Customer is cast Guðrún (female); self-reference takes feminine þakklát' },
  { cc: 'isl_for_eng', sc: 15, sn: 6,  rule: 'gender', find: 'þú sért tilbúinn',             to: 'þú sért tilbúin',
    why: 'second-person reference: addressee is the Learner, cast Guðrún (female)' },
  { cc: 'isl_for_eng', sc: 15, sn: 8,  rule: 'gender', find: 'að vera fullur af',            to: 'að vera full af',
    why: 'second-person reference: addressee is the Learner, cast Guðrún (female)' },
  { cc: 'isl_for_eng', sc: 15, sn: 11, rule: 'gender', find: 'Ég er mjög ánægður',           to: 'Ég er mjög ánægð',
    why: 'speaker Learner is cast Guðrún (female); self-reference takes feminine ánægð' },

  // ---- ell_for_eng: gender ----
  { cc: 'ell_for_eng', sc: 15, sn: 1,  rule: 'gender', find: 'νιώθω λίγο νευρικός',          to: 'νιώθω λίγο νευρική',
    why: 'speaker Learner is cast Αθηνά (el-GR-AthinaNeural, female)' },
  { cc: 'ell_for_eng', sc: 15, sn: 5,  rule: 'gender', find: 'Δεν είμαι σίγουρος',           to: 'Δεν είμαι σίγουρη',
    why: 'speaker Learner is cast Αθηνά (female)' },
  { cc: 'ell_for_eng', sc: 15, sn: 6,  rule: 'gender', find: 'είσαι έτοιμος',                to: 'είσαι έτοιμη',
    why: 'second-person reference: addressee is the Learner, cast Αθηνά (female)' },
  { cc: 'ell_for_eng', sc: 15, sn: 8,  rule: 'gender', find: 'να είσαι ήδη σίγουρος',        to: 'να είσαι ήδη σίγουρη',
    why: 'second-person reference: addressee is the Learner, cast Αθηνά (female)' },
  { cc: 'ell_for_eng', sc: 15, sn: 11, rule: 'gender', find: 'Είμαι πολύ χαρούμενος',        to: 'Είμαι πολύ χαρούμενη',
    why: 'speaker Learner is cast Αθηνά (female)' },

  // ---- ell_for_eng: register (T in a stranger/service scene -> V) ----
  { cc: 'ell_for_eng', sc: 2,  sn: 2,  rule: 'register', find: 'Παρακαλώ, κάτσε.',           to: 'Παρακαλώ, καθίστε.',
    why: 'scene 2 is a stranger on public transport -> V (εσείς)' },
  { cc: 'ell_for_eng', sc: 13, sn: 1,  rule: 'register', find: 'ξέρεις πώς',                 to: 'ξέρετε πώς',
    why: 'scene 13 is stranger-in-the-street -> V; the same scene already closes on V (Ήσασταν)' },
  { cc: 'ell_for_eng', sc: 13, sn: 2,  rule: 'register', find: 'Πήγαινε ίσια',               to: 'Πηγαίνετε ίσια',
    why: 'scene 13 stranger -> V' },
  { cc: 'ell_for_eng', sc: 13, sn: 5,  rule: 'register', find: 'πάρε την πρώτη έξοδο',       to: 'πάρτε την πρώτη έξοδο',
    why: 'scene 13 stranger -> V' },
  { cc: 'ell_for_eng', sc: 13, sn: 7,  rule: 'register', find: 'Θα δεις το σούπερ μάρκετ στα αριστερά σου',
    to: 'Θα δείτε το σούπερ μάρκετ στα αριστερά σας', why: 'scene 13 stranger -> V' },

  // ---- est_for_eng: register (sina -> teie in service scenes) ----
  { cc: 'est_for_eng', sc: 7,  sn: 5,  rule: 'register', find: 'Kas sa istud siin või võtad kaasa?', to: 'Kas te istute siin või võtate kaasa?', why: 'scene 7 barista -> V; the same speaker uses V elsewhere in the scene' },
  { cc: 'est_for_eng', sc: 7,  sn: 8,  rule: 'register', find: 'Kas soovid veel midagi?',  to: 'Kas soovite veel midagi?',  why: 'scene 7 barista -> V' },
  { cc: 'est_for_eng', sc: 7,  sn: 14, rule: 'register', find: 'Kas sa soovid siin istuda?', to: 'Kas te soovite siin istuda?', why: 'scene 7 barista -> V' },
  { cc: 'est_for_eng', sc: 8,  sn: 7,  rule: 'register', find: 'või võid võtta',           to: 'või võite võtta',           why: 'scene 8 bartender -> V' },
  { cc: 'est_for_eng', sc: 9,  sn: 7,  rule: 'register', find: 'mida sa täna õhtul soovitaksid?', to: 'mida te täna õhtul soovitaksite?', why: 'scene 9 waiter -> V' },
  { cc: 'est_for_eng', sc: 9,  sn: 17, rule: 'register', find: 'kui oled valmis',          to: 'kui olete valmis',          why: 'scene 9 waiter -> V' },
  { cc: 'est_for_eng', sc: 10, sn: 4,  rule: 'register', find: 'aga pead kindluse',        to: 'aga peate kindluse',        why: 'scene 10 pharmacy assistant -> V; the customer already uses teil' },
  { cc: 'est_for_eng', sc: 10, sn: 6,  rule: 'register', find: 'hambapastat leiad kohe',   to: 'hambapastat leiate kohe',   why: 'scene 10 service -> V' },
  { cc: 'est_for_eng', sc: 10, sn: 7,  rule: 'register', find: 'sa oled olnud väga abistav', to: 'te olete olnud väga abistav', why: 'scene 10 service -> V' },
  { cc: 'est_for_eng', sc: 10, sn: 8,  rule: 'register', find: 'Kas sa oled siin puhkusel? Sa räägid', to: 'Kas te olete siin puhkusel? Te räägite', why: 'scene 10 service -> V' },
  { cc: 'est_for_eng', sc: 10, sn: 9,  rule: 'register', find: 'lahke sinult!',            to: 'lahke teist!',              why: 'scene 10 service -> V' },
  { cc: 'est_for_eng', sc: 12, sn: 2,  rule: 'register', find: 'Millised on sinu sümptomid?', to: 'Millised on teie sümptomid?', why: 'scene 12 pharmacist -> V; the customer already uses saaksite' },
  { cc: 'est_for_eng', sc: 12, sn: 4,  rule: 'register', find: 'Proovi peavalu',           to: 'Proovige peavalu',          why: 'scene 12 pharmacist -> V' },
  { cc: 'est_for_eng', sc: 13, sn: 1,  rule: 'register', find: 'kas sa tead, kuidas',      to: 'kas te teate, kuidas',      why: 'scene 13 stranger-in-the-street -> V' },
  { cc: 'est_for_eng', sc: 13, sn: 2,  rule: 'register', find: 'Mine mööda seda teed',     to: 'Minge mööda seda teed',     why: 'scene 13 stranger -> V' },
  { cc: 'est_for_eng', sc: 13, sn: 5,  rule: 'register', find: 'võta esimene väljapääs',   to: 'võtke esimene väljapääs',   why: 'scene 13 stranger -> V' },
  { cc: 'est_for_eng', sc: 13, sn: 7,  rule: 'register', find: 'Sa näed supermarketit',    to: 'Te näete supermarketit',    why: 'scene 13 stranger -> V' },
  { cc: 'est_for_eng', sc: 13, sn: 10, rule: 'register', find: 'Sa oled olnud väga abistav.', to: 'Te olete olnud väga abistav.', why: 'scene 13 stranger -> V' },
  { cc: 'est_for_eng', sc: 14, sn: 1,  rule: 'register', find: 'Kas saad mind viia',       to: 'Kas saate mind viia',       why: 'scene 14 taxi driver -> V' },
  { cc: 'est_for_eng', sc: 14, sn: 3,  rule: 'register', find: 'Kuidas arvad,',            to: 'Kuidas arvate,',            why: 'scene 14 taxi driver -> V' },
  { cc: 'est_for_eng', sc: 14, sn: 5,  rule: 'register', find: 'Kas sa tead, kust',        to: 'Kas te teate, kust',        why: 'scene 14 taxi driver -> V' },
  { cc: 'est_for_eng', sc: 14, sn: 6,  rule: 'register', find: 'jätan su just',            to: 'jätan teid just',           why: 'scene 14 taxi driver -> V' },
];

// whisper decodes, keyed clip-name -> transcript (ggml-medium, -l per language)
const TRANSCRIPTS = Object.fromEntries(
  fs.readFileSync('/tmp/a108clips/transcripts.txt', 'utf8').trim().split('\n')
    .map(l => { const i = l.indexOf(' -> '); return [l.slice(0, i), l.slice(i + 4).trim()]; })
);

function q(sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString());
}

const rows = q(`
  select p.course_code, p.slug, s.id, s.scene_number, s.sentence_number, s.speaker,
         s.target_text, s.target_text_draft, s.target_audio_id,
         a.text as audio_text, a.s3_key, a.voice_id
  from listening_pods p
  join listening_pod_sentences s on s.pod_id = p.id
  left join course_audio a on a.id = s.target_audio_id
  where p.course_code in ('isl_for_eng','ell_for_eng','est_for_eng')
    and not s.target_text_draft`);

const log = [];
let unmatched = [];
for (const e of EDITS) {
  const clip = `${e.cc}_s${e.sc}_${e.sn}`;
  const hits = rows.filter(r => r.course_code === e.cc && r.target_text.includes(e.find));
  if (!hits.length) { unmatched.push(clip); continue; }
  for (const r of hits) {
    log.push({
      id: r.id,
      course: r.course_code,
      pod: r.slug,
      scene: r.scene_number,
      sentence: r.sentence_number,
      speaker: r.speaker,
      rule: e.rule,
      before: r.target_text,
      proposed_after: r.target_text.replace(e.find, e.to),
      applied: false,
      action: 'no-write',
      reason: `${e.why}. Whisper decode of the clip shows the audio speaks the CURRENT (wrong) form, so a text-only fix would desync text from audio. Held for Tom's render approval per A-108 constraint (c).`,
      clip_id: r.target_audio_id,
      clip_key: r.s3_key,
      clip_voice: r.voice_id,
      course_audio_text_matches_row: r.audio_text === r.target_text,
      whisper_transcript: TRANSCRIPTS[clip] || null,
      target_text_draft: r.target_text_draft,
    });
  }
}

const outDir = path.join(__dirname, '..', 'docs', 'a108');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'isl-ell-est-nondraft-applied-log.json');
fs.writeFileSync(out, JSON.stringify({
  job: 'A-108 follow-on — isl/ell/est non-draft pocket',
  date: '2026-08-14',
  writes_applied: 0,
  note: 'Read-only. Every candidate clip was whisper-checked first; none already speaks the corrected form, so under constraint (b) no row qualified for a text-only fix and nothing was written.',
  rows_examined: rows.length,
  clips_whisper_checked: new Set(log.map(l => l.clip_id)).size,
  rows: log,
}, null, 2) + '\n');

// cost derivation, per distinct clip
const byClip = new Map();
for (const l of log) if (!byClip.has(l.clip_id)) byClip.set(l.clip_id, l);
const byCourse = {};
for (const l of byClip.values()) {
  const c = (byCourse[l.course] ||= { clips: 0, rows: 0, chars: 0, voices: new Set() });
  c.clips++; c.chars += l.proposed_after.length; c.voices.add(l.clip_voice);
}
for (const l of log) byCourse[l.course].rows++;

console.log(`rows examined: ${rows.length}`);
console.log(`rows in log:   ${log.length}`);
console.log(`distinct clips: ${byClip.size}`);
if (unmatched.length) console.log(`UNMATCHED EDITS: ${unmatched.join(', ')}`);
let tc = 0, tk = 0, tr = 0;
for (const [cc, c] of Object.entries(byCourse)) {
  tc += c.chars; tk += c.clips; tr += c.rows;
  console.log(`${cc}: ${c.clips} clips, ${c.rows} rows, ${c.chars} chars, voices ${[...c.voices].join(',')}`);
}
console.log(`TOTAL: ${tk} clips, ${tr} rows, ${tc} chars -> Azure neural @ $16/1M = $${(tc / 1e6 * 16).toFixed(4)}`);
console.log(`stale course_audio.text rows: ${log.filter(l => !l.course_audio_text_matches_row).length}`);
console.log(`written: ${out}`);
