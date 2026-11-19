#!/usr/bin/env node
// Pod 3 text-only live-chain test (#961·AI; v2 cards, topics and rules #980; v3 pub talk, short turns #986).
// One "next turn" call per turn: shared transcript (AS HEARD) + six persona cards in, {speaker, line,
// cut_in, overlap, backchannels} out. Mirrors the live-chain design (/d/bb491252 §9): the previous
// line is fully written before the next is generated, so a cut-in is the player fading that speaker
// at a word — in text, the previous line is truncated at that point and ends with an em dash.
// Usage: node chain.cjs <topicKey> <turns> <model>   (env: OUT_KEY, AVOID_FILE, STYLE_FILE)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , topicKey, turnsArg = '30', model = 'opus'] = process.argv;
// v4 (#992): Tom on round 3, "we should be using this for structure but making the content somewhat more
// elevated / The idea is to make things more interesting". Same rhythm; the moment is now something
// genuinely interesting that arrived the way a pub arrives at things (something seen, read, found or
// half-remembered), and each evening carries a PLAN of layer-3 group-contribution moves (the metagraph's
// F-ids, services/shared/metagraph/moves.json) that the engine steers towards and a judge checks.
// plan entries: {id, from, to, hint, followup?}. from/to = turn window (1-based). F303 is two-part:
// a "coin" entry (not tagged) and a later redeploy entry that carries the tag.
const TOPICS = {
  tickle: {
    moment: "Danny's daughter rang him this afternoon and told him you physically can't tickle yourself, and that it's something to do with the brain. He has spent ten minutes trying under the table and has just told the others. Jess is already trying it.",
    ending: "The talk has moved on to a question the tickling opened up (about what else the brain predicts or ignores, or what that means for people) and someone is mid-way through a half-formed idea about it, unresolved, when it stops.",
    plan: [
      { id: 'F302', from: 3, to: 8, hint: "someone who half-knows why (Femi or Sunny) first marks down their own authority, plainly, and then says what they think the reason is at full strength" },
      { id: 'F9', from: 8, to: 13, hint: "someone else, before pushing back, offers back an accurate version of that explanation in their own words, as a check before they push on it; the person who gave it confirms it next turn", followup: "confirm-or-correct" },
      { id: 'F303', role: 'coin', from: 9, to: 15, hint: "someone coins a short, vivid phrase for the idea under discussion that the others pick up" },
      { id: 'F16', from: 14, to: 22, hint: "someone concedes the point another person just made, and then holds their own different view with a but" },
      { id: 'F11', from: 18, to: 26, hint: "someone is asked a direct question, answers it briefly, and in the same turn hands the same question to someone at the table who has said little" },
      { id: 'F303', role: 'reuse', from: 24, to: 33, hint: "a different person redeploys the phrase coined earlier as a tease, shorthand or argument; its ownership can be contested" },
    ],
  },
  warsaw: {
    moment: "Danny is back from three days in Warsaw visiting his cousin. He's just told the table that the beautiful old town there, which looks medieval, was flattened in the war and rebuilt in the fifties, partly from eighteenth-century paintings by a Venetian painter, and that where the painter got a detail wrong they sometimes built it wrong on purpose. Hugh has asked whether that makes it fake.",
    ending: "It does not resolve: the last turns have found the real question underneath and two people are still on opposite sides of it, mid-thought, when it stops.",
    plan: [
      { id: 'F2', from: 2, to: 7, hint: "someone asks Danny a plain factual question about the place or the rebuilding; he answers it and then volunteers a detail nobody asked for that changes the picture" },
      { id: 'F301', from: 7, to: 14, hint: "after someone has been building a view for a few turns, a listener hands it back compressed into a sharper name for what is really at stake; the person who built the view ratifies it and adopts that name next turn", followup: "ratify-and-adopt" },
      { id: 'F305', from: 13, to: 21, hint: "someone pushes back with a counterexample; the person under pressure welcomes it and folds it in as making their own point stronger, not weaker" },
      { id: 'F16', from: 19, to: 27, hint: "someone concedes the point they've just been given, and then holds their own position with a but" },
      { id: 'F304', from: 23, to: 31, hint: "someone remarks on how the table itself is talking (talking over each other, everyone suddenly whispering, everyone having changed sides) and uses that observation as a move in the argument" },
      { id: 'F11', from: 26, to: 33, hint: "someone answers a direct question briefly and in the same turn hands the identical question to a person who has said little" },
    ],
  },
  sheep: {
    moment: "Hugh has just said his ewes know him by his face from across a field and ignore Will, and Jess has said that's sentimental nonsense. Femi says he half-remembers reading that sheep can recognise faces, maybe even from photos, but can't remember how many or where he read it.",
    ending: "The talk has drifted from sheep onto what that means for something else (people, faces, memory, being recognised) and someone has just started a new thought that the others are poking at when it stops.",
    plan: [
      { id: 'F302', from: 3, to: 8, hint: "Hugh, or whoever is defending the claim, first says plainly that they've no study or proof, it's only what they've seen, and then delivers the claim at full strength" },
      { id: 'F2', from: 5, to: 11, hint: "someone asks a plain question (how many faces, how long, how would you even test it); the person asked answers and then volunteers something unexpected nobody asked for" },
      { id: 'F305', from: 10, to: 17, hint: "someone throws a counterexample at the claim; the claimant welcomes it and folds it in as making the claim stronger" },
      { id: 'F306', from: 15, to: 23, hint: "someone adds a thought and the next speaker takes it up as exactly where they were about to go, then carries it on along the merged line" },
      { id: 'F9', from: 20, to: 28, hint: "before disagreeing, someone offers back an accurate version, in their own words, of what another person just argued, as a check; that person confirms it next turn", followup: "confirm-or-correct" },
      { id: 'F304', from: 25, to: 33, hint: "someone comments on the conversation itself as play (how long they've been on sheep, everyone talking at once, how the argument has flipped) and uses it as a move" },
    ],
  },
  probe: null,
};
// the probe reuses the tickle moment with a compressed 10-turn plan
TOPICS.probe = { ...TOPICS.tickle, plan: [
  { id: 'F302', from: 2, to: 4, hint: TOPICS.tickle.plan[0].hint },
  { id: 'F9', from: 4, to: 7, hint: TOPICS.tickle.plan[1].hint, followup: 'confirm-or-correct' },
  { id: 'F16', from: 7, to: 10, hint: TOPICS.tickle.plan[3].hint },
] };
const T0 = TOPICS[topicKey];
if (!T0) { console.error('unknown topic'); process.exit(2); }
const NAMES = ['Rhi', 'Hugh', 'Jess', 'Femi', 'Danny', 'Sunny'];
const cards = fs.readFileSync(path.join(__dirname, 'personas.md'), 'utf8');
// Cross-sample memory (#980): bits already used on other evenings, so no running gag recurs across samples.
// v3 (#986): real recorded talk as a texture anchor (Tom+Aran, ~/podcast-tom-aran), plus optional
// STYLE_FILE for further corpus excerpts. Texture only: the engine is told never to lift words from it.
const STYLE = [path.join(__dirname, 'style-real-talk.md'), process.env.STYLE_FILE].filter(f => f && fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8').trim()).join('\n\n');
const MOVES = Object.fromEntries(require('../../../services/shared/metagraph/moves.json').moves.map(m => [m.id, m]));
for (const p of T0.plan) if (!MOVES[p.id]) { console.error('move not in moves.json: ' + p.id); process.exit(2); }
const AVOID = process.env.AVOID_FILE ? fs.readFileSync(process.env.AVOID_FILE, 'utf8').trim() : '';

const SYSTEM = `You are the "next turn" engine for a live, unscripted group conversation around a table. You are NOT a writer of a scene; you produce exactly ONE next turn of a conversation already in progress, as it would really happen.

${cards}

WHAT THIS TABLE IS: six bright, curious friends on an ordinary good night in the pub, and tonight something genuinely interesting has come up. They are into it. They know things and half-know things, test each other's claims, bring in what they've read, seen or noticed, push on each other's ideas, and sometimes change their minds. It is still pub talk, not a seminar and not a debate: short turns, teasing, warmth, cut-ins, side remarks. But the content has substance. A good evening here is one where by the end the question has turned into a better question.

THE REGISTER (the whole point of this round):
- Between two failures. NOT a seminar: nobody gives a speech, explains at length, or debates policy. NOT a lads' night: no toilet humour, no daft one-liners for their own sake, no running gags.
- Substance comes in small pieces: one detail someone knows, one question that tests a claim, one example from their own life, one "but then why does...". The table builds the idea together, a few words at a time.
- Facts stated as facts are true. Anything shaky is flagged as half-remembered and gets challenged. Nobody makes up statistics or studies.
- Most good lines get a REPLY, not a laugh. The table takes each other seriously enough to answer. Wit is welcome; it comes from the person and the moment, never from a crafted punchline.

HOW THIS TABLE TALKS:
- SHORT TURNS. Most turns are one sentence, often less: a fragment, a "No, hang on", a question, a jab, a sentence someone else finishes. Two sentences is a normal long turn. Never more than about 35 words: real talk has nothing longer, and a long turn gets interrupted.
- Messy, not polished. False starts, "wait, wait", trailing off, two people answering at once, a question nobody answers, someone restarting a sentence. A line that sounds written is wrong; a line that sounds like an aphorism is wrong.
- Everyone is bright. Nobody is dim or comic relief; nobody has a catchphrase. Don't sprinkle "honestly", "actually", "to be fair", "literally" across everyone.
- A line should be identifiable as its speaker with the name hidden, from what they'd know, notice or tease. The cards describe people, never wording: never echo a card's phrasing in a line.
- Talk moves. Someone's example opens a new angle, someone drags it back, the question shifts. Nobody moderates, nobody plays host, nobody says "great point" or "good question".
- NO VARIETY OF MOVE REPEATS FOR A SPEAKER. Look at everything this speaker has already said tonight; do something of a different kind this time. No example, image or comparison is used twice in the evening.
- Consistent facts: ages, dates and details stay as the cards and the transcript give them.

${STYLE ? 'STRUCTURE OF REAL TALK (copy ONLY its structure: turn length, overlap, abandoned sentences, how the floor passes, drift. These sources are licence-restricted: NEVER reuse, translate or rework any of their words, phrases, situations or subjects):\n' + STYLE + '\n\n' : ''}${AVOID ? 'ALREADY USED ON OTHER EVENINGS AT THIS TABLE (do not reuse any of these bits, stories, figures or phrasings, or close variants):\n' + AVOID + '\n\n' : ''}BANNED (never write these):
- laughter reactions as filler: no "ha", "haha", nobody laughing at a line as a reply;
- anyone misquoting a thinker and being corrected; name-dropping philosophers or academics;
- fetching or offering drinks or food to change the subject; "whose round is it"; last orders; anyone leaving;
- a touching or reconciling moment near the end; a closing punchline; a toast; anyone summing up the evening;
- politics, policy, tax, housing, planning, education policy, NHS policy or current-affairs debate; anyone's job turned into a case study;
- lecture turns: nobody explains how something works in a paragraph or starts "the thing is…" and holds forth;
- toilet humour.

RENDERING OVERLAP IN TEXT:
- "cut_in": if your speaker interrupts the PREVIOUS speaker before they finished, give the exact contiguous words from the previous line after which they get cut off (verbatim from the previous line, a natural point mid-thought). The rest is never heard. Roughly 1 turn in 3: this table talks over each other, especially when someone is getting going.
- "overlap": true if your speaker starts over the last couple of words of the previous line without cutting it. Otherwise false.
- "backchannels": usually EMPTY. At most one turn in four gets one, never more than one. Tiny listener noises from OTHER people during the previous line ("mm", "yeah", "no", "right", "go on", "really?"), each with "after": exact words in the previous line where it lands. NOT laughter.
- A speaker who was cut off may later fight back in or give up on the point. Two people may start at once: then one stops after a word or two.

RULES OF WHO SPEAKS NEXT (you choose, unless the turn instructions name the speaker):
- No two people ping-ponging for more than about 3 turns before someone else joins or cuts in.
- Someone just named, contradicted or asked a question is likely to respond, but not always.
- Quiet people get drawn in, not on a rota. Over the evening everyone speaks, unevenly.
- The same person may speak twice in a row only if they were cut off and are reclaiming, or nobody picked up their question.

GROUP-CONTRIBUTION MOVES: the turn instructions sometimes ask for one of these moves from the metagraph. When asked, perform it for real, in natural words that never name the move, between at least three people who are in on this part of the talk. Set "move" to the move id only when this very turn performs it; otherwise "move" is null.

OUTPUT: only a JSON object, nothing else:
{"speaker": one of ${JSON.stringify(NAMES)}, "line": "the words they say", "cut_in": "exact words from previous line" or null, "overlap": true/false, "backchannels": [{"who": name, "text": "mm", "after": "exact words from previous line"}], "move": "F…" or null}
Plain English speech only: no stage directions, no asterisks, no parentheses, no speaker name inside "line".`;

// transcript as HEARD: each entry {speaker, line, cutOff:boolean, overlap, backchannels:[{who,text,after}], move}
const T = [];

function heardText(e) { return e.cutOff ? e.line + '—' : e.line; }
function transcriptForModel(withNums) {
  return T.map((e, i) => {
    let s = heardText(e);
    for (const b of e.backchannels || []) s = s.replace(b.after, `${b.after} [${b.who}: ${b.text}]`);
    return `${withNums ? (i + 1) + '. ' : ''}${e.overlap ? '[starting over the end] ' : ''}${e.speaker}: ${s}`;
  }).join('\n');
}

function claude(system, prompt) {
  const out = execFileSync(path.join(process.env.HOME, '.local/bin/claude'), [
    '-p', '--model', model, '--system-prompt', system, '--tools', '', '--no-session-persistence',
    '--setting-sources', '', '--strict-mcp-config',
  ], { input: prompt, encoding: 'utf8', maxBuffer: 1 << 20, timeout: 180000 });
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON: ' + out.slice(0, 300));
  return JSON.parse(m[0]);
}
const call = prompt => claude(SYSTEM, prompt);

// Probe lesson (#992): showing the speakers the move NAMES made them say them ("proves nothing", "fair enough,
// but I still"). Speakers see only the id and the test; the names are banned as wording. The judge sees both.
const moveText = id => `${id}. Its test: ${MOVES[id].test}`;
const moveTextJudge = id => `${id} "${MOVES[id].name}". Its test: ${MOVES[id].test}`;
const NAME_BAN = 'Never use any of these stock phrasings in a line, they are labels not speech: ' + T0.plan.map(p => '"' + MOVES[p.id].name + '"').join(', ') + '.';
const planOverview = T0.plan.map(p => `- ${p.role === 'coin' ? 'set-up for ' : ''}${p.id} somewhere around turns ${p.from}-${p.to}`).join('\n') + '\n' + NAME_BAN;
const LAUGH = /\b(ha|haha|hah|heh|lol)\b|laugh|@/i;

const turns = parseInt(turnsArg, 10);
const outKey = process.env.OUT_KEY || topicKey;
const log = [];
const done = new Set();        // plan indices already performed
let pending = null;            // forced follow-up for a two-part move
let coined = null;             // F303: {turn, speaker}
for (let i = 0; i < turns; i++) {
  const n = i + 1;
  const counts = Object.fromEntries(NAMES.map(x => [x, T.filter(e => e.speaker === x).length]));
  const rr = Math.random();
  let band = i === 0 ? 'FIRST LINE: under 15 words, straight into the moment' : rr < 0.4 ? 'SHORT: 1-6 words (a "No, hang on", a question, a jab, a half-start, one fact)' : rr < 0.9 ? 'MEDIUM: 7-22 words, one sentence or two' : 'LONGER: 22-35 words, only if someone is genuinely telling or building something; otherwise MEDIUM';
  // which planned move (if any) is live this turn: earliest open window; forced on its last turn
  let moveAsk = '', forced = null, livePlan = -1;
  if (pending) {
    forced = pending.speaker;
    moveAsk = pending.kind === 'confirm-or-correct'
      ? `\nTHIS TURN: ${pending.speaker} answers the read-back just offered of what they said: they confirm it is right, in their own words, and carry on (the read-back was accurate). Speaker MUST be ${pending.speaker}. "move" is null.`
      : `\nTHIS TURN: ${pending.speaker} takes up the sharper name just handed back for what they were building, ratifies it, and USES it in carrying their point on (adopts it as their own). Speaker MUST be ${pending.speaker}. "move" is null.`;
    band = 'SHORT or MEDIUM';
  } else {
    livePlan = T0.plan.findIndex((p, k) => !done.has(k) && n >= p.from && n <= p.to && (p.role !== 'reuse' || coined));
    if (livePlan >= 0) {
      const p = T0.plan[livePlan];
      const last = n === p.to;
      if (p.role === 'coin') moveAsk = `\n${last ? 'THIS TURN MUST' : 'IF IT FITS THIS TURN NATURALLY,'} set up a later move: ${p.hint}. Keep the phrase short and memorable but not a punchline. Set "move" to "F303-coin" if this turn coins it.`;
      else moveAsk = `\n${last ? 'THIS TURN MUST PERFORM' : 'IF IT FITS THIS TURN NATURALLY, PERFORM (otherwise just keep the talk moving towards it):'} ${moveText(p.id)}. At this table: ${p.hint}.${p.role === 'reuse' ? ` The phrase coined earlier was in turn ${coined.turn}, by ${coined.speaker}: "${T[coined.turn - 1].line}". Whoever redeploys it is NOT ${coined.speaker}.` : ''} Set "move" to "${p.id}" only if this turn performs it.`;
      if (last) band = 'whatever length the move needs, still under 35 words';
    }
  }
  const sinceCut = T.length - 1 - T.map(e => !!e.cutIn).lastIndexOf(true);
  const cutNudge = !forced && T.length >= 3 && sinceCut >= 3 ? '\nNobody has cut anyone off for a few turns and this table talks over each other: unless it would be odd, this speaker cuts the previous one off (set cut_in).' : '';
  const prompt = `THE MOMENT: ${T0.moment}

THIS EVENING'S MOVE PLAN (for your awareness; let the talk grow towards these, never force or name them):
${planOverview}

TRANSCRIPT SO FAR (as heard; "—" at the end of a line = that speaker was cut off there):
${T.length ? transcriptForModel() : '(nothing said yet: the moment has just happened. The FIRST turn is under 15 words and lands right in the middle of it, as if mid-evening, with no scene-setting)'}

Turns so far per person: ${JSON.stringify(counts)}. This is turn ${n} of roughly ${turns}; ${i >= turns - 4 ? 'ENDING SHAPE: ' + T0.ending + ' Do not wrap it up, no punchline.' : 'keep it live and moving.'}
LENGTH FOR THIS TURN: ${band}.${forced ? '' : ' Pick a speaker for whom that length is natural right now.'}${moveAsk}${cutNudge}
Write the single next turn as JSON.`;
  let r, tries = 0;
  while (true) {
    try { r = call(prompt); if (!NAMES.includes(r.speaker) || (forced && r.speaker !== forced)) throw new Error('speaker ' + r.speaker); break; } catch (e) { if (++tries > 2) throw e; }
  }
  const wc = String(r.line).split(/\s+/).filter(Boolean).length;
  if (wc > 35 || (i === 0 && wc > 15)) {
    try { const r2 = call(prompt + '\nYOUR LAST ATTEMPT WAS ' + wc + ' WORDS, FAR TOO LONG. Keep this turn well under 35 words.'); if (NAMES.includes(r2.speaker) && (!forced || r2.speaker === forced)) r = r2; } catch (e) {}
  }
  const prev = T[T.length - 1];
  let cutApplied = false;
  if (r.cut_in && prev && !prev.cutOff && !forced) {
    const idx = prev.line.indexOf(r.cut_in);
    if (idx >= 0 && idx + r.cut_in.length < prev.line.length - 1) {
      prev.full = prev.line;
      prev.line = prev.line.slice(0, idx + r.cut_in.length).replace(/[\s,;.]+$/, '');
      prev.cutOff = true; cutApplied = true;
      prev.backchannels = (prev.backchannels || []).filter(b => prev.line.includes(b.after));
    }
  }
  if (prev && Array.isArray(r.backchannels)) {
    prev.backchannels = (prev.backchannels || []).concat(
      r.backchannels.filter(b => b && NAMES.includes(b.who) && b.who !== prev.speaker && prev.line.includes(b.after) && !LAUGH.test(b.text)).slice(0, 1));
  }
  // move bookkeeping
  let move = null;
  if (livePlan >= 0) {
    const p = T0.plan[livePlan];
    if (p.role === 'coin' && r.move === 'F303-coin') { coined = { turn: n, speaker: r.speaker }; done.add(livePlan); }
    else if (p.role !== 'coin' && r.move === p.id && !(p.role === 'reuse' && r.speaker === coined.speaker)) {
      move = p.id; done.add(livePlan);
      if (p.followup) pending = { kind: p.followup, speaker: null, after: n };
    }
  }
  const entry = { speaker: r.speaker, line: String(r.line).replace(/\s*\[[^\]]*\]/g, '').trim(), cutOff: false, overlap: !!r.overlap && !cutApplied, cutIn: cutApplied, backchannels: [], move };
  T.push(entry);
  // the follow-up goes to the person whose view was read back / named: the most recent other speaker who isn't the mover
  if (pending && pending.after === n) {
    const target = [...T].reverse().slice(1).find(e => e.speaker !== r.speaker);
    pending.speaker = target ? target.speaker : null;
    if (!pending.speaker) pending = null;
  } else if (pending) pending = null;
  log.push({ turn: n, raw: r, cutApplied, planned: livePlan >= 0 ? T0.plan[livePlan].id + (T0.plan[livePlan].role ? '-' + T0.plan[livePlan].role : '') : null });
  process.stderr.write(`${n} ${r.speaker}${cutApplied ? ' [cut-in]' : ''}${move ? ' {' + move + '}' : ''}${r.move === 'F303-coin' ? ' {coin}' : ''}\n`);
}

