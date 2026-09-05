/**
 * THE DECLARATION — what a phrase basket was built to produce, written down
 * BEFORE the model is called, and the mechanical check that judges the batch
 * against it afterwards. Tom's acceptance condition, 2026-09-05: "the production
 * door emits a DECLARATION of the frames and LEGOs a batch was built to
 * instantiate … THE DECLARATION IS THE QA SPEC", so a batch is judged against
 * what it claimed rather than by anyone reading Spanish.
 *
 * Three exports, one lifecycle:
 *
 *   computeDeclaration(sb, course, seed, legoIndex, {proposedLego})
 *     READ-ONLY against the live course tables. Derives the seed's teaching job
 *     from its own admission diff, computes the frame pool this basket can
 *     actually instantiate (seed-attested P* plus pod frames whose fixed
 *     material this basket's own cuts already own), names the split sides this
 *     LEGO admits, and states the floors in force. Every field is DERIVED from
 *     the same modules the lab measures with — nothing here is authored.
 *
 *   checkDeclaration(declaration, phrases)
 *     PURE — no DB, no network, no model. Re-derives every frame signature from
 *     the matchers (the model's own per-phrase claim is NEVER trusted: on the
 *     2026-09-04 proof run 5 of 36 claims were wrong, caught exactly this way),
 *     scores the five diversity axes against the declared pool, tests split
 *     crossing, and answers "did this batch instantiate what it declared?"
 *     with no human reading the target language at all.
 *
 *   frameSection(declaration)
 *     The prompt block that puts the declaration in front of the builder — the
 *     tool that satisfies the gate, shipped with it (Tom's ruling: "any gate
 *     you add must ship with the tool that satisfies it or it has a deletion
 *     date"). Measured on spa_for_eng 599: the same model, same vocabulary,
 *     same floors went from seed composite 0.677 (3 of 4 baskets failing) to
 *     0.804 (4 of 4 passing, first pass) when this section was the only new
 *     input.
 *
 * NON-ENGLISH KNOWN SIDES. The frame layer's patterns are English regexes, so
 * for a course whose known side is not English the declaration says
 * `applicable:false` with the reason — an honest "not applicable", never a
 * thinner or fabricated pool. checkDeclaration and frameSection both pass
 * through cleanly on such a declaration: the door behaves exactly as it did
 * before frames existed.
 *
 * PERSISTENCE IS A FILE, NOT A TABLE — a deliberate departure from the
 * predecessor design (job #503), which proposed a sidecar DB table. The door's
 * standing invariant is WRITES NOTHING to the database (stated in the route,
 * the lib and the A-294 ruling); a declaration row would be its first write, on
 * a live shared schema, unverifiable by canary from a worktree. A file keyed by
 * the deterministic lego id survives regeneration exactly as well, and the
 * declaration ALSO travels in the door's response, so QA can check a batch with
 * no store at all. If declarations should live in the DB, the right writer is
 * the SUBMISSION path (/seed/complete), which already owns content writes.
 */
const fs = require('fs');
const path = require('path');
const { loadCorpus, knownSideIsEnglish } = require('./corpus.cjs');
const { deriveJob, splitsForBasket } = require('./derive-seed-job.cjs');
const { availableVocab, attestedFrames, instantiableFrameSet, expensiveClassFor } = require('./availability.cjs');
const { score, frameSig, matrixClause, FLOORS, MERGED } = require('./pattern-diversity.cjs');

const ROOT = path.join(__dirname, '..', '..');
const DECLARATIONS_DIR = process.env.PHRASE_DECLARATIONS_DIR
  || path.join(ROOT, 'data', 'phrase-declarations');

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
let _patterns, _mapping;
const patternsDoc = () => (_patterns || (_patterns = readJson('docs/frame-layer/english-pattern-inventory.json')));
const mappingDoc = () => (_mapping || (_mapping = readJson('docs/frame-layer/pair-mapping-classes.json')));

/**
 * The deterministic lego id is the declaration's key — phrase ids are
 * API-assigned per write and do not survive a regeneration; the lego id does.
 */
const legoKey = (course, seed, legoIndex) =>
  `${course}:S${String(seed).padStart(4, '0')}L${String(legoIndex).padStart(2, '0')}`;

