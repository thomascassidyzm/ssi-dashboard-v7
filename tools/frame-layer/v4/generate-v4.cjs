#!/usr/bin/env node
/**
 * V4 PHRASE GENERATOR — offline prototype. WRITES EVIDENCE FILES ONLY.
 *
 * The objective (Tom, 2026-10-02): over a 10-20 seed region, use as many of
 * the canon frames as are available, by practising each NEW LEGO in concert
 * with LEGOs already taught — "walking back through the network". Variety is
 * bought with frames the learner owns, never with a stapled opener, and every
 * LEGO still gets its full basket (floors: 4 BUILD + 5 USE).
 *
 * What one region run does:
 *   1. WALK BACK. For every frame available by the region's last seed, find
 *      the taught chunks (LEGOs and components, known side) that carry it —
 *      the material a new LEGO can be put "in concert with". That list, with
 *      the frame it carries, is the brief's spine. The model is told to cover
 *      every available frame across the region's phrases, each phrase being a
 *      new LEGO inside a frame carried by old material.
 *   2. GENERATE. One model call per region via claude --print, never the
 *      Anthropic SDK. Model: FABLE (family name) — Tom named it for this work
 *      (#471, 2026-10-02); the Irish pilot (#468) ran on Opus. Effort is LOW:
 *      the Opus calls spent ~34k thinking tokens per region because
 *      MAX_THINKING_TOKENS alone did not bite; --effort is the lever that does.
 *   3. GATE, mechanically, never trusting a claim:
 *        - every phrase contains its LEGO on both sides;
 *        - BOTH sides use only THAT LEGO's admitted list (Tom r-2026-11-05: seeds
 *          < N, LEGOs before S<N>L<L> in introduction order, the LEGO itself,
 *          components only as parts of those LEGOs) — services/shared/admitted-list.cjs.
 *          No known-language free class; every script tiled here, no-space ones by
 *          character, so nothing relies on phrase-gate afterwards;
 *        - ZUT: one known → one target, against the generated set AND the live
 *          course (whole course for USE, up to position for BUILD — canon P16);
 *        - no parentheses; no duplicates;
 *        - an interjection at the front ("thank you,", "of course") only when it
 *          is a chunk this basket already OWNS, with its taught target form
 *          (Tom 2026-11-05: "thank you and of course CAN be used as vocab,
 *          provided they have already been admitted"); one not yet admitted is
 *          refused, and an admitted one still earns no frame (window-coverage).
 *   4. FLOORS. A basket below 4 BUILD / 5 USE after gating goes back ONCE,
 *      with the gate's words quoted. One retry per region, hard cap.
 *   5. SCORE the region with window-coverage.cjs. Frames are re-derived from
 *      the frame tagger; the model's frame tag is recorded but never counted.
 *
 * Token discipline: every call's usage is recorded; the run refuses to start a
 * new model call once --budget tokens have been spent. No unbounded loops.
 * Every candidate set is written to disk the moment the call returns, BEFORE
 * any gate or retry — #468 lost a 60k-token French set because the retry was
 * refused by the budget and the script only saved at the end. A refused retry
 * now gates and saves what the first call produced.
 *
 * Usage: node tools/frame-layer/v4/generate-v4.cjs <course> <start> <end> [--dry] [--budget 400000]
 *        ... --gaps [--missing P5,P8]   additive gap fill: only the window's missing frames (runGaps)
 * Env: V4_MODEL (fable) · V4_EFFORT (low) · V4_LEDGER (token-ledger.json, in the evidence dir)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { availableVocab, norm } = require('../availability.cjs');
const { loadCourse } = require('./db.cjs');
const { inventory, availableAt, frameDef, podCarries } = require('./frame-inventory.cjs');
const { scoreWindow, hasOpener, framesOfAll, ensurePodTagged } = require('./window-coverage.cjs');
const { tagCourse } = require('./tag-course.cjs');
const { ensureTagged, knownLanguageName } = require('../frame-tagger.cjs');
/** Candidates are classified by the frame tagger (P codex, then D codex for pod frames) before the (sync) gates read their frames and openers. */
const tagCandidates = async (course, cands) => {
  const texts = cands.map(c => String(c.known || '').trim()).filter(Boolean);
  const opts = { knownLanguage: knownLanguageName(course) };
  const ledger = await ensureTagged(texts, opts);
  await ensurePodTagged(texts, opts);
  return ledger;
};

const ROOT = path.join(__dirname, '..', '..', '..');
const EVIDENCE = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '468-frame-diversity');
const MODEL = process.env.V4_MODEL || 'fable';
const EFFORT = process.env.V4_EFFORT || 'low';
const LEDGER_FILE = 'token-ledger.json'; // default; V4_LEDGER is read per call so a driver can give each window its own (#924)
const CLAUDE = '/home/tomcassidy/.local/bin/claude';
const BUILD_FLOOR = 4, USE_FLOOR = 5;