// ---- move judge: every tag must pass its move's own test, between 3+ people, or it is removed ----
const JUDGE = `You check whether one turn of a recorded group conversation genuinely performs a named conversational move. Be strict: a tag on a turn that does not pass the move's test is a failure. Output only JSON: {"pass": true/false, "reason": "one sentence"}.`;
const judgements = [];
for (let k = 0; k < T.length; k++) {
  const e = T[k];
  if (!e.move) continue;
  const lo = Math.max(0, k - 8), hi = Math.min(T.length, k + 3);
  const ctx = transcriptForModel(true).split('\n').slice(lo, hi).join('\n');
  const extra = e.move === 'F303' ? `\nThe phrase was coined in an earlier turn: ${log.find(l => l.raw.move === 'F303-coin')?.turn}. Full transcript lines involved:\n${transcriptForModel(true)}` : '';
  const q = `MOVE: ${moveTextJudge(e.move)}
GROUP RULE: the move must happen in a part of the talk where at least three people are taking part; a two-person exchange does not count. Where the test needs the other party's response (confirming, ratifying, adopting), that response must actually be there in the following turns.
TRANSCRIPT EXCERPT (numbered turns):
${ctx}${extra}

Does turn ${k + 1} (${e.speaker}) perform ${e.move}?`;
  let v;
  try { v = claude(JUDGE, q); } catch (err) { v = { pass: false, reason: 'judge failed: ' + err.message.slice(0, 100) }; }
  judgements.push({ turn: k + 1, speaker: e.speaker, move: e.move, pass: !!v.pass, reason: v.reason });
  process.stderr.write(`judge ${k + 1} ${e.move} ${v.pass ? 'PASS' : 'FAIL'}: ${v.reason}\n`);
  if (!v.pass) { e.moveRejected = e.move; e.move = null; }
}
const planned = T0.plan.filter(p => p.role !== 'coin').map(p => p.id);
const hit = T.map((e, k) => e.move ? { id: e.move, turn: k + 1 } : null).filter(Boolean);
const unplaced = planned.filter(id => !hit.some(h => h.id === id));

// Render for humans
function render() {
  return T.map(e => {
    let s = heardText(e);
    const seen = new Set();
    for (const b of e.backchannels || []) { if (seen.has(b.after)) continue; seen.add(b.after); s = s.replace(b.after, `${b.after} *[${b.who}: ${b.text}]*`); }
    const lead = e.cutIn ? '—' : '';
    const tag = e.overlap ? ' *[over the end]*' : '';
    const mv = e.move ? ` *{${e.move} ${MOVES[e.move].name}}*` : '';
    return `**${e.speaker}:**${tag}${mv} ${lead}${s}`;
  }).join('\n\n');
}
fs.writeFileSync(path.join(__dirname, `out-${outKey}.json`), JSON.stringify({ topic: T0.moment, model, plan: T0.plan, T, log, judgements, hit, unplaced }, null, 2));
fs.writeFileSync(path.join(__dirname, `out-${outKey}.md`), `*${T0.moment}*\n\n${render()}\n\nMoves hit: ${hit.map(h => h.id + '@' + h.turn).join(', ') || 'none'}. Not placed: ${unplaced.join(', ') || 'none'}.\n`);
console.log('done', topicKey, T.length, 'hit', JSON.stringify(hit), 'unplaced', unplaced.join(','));
