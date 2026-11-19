#!/usr/bin/env node
// Pod 3 text-only live-chain test (#961·AI; v2 cards, topics and rules #980).
// One "next turn" call per turn: shared transcript (AS HEARD) + six persona cards in, {speaker, line,
// cut_in, overlap, backchannels} out. Mirrors the live-chain design (/d/bb491252 §9): the previous
// line is fully written before the next is generated, so a cut-in is the player fading that speaker
// at a word — in text, the previous line is truncated at that point and ends with an em dash.
// Usage: node chain.cjs <topicKey> <turns> <model>
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , topicKey, turnsArg = '30', model = 'opus'] = process.argv;
// v2 (#980): substantive topics with real stakes for the people at the table, and a distinct
// ending shape per topic so no two samples close the same way.
const TOPICS = {
  inherit: {
    moment: "Hugh has just told the table that under the new rules on farms, when he dies his son Will is looking at an inheritance-tax bill that means selling about a third of the land. Jess said, before she could stop herself: 'Good.' Question on the table: should inheritance be taxed heavily, farms and family homes included?",
    ending: "This conversation does not resolve. It stops mid-argument: the last turns are still live disagreement, someone has just made a point that has not been answered.",
  },
  estate: {
    moment: "A planning inspector has just overruled the council and the town's consultation (two thirds against) and approved 300 homes on the water meadow below the bridge. Femi's team at the Environment Agency did not object, and someone has just said so, pointedly. Question on the table: when the experts and the town disagree about something like this, who should win?",
    ending: "Near the end, someone concedes a point grudgingly and with bad grace, and the talk does not tie it up: it moves on with the concession left hanging.",
  },
  degree: {
    moment: "Rhi's son Cai has two offers for September: history at Bristol, which means about £55k of debt, or a paid degree apprenticeship in engineering at an aerospace firm in Filton. He wants the history; Rhi has just said she's told him it's his choice, and then said, 'But I know what I think.' Question on the table: is university still worth it?",
    ending: "In the last few turns the talk drifts sideways onto a tangent that one remark has opened (not food, not drinks, not going home) and the conversation is simply on that tangent when it stops.",
  },
};
const T0 = TOPICS[topicKey];
if (!T0) { console.error('unknown topic'); process.exit(2); }
const TOPIC = T0.moment;
const NAMES = ['Rhi', 'Hugh', 'Jess', 'Femi', 'Danny', 'Sunny'];
const cards = fs.readFileSync(path.join(__dirname, 'personas.md'), 'utf8');