// ---------- the admitted list (Tom, r-2026-11-05) ----------
// One list per LEGO — seeds before its seed, LEGOs before it in introduction order, the LEGO
// itself, components only as parts of those LEGOs — feeds the prompt, the known check and the
// target check alike (services/shared/admitted-list.cjs). There is no known-language free
// class any more (the pair-contract glue, NPI, negation words, dummy "do" and -s/-ed/-ing
// stripping are gone), and no script skips the target check: a language written without
// spaces is tiled here by character, whole admitted chunks only. Phrase-gate still runs
// afterwards as a final check; nothing here relies on it.
const ADM = require('../../../services/shared/admitted-list.cjs');
const { admittedList, admittedCheck, admittedRulePrompt, renderAdmitted, knownSideCheck } = ADM;
const langOf = (code) => String(code || '').split('_')[0];
const knownLangOf = (course) => langOf(String(course).split('_for_')[1]);
const targetLangOf = (course) => langOf(String(course).split('_for_')[0]);
const knownNoSpaceOf = (course) => ADM.knownNoSpace(course);
const { unitsOf, knownHeardCheck } = require('../../../services/shared/known-heard-check.cjs');
const useTooShort = (known, noSpace) => unitsOf(known, noSpace).length < (noSpace ? 6 : 4);
const tokens = (s) => norm(s).split(' ').filter(Boolean);

// ---------- target tiling: exact surface forms, see exact-form.cjs (Tom 2026-10-09) ----------
const { exactFormCheck, tiles } = require('./exact-form.cjs');
const { welshContainsLego } = require('../../../services/course-builder/lib/welsh-mutation.cjs');
const { vocabRulePrompt } = require('../../../services/course-builder/lib/taught-words.cjs');

// ---------- the walk-back brief ----------
/**
 * Carrier material a whole region may lean on: the admitted list of its FIRST new LEGO (so
 * every basket in the region owns it), seed sentences excluded (a carrier is a short chunk).
 */
function carrierPool(course, data, newLegos) {
  const first = [...newLegos].sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index)[0];
  if (!first) return [];
  return admittedList({ course, seeds: data.seeds, legos: data.legos, components: data.components, seedNumber: first.seed_number, legoIndex: +first.lego_index, lego: first })
    .rows.filter(r => r.kind === 'lego' || r.kind === 'component');
}

function carriersByFrame(chunks, frameIds, course = null) {
  const out = {};
  for (const id of frameIds) {
    const p = frameDef(id);
    if (!p) { out[id] = []; continue; }
    // A pod frame's carrier is a chunk that OWNS it by the same rule that made the frame
    // available (frame-inventory.podCarries: identity in English, the tagger otherwise).
    const carries = (c) => p.provenance === 'pod' ? podCarries(c, p, course) : p.test(c.known_text || '');
    const hits = chunks.filter(c => carries(c) && tokens(c.known_text).length <= 6);
    // two most recent, two shortest — recent material is the LEGO's own neighbourhood,
    // short material is the cleanest frame carrier
    const recent = [...hits].sort((a, b) => b.seed_number - a.seed_number).slice(0, 2);
    const short = [...hits].sort((a, b) => a.known_text.length - b.known_text.length).slice(0, 2);
    const pick = [];
    for (const h of [...short, ...recent]) if (!pick.some(x => x.known_text === h.known_text)) pick.push(h);
    out[id] = pick.slice(0, 4);
  }
  return out;
}

/** One FRAMES-AVAILABLE line per frame, P or pod. Pod frames say so; an X-frame is offered as its reply turn. */
function frameLine(id, carriers, emptyNote = '') {
  const p = frameDef(id);
  if (!p) return null;
  const cs = (carriers[id] || []).map(c => `"${c.known_text}" = ${c.target_text}`).join(' · ');
  const tag = p.provenance !== 'pod' ? '' : p.grain === 'exchange'
    ? `  [pod exchange: write the REPLY turn, which is ${p.sentence_projection}]`
    : '  [pod frame]';
  return `  ${id} ${p.name}  ${p.shape}${tag}${cs ? `\n      taught material that carries it: ${cs}` : emptyNote}`;
}

/**
 * The interjection rule, as the model reads it (Tom 2026-11-05). Same words in
 * both prompts; the gate below enforces it and window-coverage pays nothing for it.
 */
function interjectionRule(KNOWN = 'English') {
  const eg = KNOWN === 'English' ? '"thank you", "of course", "sorry", "great", "no problem", "yes,", "no,"' : `the ${KNOWN} equivalents of "thank you", "of course", "sorry", "great", "no problem", "yes,", "no,"`;
  return `INTERJECTIONS (${eg}): allowed ONLY when the interjection is itself a taught chunk in VOCABULARY that this LEGO's basket already owns, used with its taught target form, under the same rule as every other chunk (earlier seeds, earlier LEGOs of this seed). An interjection the learner has not yet been taught is refused. An interjection EARNS NO FRAME: a phrase whose only frame is the interjection counts for nothing, and a phrase that opens with one earns only the frames of what follows it. So every phrase must still fire a real frame from the list below. Variety is a frame change, never an opener.`;
}

