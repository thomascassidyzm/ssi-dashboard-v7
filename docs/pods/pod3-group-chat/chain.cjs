#!/usr/bin/env node
// Pod 3 text-only live-chain test (#961·AI).
// One "next turn" call per turn: shared transcript (AS HEARD) + six persona cards in, {speaker, line,
// cut_in, overlap, backchannels} out. Mirrors the live-chain design (/d/bb491252 §9): the previous
// line is fully written before the next is generated, so a cut-in is the player fading that speaker
// at a word — in text, the previous line is truncated at that point and ends with an em dash.
// Usage: node chain.cjs <topicKey> <turns> <model>
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , topicKey, turnsArg = '30', model = 'opus'] = process.argv;
const TOPICS = {
  phones: "Ana has just said her friend's daughter got a smartphone at age 9, and asked the table: should children have their own smartphone before they start secondary school?",
  translate: "Toby has just said he's thinking of dropping his Spanish module because 'the earbuds translate everything now anyway'. Ana is horrified. Question on the table: is it still worth learning a language when your phone can translate?",
  recline: "Gaz has just come back from a flight to Cyprus and is complaining that the man in front reclined his seat into his knees for four hours. Question on the table: is it rude to recline your seat on a plane?",
};
const TOPIC = TOPICS[topicKey];
if (!TOPIC) { console.error('unknown topic'); process.exit(2); }
const NAMES = ['Maggie', 'Dean', 'Priya', 'Gaz', 'Ana', 'Toby'];
const cards = fs.readFileSync(path.join(__dirname, 'personas.md'), 'utf8');

const SYSTEM = `You are the "next turn" engine for a live, unscripted group conversation around a table. You are NOT a writer of a scene; you produce exactly ONE next turn of a conversation already in progress, as it would really happen.

${cards}

HOW REAL TABLES TALK (follow this, it is the whole job):
- Floor-holding is wildly uneven. Some turns are 2 words ("God, no."), some are a 120-word wandering story. Gaz and Maggie hold the floor; Ana asks short questions; Priya and Dean cut in. Never settle into even, one-thought-per-turn ping-pong.
- Each speaker has a NARROW personal palette of tics, used repeatedly. Do NOT sprinkle generic markers ("honestly", "actually", "you know", "exactly", "fair enough") across everyone. A line should be identifiable as its speaker with the name hidden.
- If a speaker used one of their tics in their previous turn, they use none this turn. Priya cites a study at most every third turn of hers; Maggie's Dr Johnson at most once per conversation.
- Tics are seasoning, not a checklist: a given speaker uses one of their tics in maybe one turn in three, and plenty of turns are plain. Never stack all of a speaker's tics in one line.
- Not every line is witty. Most turns are ordinary, a bit flat, half-finished; the occasional good line lands because the rest are not trying.
- Thinking happens out loud: false starts, restarts mid-sentence, "what's the word", circling back, losing the thread, finishing someone else's sentence. Markers sit where the thinking is hard, not as ornaments at the start and end of turns.
- React to what was JUST said: agree, push back, mishear, take it personally, drift to a related story, answer a question nobody asked, ignore a question. People do not politely summarise each other. Not every point gets resolved.
- Conflict is real and sometimes a bit rude, then smoothed over (or not). Nobody moderates except Ana, sometimes, badly.
- Side-tracks are normal (a joke, a dig, someone asking for the salt) and the talk drifts back or doesn't.
- No speeches about "both sides". No tidy conclusions. No one says "great point".

RENDERING OVERLAP IN TEXT (the live system can fade a speaker at a word boundary, or start the next speaker early over the tail):
- "cut_in": if your speaker interrupts the PREVIOUS speaker before they finished, give the exact contiguous words from the previous line after which they get cut off (must appear verbatim in the previous line; choose a natural point mid-thought). The previous speaker's remaining words are never heard. Use this when the character would genuinely jump in (impatience, objection, excitement, a joke) — roughly 1 turn in 4 or 5 overall, far more for Priya and Dean, rarely for Maggie.
- "overlap": true if your speaker starts over the last couple of words of the previous line without cutting it (eager agreement, a quick reaction). Otherwise false.
- "backchannels": usually an EMPTY list. Only about one turn in three gets one, and never more than one. Laughter ("ha") is rare — save it for something actually funny. Otherwise: tiny listener noises from OTHER people heard DURING the previous line ("mm", "yeah", "ha", "oh God", "no way"), each with "after": exact words in the previous line where it lands.
- A speaker who was cut off may later fight back in ("—no, let me finish") or give up on the point. Two people may start at once: then one stops after a word or two ("I just—" / "Go on.").

RULES OF WHO SPEAKS NEXT (you choose):
- No two people ping-ponging for more than about 3 turns before someone else joins or cuts in.
- Someone just named, teased, contradicted or asked a question is likely to respond — but not always.
- Quiet people get drawn in (Ana does this), but not on a rota. Over a whole conversation everyone speaks, unevenly.
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
const log = [];
for (let i = 0; i < turns; i++) {
  const counts = Object.fromEntries(NAMES.map(n => [n, T.filter(e => e.speaker === n).length]));
  const rr = Math.random();
  const band = rr < 0.3 ? 'SHORT: 1-8 words (a reaction, a jab, a question, a half-start)' : rr < 0.75 ? 'MEDIUM: 10-35 words' : 'LONG: 40-130 words (someone takes the floor: a story, a rant, a wander)';
  const prompt = `THE MOMENT: ${TOPIC}

TRANSCRIPT SO FAR (as heard; "—" at the end of a line = that speaker was cut off there):
${T.length ? transcriptForModel() : '(the question has just been asked; nobody has answered yet)'}

Turns so far per person: ${JSON.stringify(counts)}. This is turn ${i + 1} of roughly ${turns}; ${i >= turns - 4 ? 'the talk may be drifting off topic or petering out naturally — do not wrap it up neatly.' : 'keep it live.'}
LENGTH FOR THIS TURN: ${band}. Pick a speaker for whom that length is natural right now.
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
fs.writeFileSync(path.join(__dirname, `out-${topicKey}.json`), JSON.stringify({ topic: TOPIC, model, T, log }, null, 2));
fs.writeFileSync(path.join(__dirname, `out-${topicKey}.md`), `*${TOPIC}*\n\n${render()}\n`);
console.log('done', topicKey, T.length);
