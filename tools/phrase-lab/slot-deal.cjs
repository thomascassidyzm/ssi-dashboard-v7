/**
 * SLOT DEALING — option (a) of audit #423, piloted beside (b)+(d) on one third
 * of Italian (Tom's GO, 2026-09-27).
 *
 * (b)+(d) tells each basket what the course has overused and refuses repeats.
 * (a) goes one step earlier: the runner holds the whole course's distribution
 * and DEALS each USE slot a recipe before the model writes a word —
 *   FRAME     a frame id from this basket's own declared pool (the frame-layer
 *             declaration: what is instantiable here), least used so far;
 *   POSITION  where the LEGO sits: start / filling / end, rotated;
 *   NEIGHBOUR one AVAILABLE LEGO from the recent course (last RECENT_SEEDS
 *             seeds), least used so far, different in every slot.
 * A dealt recipe may have no natural sentence — that pressure is exactly what
 * produced "I'm surprised but when do you want to find the truth". So every
 * slot carries an ESCAPE: the model declines it, says why in a few words, and
 * writes a natural phrase of its own. Declines are counted, not punished; the
 * gates and the naturalness judge sit behind it unchanged.
 *
 * Counters: { frames: Map id→uses, neighbours: Map legoId→uses } over the
 * arm's baskets so far — the runner builds them from the arm's candidates.
 */
const { frameSig, matrixClause, MERGED } = require('../frame-layer/pattern-diversity.cjs');

const RECENT_SEEDS = 120;
const POSITIONS = ['start', 'filling', 'end'];
const POSITION_TEXT = {
  start: 'the LEGO opens the sentence',
  filling: 'the LEGO sits in the middle, with material on BOTH sides',
  end: 'the LEGO closes the sentence',
};

/** Frame ids a known-side sentence fires (matrix clause). */
function framesOf(known) {
  const f = frameSig(matrixClause(known), MERGED);
  return f === '∅' ? [] : f.split('+');
}

/** Counters from an arm's existing baskets. */
function countersFrom(baskets) {
  const frames = new Map();
  const neighbours = new Map();
  for (const b of baskets) {
    for (const p of b.use || []) {
      for (const id of framesOf(p.known)) frames.set(id, (frames.get(id) || 0) + 1);
      for (const t of p.tiles || []) if (t.legoId) neighbours.set(t.legoId, (neighbours.get(t.legoId) || 0) + 1);
    }
  }
  return { frames, neighbours };
}

/**
 * Deal `n` USE slots for one basket. Deterministic given its inputs.
 * @param decl      the frame-layer declaration (frame_pool.seed_ids / .pod)
 * @param inventory buildInventory() result (available items with seedNumber)
 * @param counters  { frames, neighbours }
 */
function dealSlots(decl, inventory, counters, n = 6) {
  const pool = [
    ...((decl && decl.frame_pool && decl.frame_pool.seed_ids) || []),
    ...(((decl && decl.frame_pool && decl.frame_pool.pod) || []).map((p) => p.id)),
  ];
  const uses = (m, k) => m.get(k) || 0;
  const frames = [...new Set(pool)].sort((a, b) => uses(counters.frames, a) - uses(counters.frames, b) || a.localeCompare(b));
  const seed = inventory.seedNumber;
  const recent = (inventory.available || [])
    .filter((i) => i.kind === 'lego' && seed - i.seedNumber <= RECENT_SEEDS && String(i.target || '').trim().length >= 3)
    .sort((a, b) => uses(counters.neighbours, a.legoId) - uses(counters.neighbours, b.legoId) || b.seedNumber - a.seedNumber);
  const slots = [];
  for (let i = 0; i < n; i++) {
    const frame = frames.length ? frames[i % frames.length] : null;
    const neighbour = recent[i] || null;
    slots.push({ slot: i + 1, frame, position: POSITIONS[(i + seed) % 3], neighbour: neighbour ? { legoId: neighbour.legoId, known: neighbour.known, target: neighbour.target } : null });
    if (frame) counters.frames.set(frame, uses(counters.frames, frame) + 1);
    if (neighbour) counters.neighbours.set(neighbour.legoId, uses(counters.neighbours, neighbour.legoId) + 1);
  }
  return slots;
}

/** The prompt section: one recipe per USE slot, with the escape stated. */
function slotSection(slots, patternsById = {}) {
  if (!slots || !slots.length) return '';
  const line = (s) => {
    const f = s.frame ? `frame ${s.frame}${patternsById[s.frame] ? ` ${patternsById[s.frame].name}: ${patternsById[s.frame].shape}` : ''}` : 'any frame';
    const nb = s.neighbour ? `; use "${s.neighbour.known}" = "${s.neighbour.target}" (${s.neighbour.legoId}) next to the LEGO` : '';
    return `- USE slot ${s.slot}: ${f}; ${POSITION_TEXT[s.position]}${nb}.`;
  };
  return `

---

## YOUR USE SLOTS — the course has dealt each one a recipe

The course holds the whole distribution of frames and neighbours; these recipes
spread them so no frame or neighbour is worn out. Write USE phrase N to slot N,
and add "slot": N to it.

${slots.map(line).join('\n')}

THE ESCAPE: if a recipe has no natural sentence, DECLINE it — never force it.
Put {"slot": N, "why": "<a few words>"} in a top-level "declined_slots" array and
write a natural USE phrase of your own for that slot instead. A natural phrase
that ignores its recipe beats a contorted one that obeys it. Write at least as
many USE phrases as there are slots.
`;
}

module.exports = { dealSlots, slotSection, countersFrom, framesOf, RECENT_SEEDS };
