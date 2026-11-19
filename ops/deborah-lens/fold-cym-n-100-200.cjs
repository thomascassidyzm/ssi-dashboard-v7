#!/usr/bin/env node
'use strict';
// node ops/deborah-lens/fold-cym-n-100-200.cjs   → writes calibration-cym-n-100-200/filtered.tsv and prints the counts.
// The LEAD's verdict on every reader finding of the cym_n_for_eng 100-200 calibration relay (cs #785·AI, 19 Nov 2026).
// Default: the reader's bin stands. OVERRIDES (keyed by line number in findings.tsv) are the lead's changes, each with
// its reason. filter: REAL (WRONG or COULD-MISLEAD, checked against the sheet) · CANON-OK (FINE: canon or house
// convention) · NOT REAL (the reader's claim does not hold) · OPEN (UNSURE: for Kai). CALIBRATION ONLY: nothing here is a fix.
const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, 'calibration-cym-n-100-200');
const GAP = 'true by the LEGO list (form is in no LEGO), but on this hand-built course words often first arrive in phrases: a teaching gap with a remedy (a LEGO or an as-in), not an error; one ruling for Kai, not one per line';
const HEAD = 'head-word or loose label on a hand-built LEGO; the intro bridges it; misleads only if the bare pair is prompted or the phrases stray: remedy re-label';
const O = {
  4: ['COULD-MISLEAD', 'REAL', 'am taught as "for" only, then used as "about" (seed 103 needs it): known form, new sense; remedy an as-in. ' + GAP],
  11: ['FINE', 'CANON-OK', 'fragments filed as USE: a rule-shape breach (P7) on a hand-built course, answerable and harmless; count it, do not call it WRONG'],
  14: ['COULD-MISLEAD', 'REAL', HEAD], 15: ['COULD-MISLEAD', 'REAL', HEAD],
  17: ['FINE', 'CANON-OK', 'a dangling fragment "how do you feel about?": polish, not an error in the Welsh'],
  19: ['COULD-MISLEAD', 'REAL', GAP + '; also spelt oeddet here and oeddat in the later LEGO'],
  31: ['COULD-MISLEAD', 'REAL', GAP], 38: ['COULD-MISLEAD', 'REAL', 'seed 114 needs bare wrth and no LEGO gives it. ' + GAP],
  41: ['COULD-MISLEAD', 'REAL', 'checked: 1 of 15 phrases keeps "dydy hi ddim" (reader said 0); the seed form is barely drilled: remedy more drilling, not an error'],
  42: ['COULD-MISLEAD', 'REAL', GAP], 44: ['COULD-MISLEAD', 'REAL', GAP],
  51: ['UNSURE', 'OPEN', 'reader calls "na dydy … ddim" ungrammatical by the written rule (nad ydy); it may be normal colloquial North speech: a speaker question, never a WRONG'],
  53: ['COULD-MISLEAD', 'REAL', GAP], 56: ['COULD-MISLEAD', 'REAL', 'checked: "thank you very much" ends diolch yn fawr iawn (S0122L01B02) and diolch yn fawr (S0129L02U07); root is the loose label S0057L01 thank you | diolch yn fawr: remedy re-label'],
  57: ['COULD-MISLEAD', 'REAL', GAP], 62: ['COULD-MISLEAD', 'REAL', GAP], 80: ['COULD-MISLEAD', 'REAL', GAP],
  83: ['COULD-MISLEAD', 'REAL', GAP + '; doedd neb is the correct past, the clash is with S0121L01B04 (kept WRONG there)'],
  87: ['FINE', 'NOT REAL', 'overturned: a bod clause carries no tense, so fod o isio is right for "that he wanted" (the reader\'s own grammar line S0110L01B01 says so)'],
  90: ['COULD-MISLEAD', 'REAL', GAP], 91: ['COULD-MISLEAD', 'REAL', 'basket drills mor aml â phosib, not the LEGO yn aml: remedy more drilling of the LEGO; mor … â is a gap'],
  99: ['COULD-MISLEAD', 'REAL', GAP], 102: ['COULD-MISLEAD', 'REAL', GAP + '; guessable sibling of ddudest ti'],
  105: ['COULD-MISLEAD', 'REAL', 'LEGO teaches the tail "ydy rheina?" of an ai … ydy rheina? question; a learner would over-generalise to verb-first: remedy an as-in'],
  110: ['FINE', 'CANON-OK', 'wel is a transparent filler; nothing to teach'],
  111: ['FINE', 'CANON-OK', 'odd but grammatical (P14: unlikely to come up is not a defect); kept in the new-kinds list as slot-fill-nonsense'],
  117: ['FINE', 'CANON-OK', 'fragments filed as USE: rule-shape breach on a hand-built course, harmless'],
  120: ['COULD-MISLEAD', 'REAL', GAP + '; dach chi is first asked for at 147 and taught at 156'],
  123: ['COULD-MISLEAD', 'REAL', 'the cleanest COULD MISLEAD of the run: yet | hyd yn hyn (S0013L01) is a useful loose label, and "not yet" then comes as eto in one line and hyd yn hyn in another: remedy teach eto for not-yet or keep the phrases to one'],
  124: ['COULD-MISLEAD', 'REAL', 'ti and chi alternate with no cue in the English; may be deliberate exposure: remedy a cue, or accept both'],
  130: ['COULD-MISLEAD', 'REAL', GAP], 134: ['UNSURE', 'OPEN', 'oes + a definite noun breaks the written rule but is heard in speech; the English is odd: speaker question'],
  137: ['COULD-MISLEAD', 'REAL', GAP + '; paradigm sibling (his/her twenties, thirties)'],
  138: ['COULD-MISLEAD', 'NOT REAL', 'overturned as a target error: ddim … hyd yn hyn is acceptable Welsh ("not so far"); it is the other half of the yet clash at S0148L01B07, counted there'],
  139: ['COULD-MISLEAD', 'REAL', HEAD], 146: ['COULD-MISLEAD', 'REAL', HEAD + '; same English label as an earlier LEGO'], 148: ['COULD-MISLEAD', 'REAL', HEAD + '; same English label as an earlier LEGO'],
  150: ['COULD-MISLEAD', 'REAL', HEAD], 151: ['COULD-MISLEAD', 'REAL', GAP], 152: ['COULD-MISLEAD', 'REAL', GAP], 156: ['COULD-MISLEAD', 'REAL', HEAD],
  168: ['COULD-MISLEAD', 'REAL', 'amdani is in about 25 lines and in seed 192 and is never a LEGO: the biggest single gap of the run. ' + GAP],
  171: ['COULD-MISLEAD', 'REAL', 'we need | bo\' ni angen is a that-clause form under a plain label (same family as S0130L01 that reader 2 binned COULD-MISLEAD): remedy label "that we need"'],
  181: ['COULD-MISLEAD', 'REAL', 'the S0151L01 intro says fyddan is the northern fydden, so it is deliberate; but S0187L01 then teaches bydden: two forms for "we would": remedy pick one; the dialect point is Kai\'s'],
  183: ['FINE', 'NOT REAL', 'overturned: "The Welsh for: \'them\', is:" is not truncated, it is the machine-course intro template, where the target clip plays after the line; the reader was not told two templates exist'],
  184: ['COULD-MISLEAD', 'REAL', 'LEGO is bare nhw but its phrases need wrthyn / iddyn nhw: remedy cut the LEGO as "to tell them". ' + GAP],
  9: ['UNSURE', 'OPEN', 'ONE ruling for Kai covers all four orphan counts: is a review line with none of its LEGO the course\'s deliberate interleaving, or a P17 defect?'],
  107: ['UNSURE', 'OPEN', 'orphan-phrase count; see the one ruling at S0101L02B02'], 159: ['UNSURE', 'OPEN', 'orphan-phrase count; see the one ruling at S0101L02B02'], 203: ['UNSURE', 'OPEN', 'orphan-phrase count; see the one ruling at S0101L02B02'],
};
const KEPT = { 10: 'checked: the same prompt "yes, I enjoyed it very much, thank you" is ei mwynhau (S0120L01B01) and ei fwynhau (S0167L02U02): one prompt, two answers',
  20: 'checked: hynna is asked for at S0105L01B07 and taught as a NEW LEGO at S0118L01, 13 seeds later: an order inversion',
  35: 'penwythnos is masculine (y penwythnos hwn), so "benwythnos hon" looks like a slip; medium confidence, Kai to confirm',
  47: 'checked: seed 117 English says "Nobody wanted", the Welsh, the intro and every phrase say "nobody wants" (does neb isio)',
  61: 'checked: "nobody wanted" = does neb isio here and doedd neb isio at S0129L02B01: English tense is wrong here',
  142: 'checked: typo mae’n nhw’n for maen nhw’n in two lines', 149: 'identical prompt, object "it" is fo in one basket and hi in another (first line checked in the sheet)',
  161: 'checked: intro repeat says "Maen nhw deud", the ’n is missing', 178: 'checked: wrthon ni is asked for in three lines one seed before its LEGO (S0185L01)',
  196: 'checked: intro says oeddet, the LEGO and phrases say oeddat', 199: 'checked: ffilm is feminine, so "ffilm diddorol" should be ffilm ddiddorol' };