/**
 * The vocabulary block both prompts end with: the admitted list of the region's LAST new LEGO
 * (every earlier basket's list is a prefix of it, by introduction order), each row with its id,
 * and the rule that cuts it per LEGO. Nothing outside the admitted list is offered (Tom r-2026-11-05).
 */
function admittedBlock({ course, data, newLegos, KNOWN, LANG }) {
  const last = [...newLegos].sort((a, b) => b.seed_number - a.seed_number || b.lego_index - a.lego_index)[0];
  const adm = admittedList({ course, seeds: data.seeds, legos: data.legos, components: data.components, seedNumber: last.seed_number, legoIndex: +last.lego_index, lego: last });
  return `${admittedRulePrompt(null, null, KNOWN, LANG)}
Each LEGO below states its own cut. A line marked "#part" is a part of the LEGO named before it and is admitted exactly when that LEGO is.

ADMITTED (in introduction order; id: ${KNOWN} = ${LANG}):
${renderAdmitted(adm.rows)}`;
}

/** The vocabulary rail, both sides, every script. */
function vocabRailLine(course, KNOWN, LANG) {
  const spaced = vocabRulePrompt(course);
  return `- Both sides use ONLY the ADMITTED list for their LEGO (below). The ${KNOWN} side: only ${KNOWN} words that appear, at exactly that form, in admitted ${KNOWN} texts — no other word, however ordinary or grammatical. `
    + (spaced ? `The ${LANG} side: ${spaced.replace(/taught earlier in the course running order/, 'in the admitted list')}`
      : `The ${LANG} side is built ONLY from WHOLE admitted ${LANG} chunks joined together — no new character, no re-splitting, no re-conjugation, no new ending or particle.`);
}

/** The per-LEGO cut, as the seed lines state it. */
const legoCut = (l) => ADM.admittedLabel(l.seed_number, +l.lego_index);

function buildPrompt({ course, region, seeds, newLegos, available, carriers, retry, data }) {
  const LANG = knownLanguageName(`x_for_${targetLangOf(course)}`);
  const KNOWN = knownLanguageName(course);
  const frameLines = available.map(id => frameLine(id, carriers)).filter(Boolean).join('\n');
  const seedLines = seeds.map(s => {
    const mine = newLegos.filter(l => l.seed_number === s.seed_number);
    if (!mine.length) return null;
    return `SEED ${s.seed_number}: "${s.known_text}" = ${s.target_text}\n` + mine.map(l =>
      `  LEGO ${ADM.legoId(s.seed_number, l.lego_index)}: "${l.known_text}" = ${l.target_text}  [${l.type}]  — ${BUILD_FLOOR} BUILD + ${USE_FLOOR} USE\n      may use ONLY: ${legoCut(l)}`).join('\n');
  }).filter(Boolean).join('\n');
  const vocab = admittedBlock({ course, data, newLegos, KNOWN, LANG });
  const retryBlock = retry ? `
THIS IS A RETRY for the baskets below only. Your previous phrases for them were refused by the gates for the reasons quoted. Write a fresh FULL basket (${BUILD_FLOOR} BUILD + ${USE_FLOOR} USE) for each, fixing exactly those reasons.
${retry.map(r => `  ${r.id} "${r.known}" = ${r.target}: ${r.reasons.join(' | ')}`).join('\n')}
` : '';
  return `You are writing practice phrases for an SSi ${LANG} course (known language ${KNOWN}, target language ${LANG}). Seeds ${region[0]}-${region[1]}.

THE OBJECTIVE. Each NEW LEGO below gets a full basket: exactly ${BUILD_FLOOR} BUILD and ${USE_FLOOR} USE phrases. Variety comes from FRAMES: across all the phrases you write for these seeds, every frame in the list below must be used at least once, and the more different frames you use the better. You do this by putting the new LEGO in concert with material the learner already owns — the taught chunks named under each frame — walking back through the course, not by adding words.

${interjectionRule(KNOWN)}

RAILS (every one is checked mechanically after you write; a phrase that fails is dropped):
- The phrase contains the LEGO's exact known text AND exact target text, as taught.
${vocabRailLine(course, KNOWN, LANG)}
- ZUT: one ${KNOWN} prompt maps to exactly one ${LANG} form, everywhere in the course. Do not write a ${KNOWN} line the course already renders another way.
- No parentheses, no explanations, no grammar labels, anywhere.
- Informal register (tu/du) unless the sentence itself insists otherwise.
- USE = one complete, natural sentence a native would say cold, out of context; never a fragment, never clunky. Aim longer and vary the length.
- BUILD = the LEGO plus one to three other chunks, short, fine as a fragment if it extends naturally into a full sentence.
- No duplicates, on either side.
${retryBlock}
FRAMES AVAILABLE BY SEED ${region[1]} (cover ALL of them across this region; each phrase should fire at least one, many fire two):
${frameLines}

THE SEEDS AND THEIR NEW LEGOS:
${seedLines}

${vocab}

Reply with JSON only, no prose, no code fence:
{"phrases":[{"seed":${region[0]},"lego_index":1,"role":"build|use","known":"...","target":"...","frame":"P- or D-id"}]}`;
}

