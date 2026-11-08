// One piece per line, so a diff names the piece that changed (job #577). Shared by fold-span-cuts.cjs and wire-staging.cjs.
const piecesJson = (head, turns) => JSON.stringify(head, null, 1).replace(/\n}$/, ',\n "turns": {\n' + Object.entries(turns).map(([id, ps]) => `  ${JSON.stringify(id)}: [\n${ps.map((p) => `   ${JSON.stringify(p)}`).join(',\n')}\n  ]`).join(',\n') + '\n }\n}\n');
module.exports = { piecesJson };