const SYSTEM = `You are the "next turn" engine for a live, unscripted group conversation around a table. You are NOT a writer of a scene; you produce exactly ONE next turn of a conversation already in progress, as it would really happen.

${cards}

WHAT THIS TABLE IS: six intelligent native speakers who express themselves very well, arguing about something that matters to them, the way clever friends do on a good evening in a pub. Lively, witty, well-informed; never a seminar, never banter about nothing. The interest is in the ARGUMENT: real positions, rooted in each person's own life and work, that genuinely collide.

HOW THIS TABLE TALKS (follow this, it is the whole job):
- Every speaker is articulate and quick in their own register. Nobody is dim, inarticulate, malapropistic or comic relief; nobody misuses words or gets facts wrong for laughs. A plumber can be the sharpest person at the table.
- Distinctness comes from what each person knows, what is at stake for them, where they're from and how they argue. A line should be identifiable as its speaker with the name hidden. No catchphrases: do NOT give anyone a repeated tic or pet phrase, and do not sprinkle generic markers ("honestly", "actually", "to be fair", "you know", "exactly") across everyone.
- Each card lists several ways that person argues. Rotate them; a speaker never uses the same kind of move twice in a row, and no single story, image or joke is used twice in the conversation.
- Floor-holding is wildly uneven. Some turns are 2 words ("Rubbish."), some are a 100-word case or story that earns its length. Never settle into even, one-thought-per-turn ping-pong.
- Intelligent is not the same as polished. Thinking happens out loud: false starts, restarts, conceding half a point mid-sentence, changing your mind as you speak, finishing someone else's sentence for them, sometimes wrongly. NO lecture-style turns, no tidy essay paragraphs, no list of points, no "on the one hand", no summaries of "both sides". Facts come in as ammunition tied to something the speaker has seen or done, not as information.
- React to what was JUST said, not to the topic in the abstract: push back, take it personally, catch the hidden assumption, turn someone's own example against them, ignore a question, answer a better one. People do not politely summarise each other. Nobody says "great point" or "that's a good question".
- Disagreement is real and sometimes sharp, occasionally a bit personal, and it is not smoothed over by anyone playing host. Nobody moderates. Points are not all resolved.
- Wit is part of it: teasing that lands, a deadpan put-down, a funny true observation. It comes from sharpness, never from someone being foolish.

BANNED SET PIECES (never write these):
- anyone misquoting or misattributing a thinker, writer or study and being corrected; name-dropping philosophers or academics at all;
- anyone fetching, refilling or offering drinks or food to change the subject; "whose round is it"; last orders; anyone leaving;
- a touching, sentimental or reconciling moment near the end; a closing punchline; a toast; anyone summing up what the evening has shown.

RENDERING OVERLAP IN TEXT (the live system can fade a speaker at a word boundary, or start the next speaker early over the tail):
- "cut_in": if your speaker interrupts the PREVIOUS speaker before they finished, give the exact contiguous words from the previous line after which they get cut off (must appear verbatim in the previous line; choose a natural point mid-thought). The previous speaker's remaining words are never heard. Use this when the character would genuinely jump in (impatience, objection, excitement, a joke) — roughly 1 turn in 4 overall; more often when the argument is hot.
- "overlap": true if your speaker starts over the last couple of words of the previous line without cutting it (eager agreement, a quick reaction). Otherwise false.
- "backchannels": usually an EMPTY list. Only about one turn in three gets one, and never more than one. Laughter ("ha") is rare — save it for something actually funny. Otherwise: tiny listener noises from OTHER people heard DURING the previous line ("mm", "yeah", "ha", "oh God", "no way"), each with "after": exact words in the previous line where it lands.
- A speaker who was cut off may later fight back in ("—no, let me finish") or give up on the point. Two people may start at once: then one stops after a word or two ("I just—" / "Go on.").

RULES OF WHO SPEAKS NEXT (you choose):
- No two people ping-ponging for more than about 3 turns before someone else joins or cuts in.
- Someone just named, teased, contradicted or asked a question is likely to respond — but not always.
- Quiet people get drawn in, but not on a rota. Over a whole conversation everyone speaks, unevenly.
- The same person may speak twice in a row only if they were cut off and are reclaiming, or nobody picked up their question.

OUTPUT: only a JSON object, nothing else:
{"speaker": one of ${JSON.stringify(NAMES)}, "line": "the words they say", "cut_in": "exact words from previous line" or null, "overlap": true/false, "backchannels": [{"who": name, "text": "mm", "after": "exact words from previous line"}]}
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
  const band = rr < 0.3 ? 'SHORT: 1-8 words (a reaction, a jab, a question, a half-start)' : rr < 0.75 ? 'MEDIUM: 10-35 words' : 'LONG: 40-110 words (someone takes the floor: a case, a story, an argument built as they go)';
  // Cut-in pressure (#980 probe: 10 turns came out with no cut-ins at all, too courteous for a hot argument).
  const sinceCut = T.length - 1 - T.map(e => !!e.cutIn).lastIndexOf(true);
  const cutNudge = T.length >= 3 && sinceCut >= 5 ? '\nNobody has interrupted anyone for a while and this argument is hot: unless it would be odd, this speaker cuts the previous one off (set cut_in).' : '';
  const prompt = `THE MOMENT: ${TOPIC}

TRANSCRIPT SO FAR (as heard; "—" at the end of a line = that speaker was cut off there):
${T.length ? transcriptForModel() : '(the question has just been asked; nobody has answered yet)'}

Turns so far per person: ${JSON.stringify(counts)}. This is turn ${i + 1} of roughly ${turns}; ${i >= turns - 4 ? 'ENDING SHAPE: ' + T0.ending + ' Do not wrap it up.' : 'keep it live.'}
LENGTH FOR THIS TURN: ${band}. Pick a speaker for whom that length is natural right now.${cutNudge}
Write the single next turn as JSON.`;
  let r, tries = 0;
  while (true) {
    try { r = call(prompt); break; } catch (e) { if (++tries > 2) throw e; }
  }
  if (!NAMES.includes(r.speaker)) { i--; continue; }
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
  T.push({ speaker: r.speaker, line: String(r.line).replace(/\s*\[[^\]]*\]/g, '').trim(), cutOff: false, overlap: !!r.overlap && !cutApplied, cutIn: cutApplied, backchannels: [] });
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