// ---------- gap fill (#31, 2026-10-07: "Haiku audits, Opus fills the gaps") ----------
// The window's live baskets stay as they are; the model writes ONLY phrases in
// the frames the window is missing, each one practising one of the window's own
// LEGOs. Additive, so the reviewer reads new rows only and no floor can drop.
function buildGapPrompt({ course, region, seeds, newLegos, missing, carriers, perFrame = 3, data }) {
  const LANG = knownLanguageName(`x_for_${targetLangOf(course)}`);
  const KNOWN = knownLanguageName(course);
  const frameLines = missing.map(id => frameLine(id, carriers, '\n      (no short taught carrier: build it from taught chunks only if you can, otherwise skip it)')).filter(Boolean).join('\n');
  const seedLines = seeds.map(s => {
    const mine = newLegos.filter(l => l.seed_number === s.seed_number);
    if (!mine.length) return null;
    return `SEED ${s.seed_number}: "${s.known_text}" = ${s.target_text}\n` + mine.map(l =>
      `  LEGO ${ADM.legoId(s.seed_number, l.lego_index)}: "${l.known_text}" = ${l.target_text}  [${l.type}]\n      may use ONLY: ${legoCut(l)}`).join('\n');
  }).filter(Boolean).join('\n');
  const vocab = admittedBlock({ course, data, newLegos, KNOWN, LANG });
  return `You are adding practice phrases to an SSi ${LANG} course (known side ${KNOWN}, target side ${LANG}). Seeds ${region[0]}-${region[1]}.

THE GAP. These seeds' existing practice phrases never use the FRAMES listed below, although the learner already owns the material to make them. Write NEW phrases that use those frames. Each phrase practises one of the NEW LEGOs listed under the seeds (it must contain that LEGO exactly), put in concert with the taught material that carries the frame. Write ${perFrame} phrases per frame — at least ${perFrame * missing.length} phrases in all — spread over different LEGOs; mostly USE, a few BUILD. A frame may use any LEGO in the list; only skip a frame if no LEGO can carry it.

${interjectionRule(KNOWN)}

RAILS (checked mechanically after you write; a phrase that fails is dropped):
- The phrase contains the LEGO's exact known text AND exact target text, as taught.
${vocabRailLine(course, KNOWN, LANG)}
- ZUT: one ${KNOWN} prompt maps to exactly one ${LANG} form, everywhere in the course. Do not write a ${KNOWN} line the course already renders another way.
- No parentheses, no explanations, no grammar labels.
- Informal register (tu / du / tú, never vous / Sie / usted) unless the sentence itself insists otherwise.
- USE = one complete, natural sentence a native would say cold, out of context; never a fragment, never clunky.
- BUILD = the LEGO plus one to three other chunks, short, fine as a fragment if it extends naturally into a full sentence.

MISSING FRAMES:
${frameLines}

THE SEEDS AND THEIR NEW LEGOS:
${seedLines}

${vocab}

Reply with JSON only, no prose, no code fence:
{"phrases":[{"seed":${region[0]},"lego_index":1,"role":"build|use","known":"...","target":"...","frame":"P- or D-id"}]}`;
}

// ---------- the model call ----------
// The CLI invocation, exported so a test can assert the model and the effort
// bound without spending a token. --effort is what bounds thinking on Fable
// and Opus (probe 2026-10-02: fable + low → thinking_tokens 0 on a planning
// prompt); MAX_THINKING_TOKENS is kept as belt-and-braces but was shown not to
// bite on Opus in #468.
function claudeArgs() {
  return ['--print', '--model', MODEL, '--effort', EFFORT, '--output-format', 'json', '--tools', '',
    '--system-prompt', 'You write practice phrases for a language course. You follow the rails exactly and reply with JSON only.',
    '--exclude-dynamic-system-prompt-sections'];
}

