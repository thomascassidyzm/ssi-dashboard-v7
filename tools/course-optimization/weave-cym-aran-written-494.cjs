#!/usr/bin/env node
/**
 * ARAN-WRITTEN PRACTICE PHRASES for the 17 new LEGOs that had none in the Welsh sandboxes
 * cym_nv2_for_eng (N) and cym_sv2_for_eng (S) (job #494, Aran 2026-10-13). Aran wrote the Welsh;
 * the English is ours. Welsh is his text exactly, tidied only to the sandbox convention: curly ’,
 * "dwi" → "dw i" (2,953 N / 3,596 S rows say "dw i", 24 / 0 say "dwi"), "be" → "be’".
 *
 * Rows are filed as job #468's sole-new tool files them (routes/v2.cjs shapes: build_use format,
 * M build-up component rows from generateBuildupPhrases, then build, then use), in Aran's order:
 * the first three accepted lines are build, the rest use. Each line goes through the v2 door's own
 * per-line checks (vocab at this seed, bare-LEGO, containment); a line any check rejects is NOT
 * written, and is listed. The door's count floor (3 build + 5 use) is reported, not enforced: these
 * are Aran's hand-written sets and he decides whether to add lines.
 *
 *   node tools/course-optimization/weave-cym-aran-written-494.cjs sql
 *     → weave-cym-aran-written-494.sql (+ -undo.sql); dry run unless psql -v finish=COMMIT.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { makePhraseId, computeLegoPosition, generateBuildupPhrases, partitionBareLegoPhrases, phraseFloor } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { loadTranslationVocab } = require('../../services/course-builder/lib/vocab-cache.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { normalizeForContainment, extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { phraseContainsLego } = require('../../services/course-builder/lib/separable-verbs.cjs');

const JOB = 494;
const N = 'cym_nv2_for_eng';
const S = 'cym_sv2_for_eng';
const SQL = path.join(__dirname, `weave-cym-aran-written-${JOB}.sql`);
const EVID = path.join(require('os').homedir(), 'ssi-evidence/ssi-dashboard-v7/job-494');

/** Sandbox tidy: apostrophes curly, "dwi" spaced, "be" elided. Nothing else in Aran's Welsh changes. */
function tidyWelsh(w) {
  return w.trim().replace(/\s+/g, ' ').replace(/'/g, '’')
    .replace(/(^| )dwi(?=[’ ])/g, '$1dw i').replace(/(^| )be(?= )/g, '$1be’');
}

// [Welsh as Aran wrote it, English]. HELD lines carry a reason and are not written.
const NORTH_BU_BRON = [
  ['bu bron iddi ateb', 'she almost answered'],
  ['bu bron iddi siarad', 'she almost spoke'],
  ['bu bron iddi orffen', 'she almost finished'],
  ['bu bron iddi orffen siarad', 'she almost finished speaking'],
  ['bu bron iddi gofio', 'she almost remembered'],
  ['bu bron iddi gofio rhywbeth arall', 'she almost remembered something else'],
];
const EFO_CHDI = 'held: Northern "efo chdi" in the South course — Aran to confirm';
const SETS = [
  [N, 1087, 2, [
    ['pobl ydyn nhw', 'they’re people'],
    ['pobl dwi\'n nabod ydyn nhw', 'they’re people I know'],
    ['pobl eraill ydyn nhw', 'they’re other people'],
    ['pobl newydd ydyn nhw', 'they’re new people'],
    ['pob hapus ydyn nhw', null, 'held: looks like a typo for "pobl hapus ydyn nhw" — Aran to confirm'],
    ['ffrindiau ydyn nhw', 'they’re friends'],
    ['fy ffrindiau ydyn nhw', 'they’re my friends'],
  ]],
  [N, 1478, 2, [
    ['calon mor garedig', 'such a kind heart'],
    ['gweld calon mor garedig', 'to see such a kind heart'],
    ['cofio calon mor garedig', 'to remember such a kind heart'],
    ['mae gen i galon mor garedig', 'I have such a kind heart'],
    ['mae gen ti galon mor garedig', 'you have such a kind heart'],
  ]],
  // Aran's note line ("keep cyfrif with the final f for this word") is an instruction, not a phrase.
  [N, 1496, 4, [
    ['dwi\'n cyfrif', 'I matter'],
    ['ti\'n cyfrif', 'you matter'],
    ['mae hyn yn cyfrif', 'this matters'],
    ['mae hyn wirioneddol yn cyfrif', 'this really matters'],
    ['dwi ddim yn cyfrif', 'I don’t matter'],
    ['dwi\'n gallu cyfrif', 'I can count'],
  ]],
  [N, 1497, 2, [
    ['fel bod angen i ti weld', 'as though you need to see'],
    ['fel bod angen i ti ateb', 'as though you need to answer'],
    ['fel bod angen i ti siarad', 'as though you need to speak'],
    ['fel bod angen i ti siarad eto', 'as though you need to speak again'],
    ['fel bod angen i ti gysgu', 'as though you need to sleep'],
    ['fel bod angen i ti ymarfer', 'as though you need to practise'],
    ['fel bod angen i ti ymarfer mwy', 'as though you need to practise more'],
  ]],
  [N, 1502, 1, NORTH_BU_BRON],
  [S, 1054, 2, [
    ['rhoi amser', 'to give time'],
    ['rhoi ateb', 'to give an answer'],
    ['rhoi rhywbeth', 'to give something'],
    ['rhoi rhywbeth arall', 'to give something else'],
    ['o\'n i\'n moyn rhoi', 'I wanted to give'],
    ['o\'n i\'n moyn rhoi rhywbeth', 'I wanted to give something'],
    ['o\'n i\'n moyn rhoi rhywbeth arall', 'I wanted to give something else'],
    ['o\'n i\'n moyn rhoi rhywbeth arall i ti', 'I wanted to give you something else'],
  ]],
  [S, 1115, 3, [
    ['cael sgwrs', 'to have a conversation'],
    ['cael sgwrs efo chdi', null, EFO_CHDI],
    ['cael sgwrs arall', 'to have another conversation'],
    ['cael sgwrs arall efo chdi', null, EFO_CHDI],
    ['teimlo fel cael sgwrs', 'to feel like having a conversation'],
    ['teimlo fel cael sgwrs efo chdi', null, EFO_CHDI],
    ['dwi\'n teimlo fel cael sgwrs', 'I feel like having a conversation'],
    ['dwi\'n teimlo fel cael sgwrs efo chdi', null, EFO_CHDI],
  ]],
  [S, 1166, 2, [
    ['dwi ddim yn anarferol iawn', 'I’m not very unusual'],
    ['dyw hi ddim yn anarferol iawn', 'she isn’t very unusual'],
    ['dyw ateb ddim yn anarferol iawn', 'an answer isn’t very unusual'],
    ['dyw siarad yn araf ddim yn anarferol iawn', 'speaking slowly isn’t very unusual'],
    ['dyw hynny ddim yn anarferol iawn', 'that isn’t very unusual'],
    ['ti ddim yn anarferol iawn', 'you’re not very unusual'],
  ]],
  [S, 1208, 4, [
    ['mynd i ddweud e', 'going to say it'],
    ['sut i ddweud e', 'how to say it'],
    ['dwi\'n mynd i ddweud e', 'I’m going to say it'],
    ['ti\'n mynd i ddweud e', 'you’re going to say it'],
    ['dwi\'n mynd i ddweud e eto', 'I’m going to say it again'],
    ['sut i ddweud e eto', 'how to say it again'],
    ['dwi ddim yn mynd i ddweud e eto', 'I’m not going to say it again'],
  ]],
  [S, 1276, 2, [
    ['dwi\'n moyn aros', 'I want to stay'],
    ['dwi\'n moyn aros gyda thi', 'I want to stay with you'],
    ['dwi ddim yn moyn aros', 'I don’t want to stay'],
    ['dwi ddim yn moyn aros gyda thi', 'I don’t want to stay with you'],
    ['dwi ddim yn moyn aros gyda thi eto', 'I don’t want to stay with you again'],
    ['ti\'n moyn aros gyda fi', 'you want to stay with me'],
    ['wyt ti\'n moyn aros gyda fi?', 'do you want to stay with me?'],
  ]],
  [S, 1286, 2, [
    ['pobl sy\'n hoffi', 'people who like'],
    ['rhywun sy\'n hoffi', 'someone who likes'],
    ['rhywun arall sy\'n hoffi', 'someone else who likes'],
    ['pobl sy\'n hoffi trio', 'people who like trying'],
    ['pobl sy\'n hoffi trio siarad', 'people who like trying to speak'],
    ['dwi\'n nabod rhywun sy\'n hoffi', 'I know someone who likes'],
    ['dwi\'n nabod rhywun sy\'n hoffi anghofio', 'I know someone who likes forgetting'],
  ]],
  [S, 1428, 1, [
    ['fydden nhw\'n hoffi trio?', 'would they like to try?'],
    ['fydden nhw\'n hoffi siarad?', 'would they like to speak?'],
    ['fydden nhw\'n hoffi siarad Cymraeg?', 'would they like to speak Welsh?'],
    ['fydden nhw\'n hoffi siarad gyda fi?', 'would they like to speak with me?'],
    ['fydden nhw\'n hoffi trio eto?', 'would they like to try again?'],
    ['fydden nhw\'n hoffi trio cofio?', 'would they like to try to remember?'],
    ['fydden nhw\'n hoffi rhywbeth arall?', 'would they like something else?'],
  ]],
  [S, 1447, 1, [
    ['fyddan nhw\'n gallu helpu?', 'will they be able to help?'],
    ['fyddan nhw\'n gallu stopio?', 'will they be able to stop?'],
    ['fyddan nhw\'n gallu cofio?', 'will they be able to remember?'],
    ['fyddan nhw\'n gallu cofio\'r ateb?', 'will they be able to remember the answer?'],
    ['fyddan nhw\'n gallu ymarfer gyda ni?', 'will they be able to practise with us?'],
    ['fyddan nhw\'n gallu gwneud e?', 'will they be able to do it?'],
    ['fyddan nhw\'n gallu gwneud e eto?', 'will they be able to do it again?'],
  ]],
  // Aran: "We can use the northern examples for 'bu bron iddi' for the southern course."
  [S, 1502, 1, NORTH_BU_BRON],
  [S, 1512, 4, [
    ['nôl rhywbeth', 'to fetch something'],
    ['nôl rhywbeth arall', 'to fetch something else'],
    ['nôl beth dwi angen', 'to fetch what I need'],
    ['nôl beth ti angen', 'to fetch what you need'],
    ['dwi\'n gallu nôl e', 'I can fetch it'],
    ['dwi\'n gallu nôl rhywbeth', 'I can fetch something'],
    ['dwi\'n gallu nôl rhywbeth arall', 'I can fetch something else'],
  ]],
  [S, 1526, 1, [
    ['cael hi\'n ddiddorol', 'finding it interesting'],
    ['dwi\'n cael hi\'n ddiddorol', 'I’m finding it interesting'],
    ['cael hi\'n hawdd', 'finding it easy'],
    ['dwi\'n cael hi\'n hawdd', 'I’m finding it easy'],
    ['cael hi\'n hawdd i weld', 'finding it easy to see'],
    ['dwi\'n cael hi\'n hawdd i weld', 'I’m finding it easy to see'],
    ['cael hi\'n hawdd i siarad', 'finding it easy to speak'],
    ['dwi\'n cael hi\'n hawdd i siarad', 'I’m finding it easy to speak'],
    ['cael hi\'n hawdd i siarad Cymraeg', 'finding it easy to speak Welsh'],
    ['cael hi\'n ddiddorol be wedest ti', 'finding what you said interesting'],
  ]],
  [S, 1551, 2, [
    ['mae hyn yn salw', 'this is ugly'],
    ['mae hynna\'n salw', 'that’s ugly'],
    ['mae\'r ci yn salw', 'the dog is ugly'],
    ['mae\'r gath yn salw', 'the cat is ugly'],
    ['dyw\'r ci ddim yn salw', 'the dog isn’t ugly'],
    ['dyw\'r gath ddim yn salw', 'the cat isn’t ugly'],
    ['dyw\'r gath ddim yn salw iawn', 'the cat isn’t very ugly'],
  ]],
];

const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

/** The v2 door's per-line checks (routes/v2.cjs POST /v2/phrases), one line at a time. */
async function lineChecks(sb, course, s, l, lego, target) {
  const errs = [];
  const vocab = await loadTranslationVocab({ supabase: sb }, course, s);
  const { data: cur } = await sb.from('course_legos').select('target_text,type,components').eq('course_code', course).eq('seed_number', s).lte('lego_index', l);
  for (const x of cur || []) {
    extractVocab(x.target_text, false).forEach((v) => vocab.add(v));
    if (x.type === 'M' && x.components) for (const c of x.components) extractVocab(c.target, false).forEach((v) => vocab.add(v));
  }
  const vv = checkVocabViolations([{ target }], vocab, course, { seedNumber: s });
  if (vv.length) errs.push(`vocab: uses unknown ${vv.map((v) => v.unknown).join(', ')}`);
  if (partitionBareLegoPhrases([{ target }], lego.target_text).bare.length) errs.push('bare LEGO');
  const norm = normalizeForContainment(lego.target_text);
  if (!phraseContainsLego({ courseCode: course, seedNumber: s, legoTarget: lego.target_text, phraseTarget: target,
    baseline: (lt, pt) => normalizeForContainment(pt).includes(norm) })) errs.push(`containment: does not contain the LEGO "${lego.target_text}"`);
  return errs;
}

async function sql() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const rows = [];
  const report = [];
  for (const [course, s, l, lines] of SETS) {
    const { data: lego } = await sb.from('course_legos').select('type,components,known_text,target_text,is_new')
      .eq('course_code', course).eq('seed_number', s).eq('lego_index', l).single();
    const tag = `${course === N ? 'N' : 'S'} S${s}L${String(l).padStart(2, '0')}`;
    const accepted = [];
    for (const [raw, known, held] of lines) {
      const target = tidyWelsh(raw);
      if (held) { report.push({ tag, status: 'HELD', target, why: held }); continue; }
      const errs = await lineChecks(sb, course, s, l, lego, target);
      if (errs.length) { report.push({ tag, status: 'REJECTED', target, known, why: errs.join('; ') }); continue; }
      accepted.push({ known, target });
    }
    let start = 1;
    const rc = { component: 0, build: 0, use: 0 };
    if (accepted.length && lego.type === 'M' && lego.components?.length) {
      const b = generateBuildupPhrases({ seed: s, idx: l, known: lego.known_text, target: lego.target_text, components: lego.components }, course);
      rows.push(...b.buildupPhrases.map((x) => ({ ...x, course_code: course, metadata: { ...x.metadata, job: JOB } })));
      start = b.startPosition;
      Object.assign(rc, b.roleCounts);
    }
    accepted.forEach((p, i) => {
      const role = i < 3 ? 'build' : 'use';
      rows.push({ id: makePhraseId(course, s, l, role, ++rc[role]), course_code: course, seed_number: s, lego_index: l, position: start + i,
        known_text: p.known, target_text: p.target, word_count: p.target.length, lego_count: (p.known.match(/\s+/g) || []).length + 1,
        phrase_role: role, introduce: true, lego_position: computeLegoPosition(p.target, lego.target_text),
        metadata: { format: 'build_use', pipeline: 'v2', job: JOB, author: 'aran' } });
    });
    const { minBuild, minUse } = phraseFloor(s, l);
    const nb = Math.min(accepted.length, 3);
    const nu = accepted.length - nb;
    if (nb < minBuild || nu < minUse) report.push({ tag, status: 'UNDER FLOOR', why: `${nb} build + ${nu} use written; the v2 door asks ${minBuild} + ${minUse}` });
  }
  const tmpl = fs.readFileSync(path.join(__dirname, `weave-cym-aran-written-${JOB}.sql.in`), 'utf8');
  const rowSql = `INSERT INTO add_rows VALUES\n${rows.map((r) => `  (${q(r.id)}, ${q(r.course_code)}, ${r.seed_number}, ${r.lego_index}, ${r.position}, ${q(r.known_text)}, ${q(r.target_text)}, ${r.word_count}, ${r.lego_count}, ${q(r.phrase_role)}, ${r.introduce}, ${q(r.lego_position)}, ${q(JSON.stringify(r.metadata))}::jsonb)`).join(',\n')};`;
  const legoSql = `INSERT INTO legos VALUES ${SETS.map(([c, s, l]) => `(${q(c)},${s},${l})`).join(',')};`;
  fs.writeFileSync(SQL, tmpl.replace('--@LEGOS@', legoSql).replace('--@ROWS@', rowSql));
  fs.writeFileSync(SQL.replace(/\.sql$/, '-undo.sql'), fs.readFileSync(path.join(__dirname, `weave-cym-aran-written-${JOB}-undo.sql.in`), 'utf8')
    .replace('--@ROWS@', `INSERT INTO added VALUES ${rows.map((r) => `(${q(r.id)})`).join(', ')};`));
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 'report.json'), JSON.stringify({ rows, report }, null, 2));
  console.log(`${SQL}: ${rows.length} rows`);
  for (const r of rows) console.log(`  ${r.id} [${r.phrase_role}] ${r.target_text} = ${r.known_text}`);
  for (const r of report) console.log(`  ${r.status} ${r.tag} ${r.target || ''} — ${r.why}`);
}

module.exports = { tidyWelsh, SETS };
if (require.main === module) {
  (process.argv[2] === 'sql' ? sql() : Promise.reject(new Error('mode: sql'))).catch((e) => { console.error(e); process.exit(1); });
}
