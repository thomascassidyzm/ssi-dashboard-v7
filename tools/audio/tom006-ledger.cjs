// Pure ledger reader for tools/audio/tom006-intros.cjs and tom006-fade.cjs (job #794; lane reviews #804, #805, #811, #812).
// A "pair" is one oldId -> newId swap. Its slots are the UNION of every slot any render/swap/partial row recorded for it (a retry after a partial swap only
// finds the slots still on oldId, so the latest row alone would forget the slots moved earlier), de-duplicated by tbl:key.
const slotKey = s => `${s.tbl}:${s.key}`
const unionSlots = (a = [], b = []) => { const m = new Map(); for (const s of [...a, ...b]) m.set(slotKey(s), { tbl: s.tbl, key: s.key }); return [...m.values()] }

/** All pairs in first-seen order: { oldId, newId, lego_id, slots, applied (a complete 'swap' row, not since undone), undoable (anything recorded since the last undo), row }. */
function ledgerPairs(rows) {
  const pairs = new Map()
  for (const e of rows) {
    if (!['render', 'swap', 'partial', 'undo'].includes(e.kind)) continue
    const k = `${e.oldId}|${e.newId}`; const cur = pairs.get(k) || { oldId: e.oldId, newId: e.newId, lego_id: e.lego_id, slots: [], applied: false, undoable: false, row: e }
    if (e.kind === 'undo') { cur.applied = false; cur.undoable = false; cur.slots = [] }
    else { cur.slots = unionSlots(cur.slots, e.slots); cur.undoable = true; cur.applied = e.kind === 'swap'; cur.row = e; cur.lego_id = e.lego_id || cur.lego_id }
    pairs.set(k, cur)
  }
  return [...pairs.values()]
}

/** Ledger state per oldId (the most recently touched pair): the recorded newId, whether it is applied, and the merged row. Pure. */
function ledgerState(rows) {
  const st = new Map()
  const order = new Map(); rows.forEach((e, i) => { if (e.kind && ['render', 'swap', 'partial', 'undo'].includes(e.kind)) order.set(`${e.oldId}|${e.newId}`, i) })
  for (const p of ledgerPairs(rows).sort((a, b) => order.get(`${a.oldId}|${a.newId}`) - order.get(`${b.oldId}|${b.newId}`))) st.set(p.oldId, { newId: p.newId, applied: p.applied, undoable: p.undoable, slots: p.slots, row: { ...p.row, slots: p.slots } })
  return st
}

/** What --undo must revert, latest first: every pair with anything recorded since its last undo (render, partial and swap rows alike), with its merged slots. */
const undoPlan = rows => ledgerPairs(rows).filter(p => p.undoable).reverse()

/** The ledger appender: a no-op in a dry run (lane review #811: --dry-run wrote a skip row). */
const makeLog = (file, dry) => e => { if (!dry) require('fs').appendFileSync(file, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n') }

/** Lane review #815: the intros ledger's newIds are the UNFADED clips for German, so undoing it while the fade ledger still has un-undone pairs moves 0 slots. How many fade pairs are pending? */
const fadePending = fadeRows => undoPlan(fadeRows).length
/** An undo row is recorded only when slots really moved (a 0-move undo must leave the pair in later plans). */
const undoRecordable = moved => moved > 0

/** A ledger row was faded AT RENDER TIME only when it carries a rawId that differs from its newId (rawId === newId is an unfaded take that still needs the fade tool; lane review #841). */
const fadedAtRender = row => !!(row && row.rawId && row.rawId !== row.newId)

/** Job #836's first run wrote 'intent'/'swap' rows with no oldId (slots grouped by from-id); expand them into the shared per-pair 'render'/'swap'/'partial' rows. Pure. */
const expandLegacyRows = rows => rows.flatMap(e => {
  if (!['intent', 'swap'].includes(e.kind) || Object.hasOwn(e, 'oldId')) return [e]   // legacy rows have NO oldId key at all; a gap row's oldId is an explicit null
  const by = new Map(); for (const s of e.slots || []) { if (!by.has(s.from)) by.set(s.from, []); by.get(s.from).push(s) }
  const kind = e.kind === 'intent' ? 'render' : (e.wanted != null && e.slots.length < e.wanted) ? 'partial' : 'swap'
  return [...by].map(([oldId, slots]) => ({ ...e, kind, oldId, slots }))
})

/** Lane review #847: what --undo must revert for a pair is the slots that ACTUALLY moved (the swap/partial rows' slots, since its last undo), not the intent row's wished-for slots — a refused slot would otherwise wedge the undo forever. */
function undoPlanMoved(rows) {
  const moved = new Map()   // pair -> union of moved slots since its last undo
  for (const e of rows) {
    const k = `${e.oldId}|${e.newId}`
    if (e.kind === 'undo') moved.delete(k)
    else if (['swap', 'partial'].includes(e.kind)) moved.set(k, unionSlots(moved.get(k), e.slots))
  }
  // a pair with only a render (intent) row — a crash between the journal and the first pointer move — keeps its intent slots as CANDIDATES (intentOnly): undo restores those still on newId and never blocks on the rest (lane review #851)
  return undoPlan(rows).map(p => { const m = moved.get(`${p.oldId}|${p.newId}`); return m ? { ...p, slots: m, intentOnly: false } : { ...p, intentOnly: true } }).filter(p => p.slots.length)
}

/**
 * Undo by construction (lane review #854): no pair bookkeeping. Returns { restore: Map slotKey -> { tbl, key, from }, newIds: Set } from EVERY render/partial/swap row.
 * A slot's restore target is the from-id of its most recent recorded move that is not itself one of this project's new ids (so a re-run chain can never "restore" to our own clip);
 * a slot whose row carries no per-slot from falls back to the row's oldId. Undo = for each slot whose live pointer is in newIds, set it back to its restore target.
 */
function restoreMap(rows) {
  const restore = new Map(), newIds = new Set(), firsts = new Map()
  for (const e of rows) if (['render', 'partial', 'swap'].includes(e.kind)) {
    if (e.newId) newIds.add(e.newId)
    for (const s of e.slots || []) { const from = s.from !== undefined ? s.from : e.oldId; if (from === undefined) continue; const k = `${s.tbl}:${s.key}`; if (!firsts.has(k)) firsts.set(k, []); firsts.get(k).push({ tbl: s.tbl, key: s.key, from }) }
  }
  for (const [k, list] of firsts) restore.set(k, [...list].reverse().find(x => x.from == null || !newIds.has(x.from)) || list[0])   // LATEST move wins (covers an external edit between our moves); a from that is itself one of our clips is skipped back past (lane review #858)
  return { restore, newIds }
}

module.exports = { restoreMap, undoPlanMoved, fadedAtRender, expandLegacyRows, fadePending, undoRecordable, ledgerState, ledgerPairs, undoPlan, unionSlots, makeLog }