async function computeDeclaration(sb, course, seed, legoIndex, { proposedLego = null, corpus = null } = {}) {
  const k = Number(legoIndex);
  if (!knownSideIsEnglish(course)) {
    // Honest refusal, not a thinner pool: every matcher below is an English
    // regex and would silently report "no frames" rather than "cannot see".
    return {
      declares: false, applicable: false,
      course, seed: Number(seed), lego_index: k, lego_id: legoKey(course, seed, k),
      reason: `known side of ${course} is not English; the frame layer's patterns are English regexes and would report absence where the truth is blindness`,
      computed_at: new Date().toISOString(),
    };
  }

  // `corpus` lets a course-level caller (qa-report.cjs) read the seed once and
  // declare every basket off it, instead of one full corpus read per LEGO.
  const { seedRow, legos, ownLegos, priorSeeds, priorLegos, priorComponents, components } =
    corpus || await loadCorpus(sb, course, Number(seed));
  if (!seedRow) throw new Error(`no seed ${seed} in ${course}`);

  // A live builder asks BEFORE /seed/complete has written the LEGO; the
  // proposal stands in for the row, marked as such.
  let lego = ownLegos.find(l => +l.lego_index === k) || null;
  let proposed = false;
  if (!lego && proposedLego) {
    lego = { seed_number: Number(seed), lego_index: k, type: proposedLego.type || 'A',
             known_text: proposedLego.known, target_text: proposedLego.target };
    ownLegos.push(lego);
    legos.push(lego);
    proposed = true;
  }
  if (!lego) throw new Error(`no lego ${k} on seed ${seed} of ${course} (and no proposal given)`);

  const job = deriveJob({ course, seedRow, ownLegos, priorSeeds, priorLegos, priorComponents });
  const splits = splitsForBasket(job, k);

  // THIS BASKET's window: everything before this lego, PLUS the lego itself and
  // its own components — every phrase must contain its own LEGO verbatim, so a
  // window without it owns nothing it needs (the 36/36-rejection bug, fixed on
  // branch cs/503 and inherited here).
  const vocab = availableVocab({ legos, components, seed: Number(seed), legoIndex: k });
  vocab.push(...legos.filter(l => l.seed_number === Number(seed) && +l.lego_index === k));
  vocab.push(...components.filter(c => c.seed_number === Number(seed) && +c.lego_index === k));

  const attested = attestedFrames(priorSeeds, seedRow);
  const pool = instantiableFrameSet({ vocab, priorSeeds, seedRow });
  const podPool = pool.filter(p => p.provenance === 'pod');
  const expensive = expensiveClassFor(course, mappingDoc());

  // Pod provenance travels IN the declaration rather than being trusted
  // silently: the committed dialogue inventory can lag the pod canon (it was
  // mined from a pod list that has since moved), and a checker reading the
  // declaration must be able to see how old the pod side of the pool is.
  let podInventory = null;
  try {
    const inv = readJson('docs/frame-layer/dialogue-frame-inventory.json');
    podInventory = { mined_at: inv.mined_at || inv.generated || null,
                    pods: inv.pods || inv.sources || null };
  } catch { podInventory = { mined_at: null, pods: null }; }

  return {
    declares: true, applicable: true, proposed,
    course, seed: Number(seed), lego_index: k,
    lego_id: legoKey(course, seed, k),
    lego: { known_text: lego.known_text, target_text: lego.target_text, type: lego.type },
    seed_known: seedRow.known_text, seed_target: seedRow.target_text,
    job: { verdict: job.verdict, sentence: job.sentence },
    frame_pool: {
      total: pool.length,
      seed_attested: attested.size,
      seed_ids: pool.filter(p => p.provenance === 'seed').map(p => p.id),
      pod: podPool.map(p => ({ id: p.id, name: p.name, position: p.position,
                               register: p.register, owned_via: p.owned_via,
                               grain: p.grain, sentence_projection: p.sentence_projection || null })),
    },
    splits,
    floors: { ...FLOORS },
    expensive_class: expensive ? expensive.class : 'SPLIT',
    pod_inventory: podInventory,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Write the declaration down — the "recorded BEFORE the model is called" half
 * of the acceptance condition. One file per lego id, latest wins; the previous
 * declaration for the same lego is superseded exactly as its phrases would be.
 */
function recordDeclaration(decl, dir = DECLARATIONS_DIR) {
  const at = path.join(dir, decl.course, `${decl.lego_id.split(':')[1] || decl.lego_id}.json`);
  fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.writeFileSync(at, JSON.stringify(decl, null, 2));
  return at;
}

/**
 * DID THE BATCH INSTANTIATE WHAT IT DECLARED? Pure function of (declaration,
 * phrases): re-derived frame signatures, the five floors against the declared
 * pool, split crossing, claim-vs-fired, and pod reach. `phrases` rows carry
 * `phrase_role`, `known_text`, `target_text` and optionally `frame` (the
 * model's claim — audited here, never believed).
 */
function checkDeclaration(decl, phrases) {
  if (!decl || !decl.applicable) {
    return { checked: false, pass: null,
             reason: decl ? decl.reason : 'no declaration', };
  }
  const practice = (phrases || []).filter(p => p.phrase_role !== 'component');
  const s = score(practice, {
    lego: decl.lego.known_text,
    splits: decl.splits || [],
    expensiveClass: decl.expensive_class || 'SPLIT',
    instantiableFrames: decl.frame_pool.total,
  });
  if (!s) return { checked: true, pass: false, reason: 'no practice phrases to check' };

  // CLAIM vs FIRED. A claim is honest iff the claimed id is among the ids the
  // matchers actually fire on the phrase's matrix clause. ∅ fired with a claim
  // made is the dishonest case that motivated this check.
  const claims = practice.filter(p => p.frame && p.frame !== '∅').map(p => {
    const fired = frameSig(matrixClause(p.known_text), MERGED);
    const firedIds = fired === '∅' ? [] : fired.split('+');
    return { known_text: p.known_text, claimed: p.frame, fired,
             honest: firedIds.includes(p.frame) };
  });
  const wrongClaims = claims.filter(c => !c.honest);

  // POD REACH — reported, never gated (taste-safe default, 2026-09-05: a
  // pod-frame floor would be a gate whose tool is unproven; the prompt ASKS,
  // this counts whether the ask landed, and Tom decides from the number).
  const podOffered = (decl.frame_pool.pod || []).map(p => p.id);
  const podFired = new Set();
  for (const p of practice) {
    const fired = frameSig(matrixClause(p.known_text), MERGED);
    for (const id of (fired === '∅' ? [] : fired.split('+'))) {
      if (podOffered.includes(id)) podFired.add(id);
    }
  }

  return {
    checked: true,
    pass: s.pass && wrongClaims.length === 0,
    lego_id: decl.lego_id,
    composite: s.composite,
    axes: s.axes,
    floors: decl.floors,
    floor_failures: s.floor_failures,
    splits: s.splits,
    declared_pool: decl.frame_pool.total,
    distinct_frames: s.distinct_frames,
    lego_absent: s.lego_absent,
    claims_vs_fired: { total: claims.length, wrong: wrongClaims },
    pod_frames: { offered: podOffered, instantiated: [...podFired] },
    // Every shortfall carries its rewrite instruction — the functional steers
    // the builder, the floors judge (Tom's ruling).
    rewrite_instructions: rewriteInstructions(s, decl, wrongClaims),
  };
}

/** One instruction per failed axis, in terms a builder can act on directly. */
function rewriteInstructions(s, decl, wrongClaims) {
  const out = [];
  const say = {
    frame: `FRAME ${s.axes.frame.toFixed(2)} < ${FLOORS.frame}: your matrix clauses collapse to ${s.distinct_frames} shape(s) against a declared pool of ${decl.frame_pool.total}. Vary the MATRIX CLAUSE, not the tail — a swapped tail is the same frame stamped again.`,
    pos: `POS ${s.axes.pos.toFixed(2)} < ${FLOORS.pos}: the LEGO sits in ${s.positions.length} position(s). Put "${decl.lego.known_text}" initially, medially AND finally.`,
    neigh: `NEIGH ${s.axes.neigh.toFixed(2)} < ${FLOORS.neigh}: too few distinct words touch the LEGO. Give it different left and right neighbours across the basket.`,
    junct: `JUNCT ${s.axes.junct.toFixed(2)} < ${FLOORS.junct}: the same neighbour pair repeats. Change what comes immediately before AND after the LEGO together.`,
    split: `SPLIT not crossed: ${(s.splits || []).filter(x => !x.crossed).map(x => `${x.id} ${x.name} — each outcome needs >= 2 distinct known-side skeletons`).join('; ')}.`,
  };
  for (const f of s.floor_failures) if (say[f]) out.push(say[f]);
  for (const c of wrongClaims) out.push(`CLAIM WRONG: "${c.known_text}" claims ${c.claimed} but fires ${c.fired} — instantiate ${c.claimed} for real or claim what you wrote.`);
  return out;
}

/**
 * The prompt block. Everything here is read off the declaration — the prompt
 * and the QA spec cannot drift apart because they are the same object.
 */
function frameSection(decl) {
  if (!decl || !decl.applicable) return '';
  const byId = Object.fromEntries(patternsDoc().patterns.map(p => [p.id, p]));
  const classes = Object.fromEntries(mappingDoc().patterns.map(p => [p.id, p.pairs[decl.course]?.class]));
  const seedLines = decl.frame_pool.seed_ids.filter(id => byId[id])
    .map(id => `${id} ${byId[id].name}: ${byId[id].shape}  [class for this pair: ${classes[id] || '—'}]`);
  const podLines = (decl.frame_pool.pod || []).map(p => {
    const bits = [`${p.position} position`];
    if (p.register && p.register.length) bits.push(`register: ${p.register.join('/')}`);
    bits.push(`you own: "${p.owned_via.join(' ')}"`);
    if (p.grain === 'exchange') bits.push(`exchange frame — write only its ${p.sentence_projection ? `${p.sentence_projection} projection` : 'response half'}`);
    return `${p.id} ${p.name}  [${bits.join('; ')}]`;
  });
  return [
    '---',
    '',
    '## THE DECLARATION — what this basket is being built to instantiate',
    '',
    `This seed's teaching job, derived from its own admission diff — ${decl.job.verdict}:`,
    `  ${decl.job.sentence}`,
    '',
    decl.splits.length
      ? `THIS LEGO ADMITS a side of a split the course has never shown before: ${decl.splits.map(sp => `${sp.id} ${sp.name} → ${sp.outcomes.map(o => o.form).join(' AND ')}`).join('; ')}. Carry EACH outcome in at least TWO genuinely different known-side shapes.`
      : 'This LEGO admits no new side of any split. Its job is lexical: make the word usable across shapes, not make a contrast.',
    '',
    `FRAMES YOU MAY INSTANTIATE (${decl.frame_pool.total} instantiable at this position — attested in this course's own seeds at or before this one):`,
    ...seedLines,
    ...(podLines.length ? [
      '',
      'CONVERSATIONAL FRAMES YOU MAY ALSO INSTANTIATE. These come from the POD corpus — real dialogue — and',
      'they are the register the seed corpus cannot attest: responses, thanks, handovers. Each is listed only',
      'because this basket already owns the material it needs, quoted after "you own"; use that material',
      'exactly as cut, the rest of the phrase from ordinary available vocabulary. USE AT LEAST ONE of these',
      'in the basket if you can do it naturally — the conversational register does not arrive by accident.',
      ...podLines,
    ] : []),
    '',
    'THE BASKET IS SCORED AGAINST THIS DECLARATION, mechanically, on:',
    `  FRAME  distinct pattern signatures of the MATRIX CLAUSE / declared pool     (floor ${FLOORS.frame})`,
    `  POS    distinct positions of the LEGO (initial/medial/final) / 3            (floor ${FLOORS.pos})`,
    `  NEIGH  (distinct left + right neighbours of the LEGO) / (2 x phrases)       (floor ${FLOORS.neigh})`,
    `  JUNCT  distinct (left -> right) neighbour junctions / phrase count          (floor ${FLOORS.junct})`,
    `  SPLIT  each admitted side carried by >= 2 distinct known-side skeletons     (floor ${FLOORS.split})`,
    'Vary the MATRIX CLAUSE, not the tail: swapping the end of a sentence does not change the frame the',
    'LEGO is taught in. Put the LEGO initially, medially and finally. Give it different neighbours.',
    '',
    'Tag every phrase with the frame you are instantiating: add "frame":"<id>" to each phrase object.',
    'Your tags are AUDITED against the matchers, never trusted — a wrong tag fails the set.',
    '',
  ].join('\n');
}

module.exports = { computeDeclaration, checkDeclaration, recordDeclaration, frameSection,
                   rewriteInstructions, legoKey, DECLARATIONS_DIR };