function callModel(prompt, { timeoutMs = 1200000 } = {}) {
  const { claudeEnv } = require(path.join(ROOT, 'services', 'shared', 'claude-config.cjs'));
  const args = claudeArgs();
  const t0 = Date.now();
  const env = { ...claudeEnv(process.env), MAX_THINKING_TOKENS: String(process.env.V4_THINKING || 3000) };
  let raw;
  try {
    raw = execFileSync(CLAUDE, args, { input: prompt, env, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    // The CLI reports a usage limit on STDOUT as {is_error, result}; stderr is empty, so
    // the old message carried only the command line and a limit looked like any failure (#924).
    let said = '';
    try { said = JSON.parse(String(e.stdout || '')).result || ''; } catch { said = String(e.stdout || '').slice(0, 300); }
    throw new Error(`claude --print failed: ${said ? said + ' — ' : ''}${String(e.stderr || e.message).slice(0, 300)}`);
  }
  const j = JSON.parse(raw);
  if (j.is_error) throw new Error(`model error: ${String(j.result).slice(0, 300)}`);
  const u = j.usage || {};
  const usage = { input: u.input_tokens || 0, cache_create: u.cache_creation_input_tokens || 0, cache_read: u.cache_read_input_tokens || 0,
    output: u.output_tokens || 0, thinking: (u.output_tokens_details || {}).thinking_tokens ?? null,
    cost_usd: j.total_cost_usd || 0, model: Object.keys(j.modelUsage || {})[0] || null, effort: EFFORT, ms: Date.now() - t0 };
  usage.total = usage.input + usage.cache_create + usage.cache_read + usage.output;
  const m = String(j.result || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in model output: ' + String(j.result).slice(0, 300));
  return { phrases: JSON.parse(m[0]).phrases || [], usage };
}

// ---------- gates ----------
function gate(cands, { course, data, newLegos, liveZut, available, additive = false }) {
  const kept = [], rejected = [];
  const seenKnown = new Map(), seenTarget = new Set();
  const legoOf = (c) => newLegos.find(l => l.seed_number === +c.seed && +l.lego_index === +c.lego_index);
  const admCache = new Map();
  const admittedFor = (lego) => {
    const k = `${lego.seed_number}:${lego.lego_index}`;
    if (!admCache.has(k)) admCache.set(k, admittedList({ course, seeds: data.seeds, legos: data.legos, components: data.components, seedNumber: lego.seed_number, legoIndex: +lego.lego_index, lego }));
    return admCache.get(k);
  };
  for (const c of cands) {
    const lego = legoOf(c);
    const reasons = [];
    const known = String(c.known || '').trim(), target = String(c.target || '').trim();
    const role = c.role === 'build' ? 'build' : 'use';
    if (!lego) { rejected.push({ ...c, reasons: ['no such new LEGO in this region'] }); continue; }
    if (!known || !target) reasons.push('empty side');
    if (/[()]/.test(known + target)) reasons.push('parentheses');
    if (!norm(known).includes(norm(lego.known_text))) reasons.push(`known side does not contain the LEGO "${lego.known_text}"`);
    if (!norm(target).includes(norm(lego.target_text)) && !welshContainsLego(course, lego.target_text, target)) reasons.push(`target does not contain the LEGO "${lego.target_text}"`);
    // The admitted list for THIS LEGO (Tom r-2026-11-05), built once and used for every check below.
    const adm = admittedFor(lego);
    // An interjection at the front is allowed only when it is ADMITTED for this basket (Tom 2026-11-05).
    if (known && hasOpener(known) && !admittedOpener(known, target, adm.rows, knownNoSpaceOf(course)))
      reasons.push('interjection at the front is not yet admitted for this basket (it must be a taught chunk this basket owns, with its taught target form)');
    // Both sides, every script, against the same list. No free class; no no-space bypass.
    if (known && target) reasons.push(...admittedCheck({ known, target }, adm, course));
    // ZUT — one known → one target; USE against the whole live course, BUILD up to its position
    const nk = norm(known), nt = norm(target);
    const live = liveZut.get(nk);
    if (live) {
      const clash = live.find(x => x.target !== nt && (role === 'use' || x.seed <= lego.seed_number));
      if (clash) reasons.push(`ZUT: the course already renders "${known}" as "${clash.target_text}" (seed ${clash.seed})`);
    }
    // Gap fill ADDS to the live baskets, so a phrase the course already carries adds nothing.
    if (additive && live && live.some(x => x.target === nt)) reasons.push('already in the course');
    if (seenKnown.has(nk) && seenKnown.get(nk) !== nt) reasons.push('ZUT: same known-language line already used with another target in this set');
    if (seenKnown.has(nk) && seenKnown.get(nk) === nt) reasons.push('duplicate');
    if (seenTarget.has(nt + '|' + role) && !reasons.includes('duplicate')) reasons.push('duplicate target');
    if (role === 'use' && useTooShort(known, knownNoSpaceOf(course))) reasons.push('USE phrase too short to be a complete sentence');
    const frames = known ? framesOfAll(known, available) : [];
    const row = { seed_number: lego.seed_number, lego_index: +lego.lego_index, lego_known: lego.known_text, lego_target: lego.target_text,
      phrase_role: role, known_text: known, target_text: target, claimed_frame: c.frame || null, frames };
    if (reasons.length) { rejected.push({ ...row, reasons }); continue; }
    seenKnown.set(nk, nt); seenTarget.add(nt + '|' + role);
    kept.push(row);
  }
  return { kept, rejected };
}

/**
 * Is the interjection at the front of `known` ADMITTED for this basket? It is when
 * the known side opens with a whole chunk this basket owns (an available LEGO or
 * component, whole-chunk, ending at a word boundary unless the known script has no
 * spaces) AND the target carries that chunk's taught target form. The tagger says
 * WHETHER there is a detachable opener; ownership is matched against owned rows,
 * never classified. Returns the owning row, or null. Only the opener is judged
 * here: every word of the rest still answers to the vocabulary and tiling gates.
 */
function admittedOpener(known, target, vocab, knownNoSpace = false) {
  const nk = norm(known), nt = norm(target);
  let best = null;
  for (const v of vocab) {
    const ck = norm(v.known_text), ct = norm(v.target_text);
    if (!ck || !ct || !nk.startsWith(ck)) continue;
    if (!knownNoSpace && nk.length > ck.length && nk[ck.length] !== ' ') continue;
    if (!nt.includes(ct)) continue;
    if (!best || ck.length > norm(best.known_text).length) best = v;
  }
  return best;
}

function basketFloors(kept, newLegos) {
  return newLegos.map(l => {
    const mine = kept.filter(p => p.seed_number === l.seed_number && p.lego_index === +l.lego_index);
    const b = mine.filter(p => p.phrase_role === 'build').length, u = mine.filter(p => p.phrase_role === 'use').length;
    return { id: `S${l.seed_number}L${l.lego_index}`, known: l.known_text, target: l.target_text, build: b, use: u, ok: b >= BUILD_FLOOR && u >= USE_FLOOR, lego: l };
  });
}

// ---------- main ----------
async function run(course, start, end, { dry = false, budget = 400000, gaps = false, missing: missingIn = null } = {}) {
  if (gaps) return runGaps(course, start, end, { dry, budget, missingIn });
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const data = loadCourse(course);
  await tagCourse(course, data);
  const inv = inventory(course, data);
  const available = availableAt(inv, end);
  const seeds = data.seeds.filter(s => s.seed_number >= start && s.seed_number <= end);
  const newLegos = data.legos.filter(l => l.seed_number >= start && l.seed_number <= end && l.is_new !== false);
  const taughtBefore = carrierPool(course, data, newLegos);
  const carriers = carriersByFrame(taughtBefore, available, course);
  // live ZUT reference: every known → targets, from legos and practice rows of the whole course
  const liveZut = new Map();
  for (const r of [...data.legos, ...data.phrases]) {
    const k = norm(r.known_text); if (!k) continue;
    if (!liveZut.has(k)) liveZut.set(k, []);
    const t = norm(r.target_text);
    if (!liveZut.get(k).some(x => x.target === t)) liveZut.get(k).push({ target: t, target_text: r.target_text, seed: r.seed_number });
  }
  const prompt = buildPrompt({ course, region: [start, end], seeds, newLegos, available, carriers, data });
  const out = { course, region: [start, end], generated: new Date().toISOString(), model: MODEL, available_frames: available,
    new_legos: newLegos.length, prompt_chars: prompt.length, calls: [], kept: [], rejected: [], floors: null, score: null };
  const file = path.join(EVIDENCE, `v4-${course}-${start}-${end}.json`);
  if (dry) { console.log(`${course} ${start}-${end}: ${newLegos.length} new LEGOs, ${available.length} frames available, prompt ${prompt.length} chars`); fs.writeFileSync(file.replace('.json', '.prompt.txt'), prompt); return out; }

  // CUMULATIVE budget across every region of the pilot: a ledger in the evidence
  // dir, read before each call. Tom's cap for the whole pilot is ~400k tokens.
  const ledger = ledgerPath();
  const readLedger = () => { try { return JSON.parse(fs.readFileSync(ledger, 'utf8')); } catch { return { total: 0, calls: [] }; } };
  let spent = 0;
  const call = (p, label) => {
    const L = readLedger();
    if (L.total >= budget) throw new Error(`pilot budget ${budget} tokens exhausted (ledger ${L.total}) before ${course} ${start}-${end} ${label}`);
    const r = callModel(p);
    // SAVE FIRST: the raw candidate set hits disk before the ledger, the gates or any retry.
    persistCandidates(file, label, r);
    spent += r.usage.total;
    L.total += r.usage.total; L.calls.push({ course, start, end, label, ...r.usage, at: new Date().toISOString() });
    fs.writeFileSync(ledger, JSON.stringify(L, null, 1));
    out.calls.push({ label, prompt_chars: p.length, candidates: r.phrases.length, ...r.usage });
    console.log(`  ${label}: ${r.phrases.length} candidates, ${r.usage.total} tokens (${r.usage.output} out), $${r.usage.cost_usd.toFixed(2)}, ${Math.round(r.usage.ms / 1000)}s`);
    return r.phrases;
  };
  console.log(`${course} ${start}-${end}: ${newLegos.length} new LEGOs, ${available.length} frames available, prompt ${prompt.length} chars`);
  let cands = call(prompt, 'generate');
  await tagCandidates(course, cands);
  let g = gate(cands, { course, data, newLegos, liveZut, available });
  let floors = basketFloors(g.kept, newLegos);
  const failing = floors.filter(f => !f.ok);
  console.log(`  gates: kept ${g.kept.length}, rejected ${g.rejected.length}; baskets below floor: ${failing.length}/${floors.length}`);
  if (failing.length) {
    // ONE retry, for the failing baskets only, quoting the gate's reasons.
    const retry = failing.map(f => ({ id: f.id, known: f.known, target: f.target,
      reasons: [...new Set(g.rejected.filter(r => r.seed_number === f.lego.seed_number && r.lego_index === +f.lego.lego_index).flatMap(r => r.reasons))].slice(0, 6)
        .concat([`had ${f.build} BUILD and ${f.use} USE after gating; needs ${BUILD_FLOOR}+${USE_FLOOR}`]) }));
    const p2 = buildPrompt({ course, region: [start, end], seeds, newLegos: failing.map(f => f.lego), available, carriers, retry, data });
    let c2 = null;
    try { c2 = call(p2, 'retry'); await tagCandidates(course, c2); } catch (e) {
      // A refused retry (budget) is a finding, never a lost set: gate and save the first call's phrases.
      if (!/budget/.test(e.message)) throw e;
      out.retry_refused = e.message; console.log(`  retry refused: ${e.message}`);
    }
    const g2 = c2 ? gate(c2, { course, data, newLegos, liveZut, available }) : { kept: [], rejected: [] };
    const failIds = new Set(failing.map(f => f.id));
    const keepOld = g.kept.filter(p => !failIds.has(`S${p.seed_number}L${p.lego_index}`));
    const oldForFailing = g.kept.filter(p => failIds.has(`S${p.seed_number}L${p.lego_index}`));
    // take the retry basket where it clears the floor; otherwise keep whichever basket is fuller
    const merged = [...keepOld];
    for (const f of failing) {
      const nb = g2.kept.filter(p => `S${p.seed_number}L${p.lego_index}` === f.id);
      const ob = oldForFailing.filter(p => `S${p.seed_number}L${p.lego_index}` === f.id);
      merged.push(...(nb.length >= ob.length ? nb : ob));
    }
    g = { kept: merged, rejected: [...g.rejected, ...g2.rejected] };
    floors = basketFloors(g.kept, newLegos);
    console.log(`  after retry: kept ${g.kept.length}; baskets below floor: ${floors.filter(f => !f.ok).length}/${floors.length}`);
  }
  out.kept = g.kept; out.rejected = g.rejected; out.floors = floors;
  out.score = scoreWindow(g.kept, available, { rarefyN: 60 });
  out.tokens_spent = spent;
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(`  coverage ${out.score.coverage} (${out.score.used}/${out.score.available}), rarefied@60 ${out.score.rarefied_frames_at_n}, interjections ${out.score.interjection_openers}; ${spent} tokens; → ${file}`);
  return out;
}

/**
 * GAP-FILL RUN: one call, additive. BEFORE = the live window's coverage; AFTER =
 * live + the kept candidates, scored by the same frame tagger. `missingIn` lets
 * the caller name the gaps; default is what the tagger finds missing.
 */
async function runGaps(course, start, end, { dry = false, budget = 120000, missingIn = null } = {}) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const data = loadCourse(course);
  await tagCourse(course, data);
  const inv = inventory(course, data);
  const available = availableAt(inv, end);
  const seeds = data.seeds.filter(s => s.seed_number >= start && s.seed_number <= end);
  const newLegos = data.legos.filter(l => l.seed_number >= start && l.seed_number <= end && l.is_new !== false);
  const livePhrases = data.phrases.filter(p => p.seed_number >= start && p.seed_number <= end);
  // Pod frames are scored from the D codex; the live window's phrases need D tags first.
  if (available.some(id => frameDef(id)?.provenance === 'pod'))
    await ensurePodTagged(livePhrases.map(p => String(p.known_text || '').trim()).filter(Boolean), { knownLanguage: knownLanguageName(course) });
  const before = scoreWindow(livePhrases, available, { rarefyN: 60 });
  const missing = (missingIn || before.missing_ids).filter(f => available.includes(f));
  const taughtBefore = carrierPool(course, data, newLegos);
  const carriers = carriersByFrame(taughtBefore, missing, course);
  const liveZut = new Map();
  for (const r of [...data.legos, ...data.phrases]) {
    const k = norm(r.known_text); if (!k) continue;
    if (!liveZut.has(k)) liveZut.set(k, []);
    const t = norm(r.target_text);
    if (!liveZut.get(k).some(x => x.target === t)) liveZut.get(k).push({ target: t, target_text: r.target_text, seed: r.seed_number });
  }
  const file = path.join(EVIDENCE, `v4gap-${course}-${start}-${end}.json`);
  // A second pass ACCUMULATES: earlier kept candidates count as live (ZUT, duplicates)
  // and stay in the file; the missing list is what the earlier passes left uncovered.
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const priorKept = prior ? prior.kept : [];
  const pass = prior ? (prior.calls || []).length + 1 : 1;
  const prompt = buildGapPrompt({ course, region: [start, end], seeds, newLegos, missing, carriers, data });
  for (const r of priorKept) {
    const k = norm(r.known_text); if (!liveZut.has(k)) liveZut.set(k, []);
    liveZut.get(k).push({ target: norm(r.target_text), target_text: r.target_text, seed: r.seed_number });
  }
  const out = { course, region: [start, end], mode: 'gaps', generated: new Date().toISOString(), model: MODEL, effort: EFFORT,
    available_frames: available, missing_frames: missing, missing_source: missingIn ? 'supplied' : 'frame-tagger', new_legos: newLegos.length,
    prompt_chars: prompt.length, before: prior ? prior.before : before, calls: prior ? prior.calls : [], kept: [...priorKept], rejected: prior ? prior.rejected : [], after: null,
    passes: [...(prior?.passes || []), { pass, missing }] };
  console.log(`${course} ${start}-${end} GAPS: ${newLegos.length} LEGOs, missing ${missing.join(' ')}, prompt ${prompt.length} chars`);
  if (dry) { fs.writeFileSync(file.replace('.json', '.prompt.txt'), prompt); return out; }
  if (!missing.length) { fs.writeFileSync(file, JSON.stringify(out, null, 1)); return out; }
  const ledger = ledgerPath();
  const L = (() => { try { return JSON.parse(fs.readFileSync(ledger, 'utf8')); } catch { return { total: 0, calls: [] }; } })();
  if (L.total >= budget) throw new Error(`budget ${budget} tokens exhausted (ledger ${L.total})`);
  const label = pass === 1 ? 'gaps' : `gaps-${pass}`;
  const r = callModel(prompt);
  persistCandidates(file, label, r);
  L.total += r.usage.total; L.calls.push({ course, start, end, label, ...r.usage, at: new Date().toISOString() });
  fs.writeFileSync(ledger, JSON.stringify(L, null, 1));
  out.calls.push({ label, candidates: r.phrases.length, ...r.usage });
  await tagCandidates(course, r.phrases);
  const g = gate(r.phrases, { course, data, newLegos, liveZut, available, additive: true });
  out.kept.push(...g.kept); out.rejected.push(...g.rejected.map(x => ({ ...x, pass })));
  out.after = scoreWindow([...livePhrases, ...out.kept], available, { rarefyN: 60 });
  out.tokens_spent = out.calls.reduce((a, c) => a + c.total, 0);
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(`  pass ${pass}: ${r.phrases.length} candidates → kept ${g.kept.length}, rejected ${g.rejected.length}; coverage ${out.before.coverage} → ${out.after.coverage} (${out.before.used}→${out.after.used}/${available.length}); ${r.usage.total} tokens (${r.usage.output} out)`);
  return out;
}

/** The token ledger, resolved at CALL time: a driver sets V4_LEDGER per window. */
function ledgerPath() { return path.join(EVIDENCE, process.env.V4_LEDGER || LEDGER_FILE); }

/** Candidate set to disk, named by call: v4-<course>-<s>-<e>.candidates-<label>.json */
function persistCandidates(file, label, r) {
  const p = file.replace(/\.json$/, `.candidates-${label}.json`);
  fs.writeFileSync(p, JSON.stringify({ label, saved: new Date().toISOString(), usage: r.usage, phrases: r.phrases }, null, 1));
  return p;
}

module.exports = { ledgerPath, run, runGaps, buildGapPrompt, gate, admittedOpener, interjectionRule, frameLine, tiles, knownSideCheck, knownHeardCheck, buildPrompt, carriersByFrame, claudeArgs, persistCandidates, MODEL, EFFORT };

if (require.main === module) {
  const args = process.argv.slice(2);
  const pos = args.filter(a => !a.startsWith('--'));
  const dry = args.includes('--dry');
  const bi = args.indexOf('--budget');
  const budget = bi >= 0 ? +args[bi + 1] : 400000;
  const mi = args.indexOf('--missing');
  const missing = mi >= 0 ? args[mi + 1].split(',').filter(Boolean) : null;
  run(pos[0], +pos[1], +pos[2], { dry, budget, gaps: args.includes('--gaps'), missing }).catch(e => { console.error(e.message); process.exit(1); });
}