const lines = fs.readFileSync(path.join(dir, 'findings.tsv'), 'utf8').split('\n').filter(Boolean);
const out = [lines[0] + '\tlead_bin\tfilter\tlead_reason'];
const tally = {}; const bump = (b, k, v) => { tally[b] = tally[b] || {}; tally[b][k] = tally[b][k] || {}; tally[b][k][v] = (tally[b][k][v] || 0) + 1; };
lines.slice(1).forEach((l, i) => {
  const nr = i + 2; const f = l.split('\t'); const reader = f[2];
  let [bin, filter, why] = O[nr] || [reader, { WRONG: 'REAL', 'COULD-MISLEAD': 'REAL', FINE: 'CANON-OK', UNSURE: 'OPEN' }[reader], reader === 'WRONG' ? (KEPT[nr] || '') : 'reader\'s bin stands'];
  if (reader === 'WRONG' && bin === 'WRONG' && !KEPT[nr]) throw new Error(`WRONG at line ${nr} has no lead check`);
  out.push([...f, bin, filter, why].join('\t'));
  for (const b of [f[0], 'ALL']) { bump(b, 'reader', reader); bump(b, 'lead', bin); bump(b, 'filter', filter); }
});
fs.writeFileSync(path.join(dir, 'filtered.tsv'), out.join('\n') + '\n');
for (const b of Object.keys(tally)) console.log(b, JSON.stringify(tally[b]));
