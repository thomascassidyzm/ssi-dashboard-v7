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
// v5 (#992, round 5): Tom on round 3, "Zombie is a lot better ... I think the topic is still a bit obvious
// and perhaps overdone". Keep zombie's energy (banter, wander, gossip) but no stock pub topics: each moment
// is specific, grows out of one of these people's lives, has just happened, and has a surprising angle a
// bright person at the table can bring. Moves at a realistic density: four per evening, spread out.
const TOPICS = {
  hamster: {
    moment: "Over half-term the hamster in Femi's daughter's class died, and the school quietly bought an identical one. His daughter worked it out because the new one bites. At tea tonight she asked him whether he'd do the same if she died. He has just told the table.",
    ending: "Near the end someone starts a new story the talk has sparked, and it is still going, mid-flow, when it stops.",
    plan: [
      { id: 'F2', from: 5, to: 9, hint: "someone asks Femi a plain question about the hamster, the school or his daughter; he answers and throws in a detail nobody asked for" },
      { id: 'F303', role: 'coin', from: 8, to: 13, hint: "someone coins a short phrase for what the school did, which the others could pick up" },
      { id: 'F16', from: 15, to: 20, hint: "someone grants the point just made against them, then holds their own view with a but" },
      { id: 'F11', from: 21, to: 25, hint: "someone answers a direct question briefly and in the same turn hands the identical question on, minimally, by name, to someone quiet" },
      { id: 'F303', role: 'reuse', from: 27, to: 32, hint: "someone other than the coiner reuses the phrase coined earlier, as a tease or as shorthand" },
    ],
  },
  kettle: {
    moment: "Jess's landlord has finally put a smart meter in her damp flat, and the app shows her electricity minute by minute. She has just told the table she can see the exact minute Matt gets up in the night to make toast, and that she's started checking it at work.",
    ending: "In the last few turns the talk has drifted onto a tangent one remark opened (not food, drinks or going home) and it is simply on that tangent when it stops.",
    plan: [
      { id: 'F302', from: 5, to: 9, hint: "someone who half-knows something surprising about electricity, the grid or what meters reveal first says plainly they can't swear to it, then says it at full strength" },
      { id: 'F9', from: 13, to: 17, hint: "before pushing back, someone offers back an accurate version of what another person just claimed, in their own words, as a check; that person confirms it next turn", followup: 'confirm-or-correct' },
      { id: 'F305', from: 20, to: 24, hint: "someone pushes back with a counterexample; the person under pressure welcomes it and folds it in as making their own point stronger" },
      { id: 'F304', from: 27, to: 31, hint: "someone remarks on the table itself as play (everyone suddenly checking their own phones, everyone confessing at once, how fast they've all turned on Matt) and uses it as a move" },
    ],
  },
  wallpaper: {
    moment: "Rhi stripped wallpaper in a front room on Broad Street today and found a note pencilled on the plaster by the man who papered it in 1962: his name, the date, the score of a Cardiff City match, and the words 'whoever reads this, I hope you're happier than me'. She's photographed it and is passing her phone round.",
    ending: "It does not resolve: the last turns are still split on what Rhi should do with the wall, someone mid-defence of their idea, when it stops.",
    plan: [
      { id: 'F306', from: 6, to: 10, hint: "someone adds a thought and the next speaker takes it up as exactly where they were about to go, then carries it on along the merged line" },
      { id: 'F301', from: 14, to: 18, hint: "after someone has been building a view for a few turns, a listener hands it back compressed into a sharper name; the person who built it ratifies it and uses that name next turn", followup: 'ratify-and-adopt' },
      { id: 'F11', from: 21, to: 25, hint: "someone answers a direct question briefly and in the same turn hands the identical question on, minimally, by name, to someone quiet" },
      { id: 'F16', from: 28, to: 32, hint: "someone grants the point just made against them, then holds their own view with a but" },
    ],
  },
  probe: null,
};
// the probe reuses the hamster moment with a compressed 10-turn plan
TOPICS.probe = { ...TOPICS.hamster, plan: [
  { id: 'F2', from: 3, to: 5, hint: TOPICS.hamster.plan[0].hint },
  { id: 'F16', from: 7, to: 10, hint: TOPICS.hamster.plan[2].hint },
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

WHAT THIS TABLE IS: six quick, funny, bright friends on an ordinary good night in the pub. Real pub talk: someone telling what just happened while the others pick holes in it, teasing, mild gossip about people in town, a story sparking another story. Tonight's moment is specific and a bit odd, and somebody at the table always has a surprising angle on it from their own life or what they know: a fact from the farm, the surgery, the classroom, a book. That angle is said in a sentence, fought over, teased, and taken somewhere. Not a seminar, not a debate, not a lads' night.

THE REGISTER:
- The energy of friends winding each other up, with something worth chewing on underneath. Substance comes in small pieces: one detail someone knows, one question that tests a claim, one example from their own life.
- Facts stated as facts are true. Anything shaky is flagged as half-remembered and gets challenged. Nobody invents statistics or studies.
- Most good lines get a REPLY, not a laugh. Wit comes from the person and the moment, never from a crafted punchline.

HOW THIS TABLE TALKS:
- SHORT TURNS. Most turns are one sentence, often less: a fragment, a "No, hang on", a question, a jab, a sentence someone else finishes. Two sentences is a normal long turn. Never more than about 35 words: real talk has nothing longer, and a long turn gets interrupted.
- Messy, not polished. Real talk is full of "yeah", "right", "mm", "no", "go on" as whole turns; false starts ("I— no, the other one"); people saying the same thing twice; trailing off; abandoning a sentence and starting another; a question nobody answers; two people saying the same word at once. A line that sounds written, quotable, balanced or neatly turned is WRONG. No line ends on a twist. No lists of three.
- The physical scene breaks in. Glasses, crisps, plates, the bar, the barman, a phone, the dog under the table, someone's coat, the fire, the door. Every so often a turn is about that ("mind your glass", "is that mine?", "pass us those") and then the talk carries on. It never changes the subject for good.
- Everyone is bright. Nobody is dim or comic relief; nobody has a catchphrase. Don't sprinkle "honestly", "actually", "to be fair", "literally" across everyone.
- A line should be identifiable as its speaker with the name hidden, from what they'd know, notice or tease. The cards describe people, never wording: never echo a card's phrasing in a line.
- Talk moves. Someone's example opens a new angle, someone drags it back, the question shifts. Nobody moderates, nobody plays host, nobody says "great point" or "good question".
- NO VARIETY OF MOVE REPEATS FOR A SPEAKER. Look at everything this speaker has already said tonight; do something of a different kind this time. No example, image or comparison is used twice in the evening.
- Consistent facts: ages, dates and details stay as the cards and the transcript give them.

${STYLE ? 'STRUCTURE OF REAL TALK (copy ONLY its structure: turn length, overlap, abandoned sentences, how the floor passes, drift. These sources are licence-restricted: NEVER reuse, translate or rework any of their words, phrases, situations or subjects):\n' + STYLE + '\n\n' : ''}${AVOID ? 'ALREADY USED ON OTHER EVENINGS AT THIS TABLE (do not reuse any of these bits, stories, figures or phrasings, or close variants):\n' + AVOID + '\n\n' : ''}BANNED (never write these):
- laughter reactions as filler: no "ha", "haha", nobody laughing at a line as a reply;
- anyone misquoting a thinker and being corrected; name-dropping philosophers or academics;
- side business used to change the subject for good; "whose round is it"; last orders; anyone leaving;
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

GROUP-CONTRIBUTION MOVES: these are rare at a real table. Only a handful happen in an evening, spaced out. The turn instructions sometimes ask for one of these moves from the metagraph. When asked, perform it for real, in natural words that never name the move, between at least three people who are in on this part of the talk. Set "move" to the move id only when this very turn performs it; otherwise "move" is null.

OUTPUT: only a JSON object, nothing else:
{"speaker": one of ${JSON.stringify(NAMES)}, "line": "the words they say", "cut_in": "exact words from previous line" or null, "overlap": true/false, "backchannels": [{"who": name, "text": "mm", "after": "exact words from previous line"}], "move": "F…" or null, "event": a very short stage direction for something physical that happens just before this line (e.g. "Hugh's pint goes over", "the barman drops a tray") or null, "move_target": for a move that reads back, names or builds on ANOTHER person's view, that person's name, else null}
Plain English speech only in "line": no stage directions, no asterisks, no parentheses, no speaker name inside "line".`;

// transcript as HEARD: each entry {speaker, line, cutOff:boolean, overlap, backchannels:[{who,text,after}], move}
const T = [];

function heardText(e) { return e.cutOff ? e.line + '—' : e.line; }
function transcriptForModel(withNums) {
  return T.map((e, i) => {
    let s = heardText(e);
    for (const b of e.backchannels || []) s = s.replace(b.after, `${b.after} [${b.who}: ${b.text}]`);
    return `${e.event ? '[' + e.event + '] ' : ''}${withNums ? (i + 1) + '. ' : ''}${e.overlap ? '[starting over the end] ' : ''}${e.speaker}: ${s}`;
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
  let band = i === 0 ? 'FIRST LINE: under 15 words, straight into the moment' : rr < 0.5 ? 'SHORT: 1-6 words (a "yeah", a "no, hang on", a question, a jab, a half-start, a one-word reaction)' : rr < 0.9 ? 'MEDIUM: 7-22 words, one sentence or two' : 'LONGER: 22-35 words, only if someone is genuinely telling or building something; otherwise MEDIUM';
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
  const cutNudge = !forced && !(T.length && T[T.length - 1].move) && T.length >= 3 && sinceCut >= 3 ? '\nNobody has cut anyone off for a few turns and this table talks over each other: unless it would be odd, this speaker cuts the previous one off (set cut_in).' : '';
  // v5: loosen tidy lines and let the room in (Tom: "loosen the tidy lines"; the corpus: side business breaks in)
  const lastEvent = T.map(e => !!e.event).lastIndexOf(true);
  const eventsSoFar = T.filter(e => e.event).length;
  const messNudge = !forced && i > 0 && Math.random() < 0.3 ? '\nTHIS TURN IS UNPOLISHED: a restart, a stall, a self-correction, two goes at the same word, or trailing off. Nothing neat.' : '';
  const eventNudge = !forced && i >= 4 && i < turns - 2 && i - lastEvent >= 6 && eventsSoFar < 5 && Math.random() < 0.4 ? '\nSOMETHING PHYSICAL HAPPENS just before this turn (set "event"); this line reacts to it briefly, then the talk carries on next turn.' : '';
  const prompt = `THE MOMENT: ${T0.moment}

THIS EVENING'S MOVE PLAN (for your awareness; let the talk grow towards these, never force or name them):
${planOverview}

TRANSCRIPT SO FAR (as heard; "—" at the end of a line = that speaker was cut off there):
${T.length ? transcriptForModel() : '(nothing said yet: the moment has just happened. The FIRST turn is under 15 words and lands right in the middle of it, as if mid-evening, with no scene-setting)'}

Turns so far per person: ${JSON.stringify(counts)}. This is turn ${n} of roughly ${turns}; ${i >= turns - 4 ? 'ENDING SHAPE: ' + T0.ending + ' Do not wrap it up, no punchline.' : 'keep it live and moving.'}
LENGTH FOR THIS TURN: ${band}.${forced ? '' : ' Pick a speaker for whom that length is natural right now.'}${moveAsk}${cutNudge}${messNudge}${eventNudge}
Write the single next turn as JSON.`;
  let r, tries = 0;
  while (true) {
    try { r = call(prompt); if (!NAMES.includes(r.speaker) || (forced && r.speaker !== forced)) throw new Error('speaker ' + r.speaker); break; } catch (e) { if (++tries > 2) throw e; }
  }
  const wc = String(r.line).split(/\s+/).filter(Boolean).length;
  const tooLong = wc > 35 || (i === 0 && wc > 15) || (band.startsWith('SHORT:') && wc > 10);
  if (tooLong) {
    try { const r2 = call(prompt + '\nYOUR LAST ATTEMPT WAS ' + wc + ' WORDS, FAR TOO LONG. ' + (band.startsWith('SHORT:') ? 'This turn is 1-6 words.' : 'Keep this turn well under 35 words.')); if (NAMES.includes(r2.speaker) && (!forced || r2.speaker === forced)) r = r2; } catch (e) {}
  }
  const prev = T[T.length - 1];
  let cutApplied = false;
  // round 5 probe: an F16 was cut off before its "but", so it failed its test. A turn carrying a move is never cut.
  if (r.cut_in && prev && !prev.cutOff && !forced && !prev.move) {
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
  const ev = typeof r.event === 'string' && r.event.trim() && (i - lastEvent >= 4) && eventsSoFar < 5 ? r.event.trim().replace(/[.]$/, '') : null;
  const entry = { event: ev, speaker: r.speaker, line: String(r.line).replace(/\s*\[[^\]]*\]/g, '').trim(), cutOff: false, overlap: !!r.overlap && !cutApplied, cutIn: cutApplied, backchannels: [], move };
  T.push(entry);
  // the follow-up goes to the person whose view was read back / named: the most recent other speaker who isn't the mover
  // tickle take 1 lesson (#992): the follow-up went to the last other speaker, not the person whose view was
  // read back, so F9 failed its own test. The speaker model now names the move's target.
  if (pending && pending.after === n) {
    const target = NAMES.includes(r.move_target) && r.move_target !== r.speaker ? { speaker: r.move_target } : [...T].reverse().slice(1).find(e => e.speaker !== r.speaker);
    pending.speaker = target ? target.speaker : null;
    if (!pending.speaker) pending = null;
  } else if (pending) pending = null;
  log.push({ turn: n, raw: r, cutApplied, planned: livePlan >= 0 ? T0.plan[livePlan].id + (T0.plan[livePlan].role ? '-' + T0.plan[livePlan].role : '') : null });
  process.stderr.write(`${n} ${r.speaker}${cutApplied ? ' [cut-in]' : ''}${move ? ' {' + move + '}' : ''}${r.move === 'F303-coin' ? ' {coin}' : ''}\n`);
}

// ---- move judge: every tag must pass its move's own test, between 3+ people, or it is removed ----
// Group readings from #988's layer-3 doc (/d/108cdbeb): how each two-party test reads at a table of six.
const GROUP = {
  F9: 'before disagreeing, state another person\'s position back to them and let them confirm it',
  F301: 'a listener sharpens the table\'s argument into a name, and the person who built it uses that name',
  F305: 'someone pushed back on makes the argument stronger rather than defending the old one',
  F16: 'give the other side the point they earned, then stay where you were',
  F2: 'answer the question put to you, then add the thing nobody asked for',
  F303: 'a phrase coined early is reused later by the table, so it belongs to all of them',
  F304: 'someone notices how the table is talking and says so, and the table uses it',
  F306: 'the contribution makes the next speaker feel they were already going there; the floor merges',
  F11: 'answer, then hand the same question on, minimally, to the asker or to someone at the table by name',
  F302: 'say what you do not know, then say what you still think, at full strength',
};
const JUDGE = `You check whether one turn of a recorded group conversation genuinely performs a named conversational move. Be strict: a tag on a turn that does not pass the move's test is a failure. Output only JSON: {"pass": true/false, "reason": "one sentence"}.`;
const judgements = [];
for (let k = 0; k < T.length; k++) {
  const e = T[k];
  if (!e.move) continue;
  const lo = Math.max(0, k - 8), hi = Math.min(T.length, k + 3);
  const ctx = transcriptForModel(true).split('\n').slice(lo, hi).join('\n');
  const extra = e.move === 'F303' ? `\nThe phrase was coined in an earlier turn: ${log.find(l => l.raw.move === 'F303-coin')?.turn}. Full transcript lines involved:\n${transcriptForModel(true)}` : '';
  const q = `MOVE: ${moveTextJudge(e.move)}
GROUP READING (the agreed form of this move at a table of several people): ${GROUP[e.move]}.
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
    return `${e.event ? '*[' + e.event + ']*\n\n' : ''}**${e.speaker}:**${tag}${mv} ${lead}${s}`;
  }).join('\n\n');
}
fs.writeFileSync(path.join(__dirname, `out-${outKey}.json`), JSON.stringify({ topic: T0.moment, model, plan: T0.plan, T, log, judgements, hit, unplaced }, null, 2));
fs.writeFileSync(path.join(__dirname, `out-${outKey}.md`), `*${T0.moment}*\n\n${render()}\n\nMoves hit: ${hit.map(h => h.id + '@' + h.turn).join(', ') || 'none'}. Not placed: ${unplaced.join(', ') || 'none'}.\n`);
console.log('done', topicKey, T.length, 'hit', JSON.stringify(hit), 'unplaced', unplaced.join(','));
