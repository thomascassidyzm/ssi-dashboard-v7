/**
 * parseMethodPod — the Method Pod re-cut, read as a walk.
 *
 * The sixteen ratified scenes live only as markdown (`docs/pods/method-pod-re-cut-
 * 2026-08-30.md`, commit d800fb499). They are not rows in `canonical_pod_scenarios`,
 * so this pod is READ-ONLY here: the Script Lab shows it and covers it, and editing
 * it stays where it is until it has a store.
 *
 * The re-cut carries no per-turn `M:part:line` references, so nothing can be mapped
 * by reference. What each scene DOES carry is its shape, in its own heading — "the
 * precision haggle", "not-knowing held with status". The alias table below is the
 * mapping from that phrase to a graph node, and it is DECLARED here in the open
 * rather than inferred, because it is a judgement and the stored graph artefact
 * should eventually own it. Anything it does not match is UNMAPPED and shown as
 * such — never guessed.
 *
 * Pure: takes markdown text, returns a flow. No Vue, no network, no fs.
 */

export const DECLARED_ALIASES = [
  { nodeId: 'N13', re: /not-knowing/i,                       why: 'N13 Not-knowing — the heading names the shape' },
  { nodeId: 'N14', re: /premise audit|teasing audit|the audit/i, why: 'N14 Premise audit — a claim having its ground asked for' },
  { nodeId: 'N15', re: /parked clash|parked disagreement/i,  why: 'N15 Parked disagreement' },
  { nodeId: 'N16', re: /haggle/i,                            why: 'N16 Precision haggle' },
  { nodeId: 'N17', re: /banked thread|interrupt/i,           why: 'N17 Interruption-and-bank' },
  { nodeId: 'N6',  re: /self-repair|reformulation/i,         why: 'N6 Repair — non-understanding, reformulate, resume' }
]

function matchNode (heading) {
  for (const a of DECLARED_ALIASES) if (a.re.test(heading)) return a
  return null
}

function cells (line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}

export function parseMethodPod (markdown, opts = {}) {
  const lines = String(markdown).split('\n')
  const scenes = []
  let current = null
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const h = line.match(/^###\s+Scene\s+([\w-]+)\s+—\s+(.*)$/)
    if (h) {
      const rest = h[2]
      const titleMatch = rest.match(/\*(.+?)\*/)
      const alias = matchNode(rest)
      current = {
        number: h[1],
        label: `Scene ${h[1]}`,
        title: titleMatch ? titleMatch[1] : rest,
        subtitle: rest.replace(/\*(.+?)\*/, '').replace(/^\s*—\s*/, '').replace(/\*\*/g, '').trim(),
        nodeId: alias ? alias.nodeId : null,
        aliasWhy: alias ? alias.why : null,
        lines: []
      }
      scenes.push(current)
      inTable = false
      continue
    }
    if (/^##\s/.test(line)) { current = null; inTable = false; continue }
    if (!current) continue
    if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) { inTable = true; continue }
    if (!/^\s*\|/.test(line)) { if (inTable && line.trim() === '') inTable = false; continue }
    if (!inTable) continue
    const c = cells(line)
    if (c.length < 2) continue
    const speaker = c[0].replace(/\*\*/g, '').trim()
    if (!speaker || !/^[A-Z]/.test(speaker)) continue
    current.lines.push({
      speaker,
      text: c[1],
      target: c[2] || '',
      // The shape is declared at the SCENE, so every turn in it walks that node.
      // No per-turn claim is available and none is invented.
      nodeId: current.nodeId
    })
  }

  return {
    id: opts.id || 'method-pod',
    title: opts.title || 'The Method Pod — the re-cut',
    source: 'method-pod-re-cut',
    refSpace: 'method',
    scenes: scenes.filter(s => s.lines.length > 0)
  }
}

export default parseMethodPod
