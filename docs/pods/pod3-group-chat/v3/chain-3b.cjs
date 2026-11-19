#!/usr/bin/env node
// Pod 3 text-only live-chain test (#961·AI; v2 cards, topics and rules #980; v3 pub talk, short turns #986).
// One "next turn" call per turn: shared transcript (AS HEARD) + six persona cards in, {speaker, line,
// cut_in, overlap, backchannels} out. Mirrors the live-chain design (/d/bb491252 §9): the previous
// line is fully written before the next is generated, so a cut-in is the player fading that speaker
// at a word — in text, the previous line is truncated at that point and ends with an em dash.
// Usage: node chain.cjs <topicKey> <turns> <model>
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , topicKey, turnsArg = '30', model = 'opus'] = process.argv;
// v3 (#986): Tom on round 2, "No one talks about this in a pub". Each topic is a pub-talk moment with
// energy already in it (a story, a hot take, a daft hypothetical), never a seminar question; the talk
// may wander off it the way pub talk does. Each keeps its own ending shape so no two samples close alike.
const TOPICS = {
  // v3b (#986 after #988): layer 3, "how to contribute to a group conversation". Questions a pub table
  // has genuinely been chewing on, rooted in something that just happened: elevated and interesting,
  // not a seminar, not a lads' holiday. The argument has to MOVE.
  tellher: {
    moment: "Rhi has just told the table that on Saturday she saw Gwen Price's husband Gareth having a very cosy dinner in a hotel in Ludlow with a woman who is not Gwen. Gwen is a customer and a friend of hers. Rhi hasn't said anything to anyone yet, and she's asking the table what she should do.",
    ending: "It does not resolve: the table is still split, and the last turn is a live point nobody has answered yet.",
  },
  eulogy: {
    moment: "Hugh has been asked by the widow to give the eulogy on Friday for Clive Morgan, who farmed next door to him for forty years and was, by common agreement in town, a difficult, mean-spirited man who once moved a boundary fence by six feet. Hugh has just said to the table: 'I don't know what I'm meant to say about him.'",
    ending: "Near the end someone concedes a point grudgingly, and the talk moves on with it left hanging; no touching moment, no reconciliation.",
  },
  knowday: {
    moment: "Femi's seven-year-old asked him at bedtime whether he'd want to know the exact day he was going to die, and Femi said yes without thinking. He's just told the table, and Sunny has said, flatly: 'No you wouldn't.'",
    ending: "In the last few turns the talk drifts onto a tangent one remark opened (not food, drinks or going home) and it is on that tangent when it stops.",
  },
  lisbon: {
    moment: "Danny got back last night from a long weekend in Lisbon with Kasia. The airline lost his suitcase on the way out, he spent four days in clothes from the airport shop and a market stall, and he's wearing one of the shirts now. Jess has just noticed it.",
    ending: "In the last few turns the talk has drifted onto a tangent that one remark opened (not food, not drinks, not going home) and it is simply on that tangent when it stops.",
  },
  lastpage: {
    moment: "Rhi has just said, casually, that she always reads the last page of a book first, and of a box set she watches the final episode first, so she knows whether it's worth it. Jess has put her glass down.",
    ending: "It does not resolve: the last turns are still the table split and teasing, with someone mid-defence of something indefensible.",
  },
  zombie: {
    moment: "At breakfast Femi's seven-year-old asked him which of his pub friends would survive longest in a zombie apocalypse. Femi has just admitted to the table that he said Hugh would last longest and Danny would go first.",
    ending: "Near the end someone starts a new story that the conversation has sparked, and it is still going, mid-flow, when it stops.",
  },
};
const T0 = TOPICS[topicKey];
if (!T0) { console.error('unknown topic'); process.exit(2); }
const TOPIC = T0.moment;
const NAMES = ['Rhi', 'Hugh', 'Jess', 'Femi', 'Danny', 'Sunny'];
const cards = fs.readFileSync(path.join(__dirname, 'personas.md'), 'utf8');
// Cross-sample memory (#980): bits already used on other evenings, so no running gag recurs across samples.
// v3 (#986): real recorded talk as a texture anchor (Tom+Aran, ~/podcast-tom-aran), plus optional
// STYLE_FILE for further corpus excerpts. Texture only: the engine is told never to lift words from it.
const STYLE = [path.join(__dirname, 'style-real-talk.md'), process.env.STYLE_FILE].filter(f => f && fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8').trim()).join('\n\n');
// Layer-3 moves (#988, /d/108cdbeb; IDs are the shape metagraph's own, services/shared/metagraph/moves.json).
const MOVES = {
  F9: "Let me check I've got it: before disagreeing, someone states another person's position back as a candidate, and that person confirms or corrects it.",
  F301: "So what you're saying is: someone hands back a sharper compression or a name for what another just built; the original speaker accepts it and uses it.",
  F305: "Absorb and build: someone pushed back on gets the counterexample and folds it in, making their own point stronger rather than defending the old version.",
  F16: "Fair enough, but I still: concede the point the other person earned, then hold your own position with a 'but'.",
  F2: "Do it and throw something in: answer the question you were asked, then add something nobody asked for and nobody expected.",
  F303: "The shared line: a phrase coined earlier tonight gets redeployed later by SOMEONE ELSE as shorthand, a tease or an argument; it now belongs to the table.",
  F304: "Comment on the medium: someone remarks on the conversation's own machinery (everyone talking over each other, the volume, who's been quiet, the hour) as play, and it gets used.",
  F306: "Exactly where I'm about to go: someone's contribution is taken by the next speaker as the move they were already about to make; the floor merges rather than passes.",
  F11: "And you?: someone answers, then hands the floor to someone who hasn't said much, with a real question, by name.",
  F302: "It proves nothing, accept it anyway: say what you can't know or prove, then say what you still think, at full strength.",
};
const USE_MOVES = TOPICS[topicKey] && ['tellher', 'eulogy', 'knowday'].includes(topicKey);
const AVOID = process.env.AVOID_FILE ? fs.readFileSync(process.env.AVOID_FILE, 'utf8').trim() : '';

const SYSTEM = `You are the "next turn" engine for a live, unscripted group conversation around a table. You are NOT a writer of a scene; you produce exactly ONE next turn of a conversation already in progress, as it would really happen.

${cards}

${USE_MOVES ? 'TONIGHT: the table is chewing on a real question that came out of something that just happened. It is a pub table that has been thinking: the sentences are good, the thinking is interesting and the argument MOVES (positions shift, the question itself turns into a better question), but it is never a seminar, never policy, and never a lads\' holiday (no toilet, sex or drunk humour). Wit and teasing stay; the talk is about the question and the people, and it may wander and come back.\n\nTHE CONVERSATIONAL MOVES this table uses (each is a test; tag a turn with a move ID ONLY if it genuinely passes the test):\n' + Object.entries(MOVES).map(([k, v]) => k + ' — ' + v).join('\n') + '\nMoves happen between three or more people. They must sound like pub speech, never like a textbook example: nobody says "so what you\'re saying is" or "fair enough, but" every time; find the natural way this person would do it.\n\n' : ''}WHAT THIS TABLE IS: six quick, funny, articulate friends on an ordinary good night in the pub. They are NOT debating anything. This is real pub talk: someone telling what just happened to them while the others pick holes in it, strong opinions about everyday nonsense, daft hypotheticals taken far too seriously, films and telly, mild gossip about people in town, and a lot of teasing. Their intelligence shows in wit, timing, comebacks and how they tell a story, never in arguments about society.

HOW THIS TABLE TALKS (follow this, it is the whole job):
- SHORT TURNS. Most turns are one sentence, often less: a fragment, a "No!", a laugh, "Go on", a question, a jab, a sentence someone else finishes. Two sentences is a normal long turn. Over about 40 words only when someone is genuinely telling a story, and a story gets interrupted, questioned and heckled as it goes.
- Messy, not polished. Real speech: false starts, "wait, wait", trailing off, two people answering at once, someone repeating the punchline of a story wrongly, a question that nobody answers. Lines should NOT be well-turned aphorisms; a line that sounds written is wrong. Laughs come from the situation and the people, not from crafted jokes.
- Everyone is bright. Nobody is dim, malapropistic or comic relief; nobody gets facts wrong for laughs; nobody has a catchphrase or pet phrase. Don't sprinkle "honestly", "actually", "to be fair", "literally" across everyone.
- A line should be identifiable as its speaker with the name hidden, from what they'd notice, what they'd tease, where they're from. The cards describe people, never wording: never echo a card's phrasing in a line.
- Talk wanders. A story sparks another story, a hot take sparks a tangent, someone drags it back. Gossip about people in town (invented, mild, named by first name) is fine.
- React to what was JUST said. Take the bait, pile on, defend yourself, change sides for fun. Nobody moderates, nobody plays host, nobody says "great point".
- NO VARIETY OF MOVE REPEATS FOR A SPEAKER. Before writing, look at everything this speaker has already said tonight. Do something of a different kind from each of their previous turns (if they've already teased X, they don't tease X again; if they've told a story, they don't start another one; if they've done a one-word reaction, the next is something else). No story, image, joke or comparison is used twice in the evening.
- Consistent facts: ages, dates and details stay as the cards and the earlier transcript give them. Nobody contradicts a fact already stated.

${STYLE ? 'WHAT REAL SPEECH SOUNDS LIKE (texture reference; your lines must sound this unrehearsed, but never reuse its words, phrases or subject):\n' + STYLE + '\n\n' : ''}${AVOID ? 'ALREADY USED ON OTHER EVENINGS AT THIS TABLE (do not reuse any of these bits, stories, figures or phrasings, or close variants):\n' + AVOID + '\n\n' : ''}BANNED SET PIECES (never write these):
- anyone misquoting or misattributing a thinker, writer or study and being corrected; name-dropping philosophers or academics at all;
- anyone fetching, refilling or offering drinks or food to change the subject; "whose round is it"; last orders; anyone leaving;
- a touching, sentimental or reconciling moment near the end; a closing punchline; a toast; anyone summing up what the evening has shown;
- any politics, policy, tax, housing, planning, education, NHS or current-affairs debate; anyone's job turned into a case study;
- lecture or explanation turns: nobody explains how something works, gives background, or makes a point with "the thing is…" followed by a paragraph.

RENDERING OVERLAP IN TEXT (the live system can fade a speaker at a word boundary, or start the next speaker early over the tail):
- "cut_in": if your speaker interrupts the PREVIOUS speaker before they finished, give the exact contiguous words from the previous line after which they get cut off (must appear verbatim in the previous line; choose a natural point mid-thought). The previous speaker's remaining words are never heard. Use this when the character would genuinely jump in (impatience, objection, excitement, a joke) — roughly 1 turn in 3 overall: this table talks over each other all the time, especially when someone is telling a story or defending themselves.
- "overlap": true if your speaker starts over the last couple of words of the previous line without cutting it (eager agreement, a quick reaction). Otherwise false.
- "backchannels": usually an EMPTY list. Only about one turn in three gets one, and never more than one. Laughter ("ha") only when something is actually funny. Otherwise: tiny listener noises from OTHER people heard DURING the previous line ("mm", "yeah", "ha", "oh God", "no way"), each with "after": exact words in the previous line where it lands.
- A speaker who was cut off may later fight back in ("—no, let me finish") or give up on the point. Two people may start at once: then one stops after a word or two ("I just—" / "Go on.").

RULES OF WHO SPEAKS NEXT (you choose):
- No two people ping-ponging for more than about 3 turns before someone else joins or cuts in.
- Someone just named, teased, contradicted or asked a question is likely to respond — but not always.
- Quiet people get drawn in, but not on a rota. Over a whole conversation everyone speaks, unevenly.
- The same person may speak twice in a row only if they were cut off and are reclaiming, or nobody picked up their question.

OUTPUT: only a JSON object, nothing else:
{"speaker": one of ${JSON.stringify(NAMES)}, "line": "the words they say",${USE_MOVES ? ' "move": a move ID from the list if this turn genuinely passes that test, else null,' : ''} "cut_in": "exact words from previous line" or null, "overlap": true/false, "backchannels": [{"who": name, "text": "mm", "after": "exact words from previous line"}]}
Plain English speech only: no stage directions, no asterisks, no parentheses, no speaker name inside "line".`;

// transcript as HEARD: each entry {speaker, line, cutOff:boolean, overlap, backchannels:[{who,text,after}]}
const T = [];

function heardText(e) { return e.cutOff ? e.line + '—' : e.line; }
function transcriptForModel() {
  return T.map(e => {
    let s = heardText(e);
    for (const b of e.backchannels || []) s = s.replace(b.after, `${b.after} [${b.who}: ${b.text}]`);
    return `${e.overlap ? '[starting over the end] ' : ''}${e.speaker}: ${s}`;
  }).join('\n');
}

function call(prompt) {
  const out = execFileSync(path.join(process.env.HOME, '.local/bin/claude'), [
    '-p', '--model', model, '--system-prompt', SYSTEM, '--tools', '', '--no-session-persistence',
    '--setting-sources', '', '--strict-mcp-config',
  ], { input: prompt, encoding: 'utf8', maxBuffer: 1 << 20, timeout: 180000 });
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON: ' + out.slice(0, 300));
  return JSON.parse(m[0]);
}

const turns = parseInt(turnsArg, 10);
const outKey = process.env.OUT_KEY || topicKey;
const log = [];
for (let i = 0; i < turns; i++) {
  const counts = Object.fromEntries(NAMES.map(n => [n, T.filter(e => e.speaker === n).length]));
  const rr = Math.random();
  const band = i === 0 ? 'FIRST LINE: under 15 words, straight into the moment' : rr < 0.45 ? 'SHORT: 1-6 words (a laugh, "No!", "Go on", a jab, a question, a half-start)' : rr < 0.88 ? 'MEDIUM: 7-25 words, one sentence or two' : 'STORY: 25-45 words, only if someone is genuinely telling a story; otherwise MEDIUM';
  // Cut-in pressure (#980 probe: 10 turns came out with no cut-ins at all, too courteous for a hot argument).
  const sinceCut = T.length - 1 - T.map(e => !!e.cutIn).lastIndexOf(true);
  const cutNudge = T.length >= 3 && sinceCut >= 3 ? '\nNobody has cut anyone off for a few turns and this table talks over each other: unless it would be odd, this speaker cuts the previous one off (set cut_in).' : '';
  let moveNudge = '';
  if (USE_MOVES) {
    const placed = T.map((e, k) => e.move ? e.move + '@' + (k + 1) : null).filter(Boolean);
    const unplaced = Object.keys(MOVES).filter(m => !T.some(e => e.move === m));
    moveNudge = '\nMoves placed so far: ' + (placed.join(', ') || 'none') + '. Not yet placed: ' + unplaced.join(', ') + '.' +
      (i >= 4 && i < turns - 3 && unplaced.length && Math.random() < 0.45 ? ' If it fits naturally right now, make this turn one of the unplaced moves (' + unplaced.slice(0, 4).join(', ') + ').' : '');
  }
  const prompt = `THE MOMENT: ${TOPIC}

TRANSCRIPT SO FAR (as heard; "—" at the end of a line = that speaker was cut off there):
${T.length ? transcriptForModel() : '(nothing said yet: the moment has just happened. The FIRST turn is under 15 words and lands right in the middle of it, as if mid-evening, with no scene-setting)'}

Turns so far per person: ${JSON.stringify(counts)}. This is turn ${i + 1} of roughly ${turns}; ${i >= turns - 4 ? 'ENDING SHAPE: ' + T0.ending + ' Do not wrap it up.' : 'keep it live; the talk may wander off the opening moment.'}
LENGTH FOR THIS TURN: ${band}. Pick a speaker for whom that length is natural right now.${cutNudge}${moveNudge}
Write the single next turn as JSON.`;
  let r, tries = 0;
  while (true) {
    try { r = call(prompt); break; } catch (e) { if (++tries > 2) throw e; }
  }
  if (!NAMES.includes(r.speaker)) { i--; continue; }
  // v3 (#986): hard length cap. Over 50 words (or a first line over 15) is regenerated once.
  const wc = String(r.line).split(/\s+/).filter(Boolean).length;
  if ((wc > 50 || (i === 0 && wc > 15)) && !r._retried) {
    try { const r2 = call(prompt + '\nYOUR LAST ATTEMPT WAS ' + wc + ' WORDS, FAR TOO LONG. Keep this turn short.'); if (NAMES.includes(r2.speaker)) r = r2; } catch (e) {}
  }
  const prev = T[T.length - 1];
  let cutApplied = false;
  if (r.cut_in && prev && !prev.cutOff) {
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
      r.backchannels.filter(b => b && NAMES.includes(b.who) && b.who !== prev.speaker && prev.line.includes(b.after)).slice(0, 2));
  }
  T.push({ speaker: r.speaker, line: String(r.line).replace(/\s*\[[^\]]*\]/g, '').trim(), cutOff: false, overlap: !!r.overlap && !cutApplied, cutIn: cutApplied, backchannels: [], move: USE_MOVES && r.move && MOVES[r.move] ? r.move : null });
  log.push({ turn: i + 1, raw: r, cutApplied });
  process.stderr.write(`${i + 1} ${r.speaker}${cutApplied ? ' [cut-in]' : ''}\n`);
}

// Render for humans
function render() {
  return T.map(e => {
    let s = heardText(e);
    const seen = new Set();
    for (const b of e.backchannels || []) { if (seen.has(b.after)) continue; seen.add(b.after); s = s.replace(b.after, `${b.after} *[${b.who}: ${b.text}]*`); }
    const lead = e.cutIn ? '—' : '';
    const tag = e.overlap ? ' *[over the end]*' : '';
    return `**${e.speaker}:**${tag} ${lead}${s}`;
  }).join('\n\n');
}
fs.writeFileSync(path.join(__dirname, `out-${outKey}.json`), JSON.stringify({ topic: TOPIC, model, T, log }, null, 2));
fs.writeFileSync(path.join(__dirname, `out-${outKey}.md`), `*${TOPIC}*\n\n${render()}\n`);
console.log('done', topicKey, T.length);
