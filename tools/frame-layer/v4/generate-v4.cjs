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
 *   2. GENERATE. One model call per region (claude --print, opus — the same
 *      family and tier that wrote the live v3 Irish rows, so the comparison is
 *      of designs, not of models). Never the Anthropic SDK.
 *   3. GATE, mechanically, never trusting a claim:
 *        - every phrase contains its LEGO on both sides;
 *        - the target tiles from whole chunks available to THAT basket
 *          (seeds < N, earlier LEGOs of seed N, the LEGO itself, components);
 *        - the known side uses only taught glosses plus the English free class;
 *        - ZUT: one known → one target, against the generated set AND the live
 *          course (whole course for USE, up to position for BUILD — canon P16);
 *        - no parentheses; no stapled opener (it would earn nothing anyway, and
 *          on a USE phrase it is the #463 defect); no duplicates.
 *   4. FLOORS. A basket below 4 BUILD / 5 USE after gating goes back ONCE,
 *      with the gate's words quoted. One retry per region, hard cap.
 *   5. SCORE the region with window-coverage.cjs. Frames are re-derived from
 *      the matchers; the model's frame tag is recorded but never counted.
 *
 * Token discipline: every call's usage is recorded; the run refuses to start a
 * new model call once --budget tokens have been spent. No unbounded loops.
 *
 * Usage: node tools/frame-layer/v4/generate-v4.cjs <course> <start> <end> [--dry] [--budget 400000]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PATTERNS = require('../patterns.cjs');
const { availableVocab, norm } = require('../availability.cjs');
const { loadCourse } = require('./db.cjs');
const { inventory, availableAt } = require('./frame-inventory.cjs');
const { scoreWindow, stripInterjections, framesOf } = require('./window-coverage.cjs');

const ROOT = path.join(__dirname, '..', '..', '..');
const EVIDENCE = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '468-frame-diversity');
const MODEL = process.env.V4_MODEL || 'opus';
const CLAUDE = '/home/tomcassidy/.local/bin/claude';
const BUILD_FLOOR = 4, USE_FLOOR = 5;

// ---------- known-side free class (docs/pair-contracts/_default_eng.contract.cjs) ----------
const CONTRACT = require(path.join(ROOT, 'docs', 'pair-contracts', '_default_eng.contract.cjs'));
const FREE = new Set([...CONTRACT.freeGlue, ...CONTRACT.npiTokens, ...CONTRACT.negationWords,
  'do', 'does', 'did', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  'this', 'that', 'these', 'those', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'about', 'if', 'when', 'but', 'because', 'so', 'or', 'as', 'than', 'too', 'very', 'there', 'here', 'what', 'who', 'where', 'how', 'why', 'which', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'will', 'would', "'ll", "'d", "'m", "'re", "'ve", 'can', 'could', 'should', 'not', "n't", 'all', 'one', 'no', 'yes']);
