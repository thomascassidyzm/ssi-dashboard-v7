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

module.exports = { fadePending, undoRecordable, ledgerState, ledgerPairs, undoPlan, unionSlots, makeLog }
