// Pure ledger reader for tools/audio/tom006-intros.cjs (job #794; lane reviews #804/#805).
/** Ledger state per oldId: the recorded newId, and whether the swap is applied (a complete 'swap' row, not since undone). Pure. */
function ledgerState(rows) {
  const st = new Map()
  for (const e of rows) {
    if (e.kind === 'render') st.set(e.oldId, { ...(st.get(e.oldId) || {}), newId: e.newId, applied: false, row: e })
    else if (e.kind === 'swap') st.set(e.oldId, { newId: e.newId, applied: true, row: e })
    else if (e.kind === 'partial') st.set(e.oldId, { newId: e.newId, applied: false, row: e })
    else if (e.kind === 'undo') { const cur = st.get(e.oldId); if (cur && cur.newId === e.newId) st.set(e.oldId, { ...cur, applied: false }) }
  }
  return st
}
module.exports = { ledgerState }