const stem = (w) => w.replace(/'s$/, '').replace(/(ing|ed|es|s|d)$/, '');
const tokens = (s) => norm(s).split(' ').filter(Boolean);

function knownSideCheck(known, ownedKnownStems) {
  const bad = [];
  for (const t of tokens(known)) {
    if (FREE.has(t)) continue;
    if (ownedKnownStems.has(t) || ownedKnownStems.has(stem(t))) continue;
    bad.push(t);
  }
  return bad;
}

// ---------- target tiling (same walk as the lab's tilesFromVocab) ----------
function tiles(target, vocabTargets) {
  const chunks = [...new Set(vocabTargets.map(norm).filter(Boolean))].sort((a, b) => b.length - a.length);
  const words = norm(target).split(' ').filter(Boolean);
  const memo = new Map();
  const walk = (i) => {
    if (i >= words.length) return [];
    if (memo.has(i)) return memo.get(i);
    let res = null;
    for (const c of chunks) {
      const cw = c.split(' ');
      if (cw.length > words.length - i || !cw.every((w, j) => w === words[i + j])) continue;
      const rest = walk(i + cw.length);
      if (rest) { res = [c, ...rest]; break; }
    }
    memo.set(i, res);
    return res;
  };
  const t = walk(0);
  if (t) return { ok: true, tiling: t };
  const owned = new Set(chunks.flatMap(c => c.split(' ')));
  return { ok: false, untiled: [...new Set(words.filter(w => !owned.has(w)))] };
}

// ---------- the walk-back brief ----------
function carriersByFrame(chunks, frameIds) {
  const out = {};
  for (const id of frameIds) {
    const p = PATTERNS.find(x => x.id === id);
    const hits = chunks.filter(c => p.test(c.known_text || '') && tokens(c.known_text).length <= 6);
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

function buildPrompt({ course, region, seeds, newLegos, allChunks, available, carriers, retry }) {
  const target = course.split('_for_')[0];
  const LANG = { fra: 'French', deu: 'German', gle: 'Irish', spa: 'Spanish', ita: 'Italian' }[target] || target;
  const frameLines = available.map(id => {
    const p = PATTERNS.find(x => x.id === id);
    const cs = (carriers[id] || []).map(c => `"${c.known_text}" = ${c.target_text}`).join(' · ');
    return `  ${id} ${p.name}  ${p.shape}${cs ? `\n      taught material that carries it: ${cs}` : ''}`;
  }).join('\n');
  const seedLines = seeds.map(s => {
    const mine = newLegos.filter(l => l.seed_number === s.seed_number);
    if (!mine.length) return null;
    return `SEED ${s.seed_number}: "${s.known_text}" = ${s.target_text}\n` + mine.map(l =>
      `  LEGO S${s.seed_number}L${l.lego_index}: "${l.known_text}" = ${l.target_text}  [${l.type}]  — ${BUILD_FLOOR} BUILD + ${USE_FLOOR} USE`).join('\n');
  }).filter(Boolean).join('\n');
  const vocab = allChunks.map(c => `${c.known_text}=${c.target_text}`).join('; ');
  const retryBlock = retry ? `
THIS IS A RETRY for the baskets below only. Your previous phrases for them were refused by the gates for the reasons quoted. Write a fresh FULL basket (${BUILD_FLOOR} BUILD + ${USE_FLOOR} USE) for each, fixing exactly those reasons.
${retry.map(r => `  ${r.id} "${r.known}" = ${r.target}: ${r.reasons.join(' | ')}`).join('\n')}
` : '';
  return `You are writing practice phrases for an SSi ${LANG} course (known side English, target side ${LANG}). Seeds ${region[0]}-${region[1]}.

THE OBJECTIVE. Each NEW LEGO below gets a full basket: exactly ${BUILD_FLOOR} BUILD and ${USE_FLOOR} USE phrases. Variety comes from FRAMES: across all the phrases you write for these seeds, every frame in the list below must be used at least once, and the more different frames you use the better. You do this by putting the new LEGO in concert with material the learner already owns — the taught chunks named under each frame — walking back through the course, not by adding words.

NOT ALLOWED, and worth nothing: an interjection or discourse opener stapled on the front ("thank you,", "of course", "unfortunately", "no problem", "great", "well", "so", "really", "yes,", "no,"). A phrase that begins with one is refused. Variety is a frame change, never an opener.

RAILS (every one is checked mechanically after you write; a phrase that fails is dropped):
- The phrase contains the LEGO's exact known text AND exact target text, as taught.
- The target is built ONLY from whole taught chunks listed in VOCABULARY — no new word, no re-conjugation, no new contraction. A basket may use chunks from earlier seeds and earlier LEGOs of its own seed, never later ones.
- The known (English) side uses only the English glosses of taught chunks plus plain grammatical glue.
- ZUT: one English prompt maps to exactly one ${LANG} form, everywhere in the course. Do not write an English line the course already renders another way.
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

VOCABULARY (every chunk the learner owns by seed ${region[1]}, known=target; earlier chunks only for earlier baskets):
${vocab}

Reply with JSON only, no prose, no code fence:
{"phrases":[{"seed":${region[0]},"lego_index":1,"role":"build|use","known":"...","target":"...","frame":"P-id"}]}`;
}

// ---------- the model call ----------
function callModel(prompt, { timeoutMs = 1200000 } = {}) {
  const { claudeEnv } = require(path.join(ROOT, 'services', 'shared', 'claude-config.cjs'));
  const args = ['--print', '--model', MODEL, '--output-format', 'json', '--tools', '',
    '--system-prompt', 'You write practice phrases for a language course. You follow the rails exactly and reply with JSON only.',
    '--exclude-dynamic-system-prompt-sections'];
  const t0 = Date.now();
  // Thinking is capped: the shakedown region spent 41k output tokens of which
  // ~34k were thinking, for 216 phrases. 3,000 is enough to plan a basket.
  const env = { ...claudeEnv(process.env), MAX_THINKING_TOKENS: String(process.env.V4_THINKING || 3000) };
  let raw;
  try {
    raw = execFileSync(CLAUDE, args, { input: prompt, env, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    throw new Error(`claude --print failed: ${String(e.stderr || e.message).slice(0, 400)}`);
  }
  const j = JSON.parse(raw);
  if (j.is_error) throw new Error(`model error: ${String(j.result).slice(0, 300)}`);
  const u = j.usage || {};
  const usage = { input: u.input_tokens || 0, cache_create: u.cache_creation_input_tokens || 0, cache_read: u.cache_read_input_tokens || 0,
    output: u.output_tokens || 0, cost_usd: j.total_cost_usd || 0, model: Object.keys(j.modelUsage || {})[0] || null, ms: Date.now() - t0 };
  usage.total = usage.input + usage.cache_create + usage.cache_read + usage.output;
  const m = String(j.result || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in model output: ' + String(j.result).slice(0, 300));
  return { phrases: JSON.parse(m[0]).phrases || [], usage };
}

// ---------- gates ----------
function gate(cands, { course, data, newLegos, liveZut, available }) {
  const kept = [], rejected = [];
  const seenKnown = new Map(), seenTarget = new Set();
  const legoOf = (c) => newLegos.find(l => l.seed_number === +c.seed && +l.lego_index === +c.lego_index);
  for (const c of cands) {
    const lego = legoOf(c);
    const reasons = [];
    const known = String(c.known || '').trim(), target = String(c.target || '').trim();
    const role = c.role === 'build' ? 'build' : 'use';
    if (!lego) { rejected.push({ ...c, reasons: ['no such new LEGO in this region'] }); continue; }
    if (!known || !target) reasons.push('empty side');
    if (/[()]/.test(known + target)) reasons.push('parentheses');
    if (!norm(known).includes(norm(lego.known_text))) reasons.push(`known side does not contain the LEGO "${lego.known_text}"`);
    if (!norm(target).includes(norm(lego.target_text))) reasons.push(`target does not contain the LEGO "${lego.target_text}"`);
    const { stripped } = stripInterjections(known);
    if (stripped.length) reasons.push(`stapled opener "${stripped.join(', ')}"`);
    // per-basket vocabulary window
    const vocab = availableVocab({ legos: data.legos, components: data.components, seed: lego.seed_number, legoIndex: +lego.lego_index });
    vocab.push({ known_text: lego.known_text, target_text: lego.target_text });
    vocab.push(...data.components.filter(x => x.seed_number === lego.seed_number && +x.lego_index === +lego.lego_index));
    const t = tiles(target, vocab.map(v => v.target_text));
    if (!t.ok) reasons.push(t.untiled.length ? `target uses untaught words: ${t.untiled.join(' ')}` : 'target does not tile from WHOLE taught chunks (a form or contraction never taught as a unit)');
    const ownedStems = new Set(vocab.flatMap(v => tokens(v.known_text)).flatMap(w => [w, stem(w)]));
    const badKnown = knownSideCheck(known, ownedStems);
    if (badKnown.length) reasons.push(`known side uses untaught words: ${badKnown.join(' ')}`);
    // ZUT — one known → one target; USE against the whole live course, BUILD up to its position
    const nk = norm(known), nt = norm(target);
    const live = liveZut.get(nk);
    if (live) {
      const clash = live.find(x => x.target !== nt && (role === 'use' || x.seed <= lego.seed_number));
      if (clash) reasons.push(`ZUT: the course already renders "${known}" as "${clash.target_text}" (seed ${clash.seed})`);
    }
    if (seenKnown.has(nk) && seenKnown.get(nk) !== nt) reasons.push('ZUT: same English already used with another target in this set');
    if (seenKnown.has(nk) && seenKnown.get(nk) === nt) reasons.push('duplicate');
    if (seenTarget.has(nt + '|' + role) && !reasons.includes('duplicate')) reasons.push('duplicate target');
    if (role === 'use' && tokens(known).length < 4) reasons.push('USE phrase too short to be a complete sentence');
    const frames = framesOf(known).filter(f => available.includes(f));
    const row = { seed_number: lego.seed_number, lego_index: +lego.lego_index, lego_known: lego.known_text, lego_target: lego.target_text,
      phrase_role: role, known_text: known, target_text: target, claimed_frame: c.frame || null, frames };
    if (reasons.length) { rejected.push({ ...row, reasons }); continue; }
    seenKnown.set(nk, nt); seenTarget.add(nt + '|' + role);
    kept.push(row);
  }
  return { kept, rejected };
}

function basketFloors(kept, newLegos) {
  return newLegos.map(l => {
    const mine = kept.filter(p => p.seed_number === l.seed_number && p.lego_index === +l.lego_index);
    const b = mine.filter(p => p.phrase_role === 'build').length, u = mine.filter(p => p.phrase_role === 'use').length;
    return { id: `S${l.seed_number}L${l.lego_index}`, known: l.known_text, target: l.target_text, build: b, use: u, ok: b >= BUILD_FLOOR && u >= USE_FLOOR, lego: l };
  });
}

// ---------- main ----------
async function run(course, start, end, { dry = false, budget = 400000 } = {}) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const data = loadCourse(course);
  const inv = inventory(course, data);
  const available = availableAt(inv, end);
  const seeds = data.seeds.filter(s => s.seed_number >= start && s.seed_number <= end);
  const newLegos = data.legos.filter(l => l.seed_number >= start && l.seed_number <= end && l.is_new !== false);
  const taughtBefore = [...data.legos, ...data.components].filter(c => c.seed_number < start);
  const allChunks = [...data.legos, ...data.components].filter(c => c.seed_number <= end)
    .filter((c, i, a) => a.findIndex(x => norm(x.known_text) === norm(c.known_text) && norm(x.target_text) === norm(c.target_text)) === i)
    .sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const carriers = carriersByFrame(taughtBefore, available);
  // live ZUT reference: every known → targets, from legos and practice rows of the whole course
  const liveZut = new Map();
  for (const r of [...data.legos, ...data.phrases]) {
    const k = norm(r.known_text); if (!k) continue;
    if (!liveZut.has(k)) liveZut.set(k, []);
    const t = norm(r.target_text);
    if (!liveZut.get(k).some(x => x.target === t)) liveZut.get(k).push({ target: t, target_text: r.target_text, seed: r.seed_number });
  }
  const prompt = buildPrompt({ course, region: [start, end], seeds, newLegos, allChunks, available, carriers });
  const out = { course, region: [start, end], generated: new Date().toISOString(), model: MODEL, available_frames: available,
    new_legos: newLegos.length, prompt_chars: prompt.length, calls: [], kept: [], rejected: [], floors: null, score: null };
  const file = path.join(EVIDENCE, `v4-${course}-${start}-${end}.json`);
  if (dry) { console.log(`${course} ${start}-${end}: ${newLegos.length} new LEGOs, ${available.length} frames available, prompt ${prompt.length} chars`); fs.writeFileSync(file.replace('.json', '.prompt.txt'), prompt); return out; }

  // CUMULATIVE budget across every region of the pilot: a ledger in the evidence
  // dir, read before each call. Tom's cap for the whole pilot is ~400k tokens.
  const ledger = path.join(EVIDENCE, 'token-ledger.json');
  const readLedger = () => { try { return JSON.parse(fs.readFileSync(ledger, 'utf8')); } catch { return { total: 0, calls: [] }; } };
  let spent = 0;
  const call = (p, label) => {
    const L = readLedger();
    if (L.total >= budget) throw new Error(`pilot budget ${budget} tokens exhausted (ledger ${L.total}) before ${course} ${start}-${end} ${label}`);
    const r = callModel(p);
    spent += r.usage.total;
    L.total += r.usage.total; L.calls.push({ course, start, end, label, ...r.usage, at: new Date().toISOString() });
    fs.writeFileSync(ledger, JSON.stringify(L, null, 1));
    out.calls.push({ label, prompt_chars: p.length, candidates: r.phrases.length, ...r.usage });
    console.log(`  ${label}: ${r.phrases.length} candidates, ${r.usage.total} tokens (${r.usage.output} out), $${r.usage.cost_usd.toFixed(2)}, ${Math.round(r.usage.ms / 1000)}s`);
    return r.phrases;
  };
  console.log(`${course} ${start}-${end}: ${newLegos.length} new LEGOs, ${available.length} frames available, prompt ${prompt.length} chars`);
  let cands = call(prompt, 'generate');
  let g = gate(cands, { course, data, newLegos, liveZut, available });
  let floors = basketFloors(g.kept, newLegos);
  const failing = floors.filter(f => !f.ok);
  console.log(`  gates: kept ${g.kept.length}, rejected ${g.rejected.length}; baskets below floor: ${failing.length}/${floors.length}`);
  if (failing.length) {
    // ONE retry, for the failing baskets only, quoting the gate's reasons.
    const retry = failing.map(f => ({ id: f.id, known: f.known, target: f.target,
      reasons: [...new Set(g.rejected.filter(r => r.seed_number === f.lego.seed_number && r.lego_index === +f.lego.lego_index).flatMap(r => r.reasons))].slice(0, 6)
        .concat([`had ${f.build} BUILD and ${f.use} USE after gating; needs ${BUILD_FLOOR}+${USE_FLOOR}`]) }));
    const p2 = buildPrompt({ course, region: [start, end], seeds, newLegos: failing.map(f => f.lego), allChunks, available, carriers, retry });
    const c2 = call(p2, 'retry');
    const g2 = gate(c2, { course, data, newLegos, liveZut, available });
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

module.exports = { run, gate, tiles, knownSideCheck, buildPrompt, carriersByFrame };

if (require.main === module) {
  const args = process.argv.slice(2);
  const pos = args.filter(a => !a.startsWith('--'));
  const dry = args.includes('--dry');
  const bi = args.indexOf('--budget');
  const budget = bi >= 0 ? +args[bi + 1] : 400000;
  run(pos[0], +pos[1], +pos[2], { dry, budget }).catch(e => { console.error(e.message); process.exit(1); });
}
