#!/usr/bin/env node
// Post-hoc move check (#992): run chain.cjs's same strict judge on turns the planner did NOT tag, for a move
// the turn may have performed unplanned. A pass is recorded as a tag with posthoc:true (the README says so);
// a fail changes nothing. Usage: node rejudge.cjs <outKey> <turn>:<moveId> [...]   (CLAUDE_CONFIG_DIR as for chain.cjs)
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const [, , key, ...cands] = process.argv;
const file = path.join(__dirname, `out-${key}.json`);
const run = JSON.parse(fs.readFileSync(file, 'utf8'));
const T = run.T;
const MOVES = Object.fromEntries(require('../../../services/shared/metagraph/moves.json').moves.map(m => [m.id, m]));
const src = fs.readFileSync(path.join(__dirname, 'chain.cjs'), 'utf8');
const GROUP = eval('(' + src.match(/const GROUP = (\{[\s\S]*?\n\});/)[1] + ')');
const JUDGE = src.match(/const JUDGE = `([^`]*)`/)[1];
const lines = T.map((e, i) => `${i + 1}. ${e.overlap ? '[starting over the end] ' : ''}${e.speaker}: ${e.cutOff ? e.line + '—' : e.line}`);
run.judgements = run.judgements || [];
for (const c of cands) {
  const [turn, id] = c.split(':'); const k = +turn - 1;
  const q = `MOVE: ${id} "${MOVES[id].name}". Its test: ${MOVES[id].test}
GROUP READING (the agreed form of this move at a table of several people): ${GROUP[id]}.
GROUP RULE: the move must happen in a part of the talk where at least three people are taking part; a two-person exchange does not count. Where the test needs the other party's response (confirming, ratifying, adopting), that response must actually be there in the following turns.
TRANSCRIPT EXCERPT (numbered turns):
${lines.slice(Math.max(0, k - 8), Math.min(T.length, k + 3)).join('\n')}

Does turn ${k + 1} (${T[k].speaker}) perform ${id}?`;
  const out = execFileSync(path.join(process.env.HOME, '.local/bin/claude'), ['-p', '--model', 'opus', '--system-prompt', JUDGE, '--tools', '', '--no-session-persistence', '--setting-sources', '', '--strict-mcp-config'], { input: q, encoding: 'utf8', timeout: 180000 });
  const v = JSON.parse(out.match(/\{[\s\S]*\}/)[0]);
  run.judgements.push({ turn: k + 1, speaker: T[k].speaker, move: id, pass: !!v.pass, reason: v.reason, posthoc: true });
  console.log(c, v.pass ? 'PASS' : 'FAIL', v.reason);
  if (v.pass && !T[k].move) { T[k].move = id; T[k].posthoc = true; }
}
run.hit = T.map((e, k) => e.move ? { id: e.move, turn: k + 1, ...(e.posthoc ? { posthoc: true } : {}) } : null).filter(Boolean);
fs.writeFileSync(file, JSON.stringify(run, null, 2));
