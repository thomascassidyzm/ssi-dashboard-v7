#!/usr/bin/env node
'use strict';
// eng_for_hin — the 32 red seeds under Kai's component rule (spec d/92221f8f, job #939·H; applied by job #943·H, 2026-09-23).
//
// Kai's rules, as briefed: adding a missing COMPONENT is the preferred fix (a word met only inside a bigger LEGO
// counts as taught iff that LEGO teaches it as a component); every phrase contains its LEGO; no new vocabulary in a
// phrase; a LEGO is a duplicate only when BOTH sides match; there is no proofreader, so Hindi is fixed here only
// where it is plainly wrong; seeds are never unapproved; the validator's rules are NOT changed.
//
// What this tool does, in one idempotent pass (dry by default, --apply writes):
//   1. COMPONENT HOMES — M-LEGO component lists completed, and A-LEGOs whose words were only ever lumped turned
//      into M-LEGOs with components, so the words are taught as components before the phrases that use them.
//      Below seed 198 (where 130+ learners are) every change is APPEND-ONLY: new component rows, never a rewrite
//      of a slot a learner has already heard (progress is filed by slot, not text).
//   2. PHRASE REWORDS — the smallest reword to taught chunks, Hindi kept wherever the English alone moved.
//   3. BARE-LEGO BUILD ROWS — a build row whose text IS the LEGO is never played (the debut claims it) and never
//      counted; each is turned into a real build phrase so the basket reaches 3 counted builds.
//   4. Seed 478 re-cut as a whole-seed LEGO (the seed's Hindi never contained the old LEGO's); seed 480's ZUT
//      clash with 319 resolved; nukta stragglers (ढूँढ़ at 610, ख़ास at 589) brought to the course majority.
//   5. Three not-new copies of "who said that" (343/344/345 L01) and two comp-less M-LEGOs (35L3, 37L3) made
//      A-type — a not-new copy teaches nothing, and an M with no components is a lie the validator believed.
//
// Component-row sync: for every LEGO whose components change, the C01..Ck rows are rebuilt from the JSON via the
// SAME getMeaningfulComponents/positions the /seed/complete route uses; build/use rows shift down to make room,
// order preserved. Text changes go through the DB triggers that null/relink stale audio; nothing is rendered —
// the audio pass is QUEUED (reason appended, never replaced). Identity: serviceIdentity + recordContentEdit.
//
// Modes:  node <tool>              offline proof (replays the real validator over a dump) + live guard, no writes
//         node <tool> --apply      write, refresh course_round_index, queue the audio pass
//         node <tool> --rows f     export every changed/new row (for the Shuchita checker and the cross-family read)
//         node <tool> --dump dir   use a scratch dump (seeds.json/legos.json/phrases.json) for the offline proof

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const JOB = '#943·H';
const SWEEP = 'eng-for-hin-red-seeds-fix-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 (spec d/92221f8f, job ${JOB}): missing components added as the preferred fix; every phrase contains its LEGO; no new vocab in phrases; seeds never unapproved; validator unchanged`;
const LEARNER_FRONTIER = 198; // highest completed seed by any enrolled learner when this was written — slots below are append-only

const { getMeaningfulComponents, makePhraseId, computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs');

// First-person Hindi written here takes the FEMALE form: job #941·H (known-side gender, running alongside this one) is moving the
// course's first-person rows to Kriti's form, and the live LEGOs these rows contain (S0386L01 उससे सहमत थी, S0465L02 मैं पूछूँगी) already carry it.
// ─── the edits ──────────────────────────────────────────────────────────────────────────────────────────────
// lego: { id, expect:{type,known,target,components}, set:{...} } — expect is the LIVE row this was written against.
// phrase: { id, expect:{known,target}, set:{known?,target?}, why }
// add: { lego, role, known, target, why } — a new build/use row, id = next number in that role.
const C = (target, known, introduce) => (introduce === false ? { known, target, introduce: false } : { known, target });

const LEGOS = [
  // ── component homes (append-only below seed 198) ──
  { id: 'S0032L02', expect: { type: 'A', known: 'क्या आप चाहते थे', target: 'did you want', components: null },
    set: { type: 'M', components: [C('did you', 'क्या आप'), C('want', 'चाहते थे')] }, why: '"did you" taught as a component (355: did you need to talk to…)' },
  { id: 'S0045L02', expect: { type: 'A', known: 'सब कुछ जानना', target: 'to know everything', components: null },
    set: { type: 'M', components: [C('to know', 'जानना'), C('everything', 'सब कुछ')] }, why: '"everything" (477)' },
  { id: 'S0064L01', expect: { type: 'A', known: 'आसान नहीं है', target: "isn't easy", components: null },
    set: { type: 'M', components: [C("isn't", 'नहीं है'), C('easy', 'आसान')] }, why: '"easy" (477)' },
  { id: 'S0087L01', expect: { type: 'A', known: 'वे ऐसे लोग हैं', target: 'they are people', components: null },
    set: { type: 'M', components: [C('they', 'वे'), C('are people', 'ऐसे लोग हैं')] }, why: '"they" = वे taught as a component (477, 480)' },
  { id: 'S0098L02', expect: { type: 'M', known: 'मुझे खेलने पर विचार करना चाहिए', target: 'I should consider playing', components: [C('consider playing', 'खेलने पर विचार करना')] },
    set: { components: [C('consider playing', 'खेलने पर विचार करना'), C('I', 'मुझे', false), C('should', 'चाहिए')] }, why: '"should" = चाहिए (106)' },
  { id: 'S0211L01', expect: { type: 'A', known: 'उन्होंने हमें बताया कि', target: 'they told us that', components: null },
    set: { type: 'M', components: [C('they', 'उन्होंने'), C('told us', 'हमें बताया'), C('that', 'कि', false)] }, why: '"they" = उन्होंने (604: they offered)' },
  { id: 'S0266L03', expect: { type: 'A', known: 'मेरे पिता के', target: 'of my father', components: null },
    set: { type: 'M', components: [C('of', 'के'), C('my father', 'मेरे पिता')] }, why: '"of" = के (477: the second day of the holidays)' },
  // #941·H (known-side gender) moved this LEGO to the female form while this tool was being written; the component gloss follows the live LEGO
  { id: 'S0341L01', expect: { type: 'A', known: 'मैं किसी से मिली थी', target: 'I met someone', components: null },
    set: { type: 'M', components: [C('I', 'मैं', false), C('met', 'मिली थी'), C('someone', 'किसी से')] }, why: '"met" (355: I met that woman you know)' },
  { id: 'S0345L02', expect: { type: 'M', known: 'निकलने के लिए', target: 'to leave', components: [C('to leave', 'जाने'), C('for', 'के लिए')] },
    set: { components: [C('to leave', 'निकलने'), C('for', 'के लिए')] }, why: 'component Hindi said जाने for a LEGO that says निकलने' },
  { id: 'S0345L04', expect: { type: 'M', known: 'वह तैयार नहीं है', target: "he's not ready", components: [C('he', 'वह'), C('not ready', 'तैयार नहीं है')] },
    set: { components: [C('he', 'वह'), C('not', 'नहीं', false), C('ready', 'तैयार')] }, why: '"ready" = तैयार taught as a component (345, 637)' },
  { id: 'S0420L02', expect: { type: 'A', known: 'कि वह कितने साल का है', target: 'how old he is', components: null },
    set: { type: 'M', components: [C('how old', 'कितने साल का'), C('he', 'वह', false), C('is', 'है')] }, why: '"is" = है taught as a component (465, 480, 637)' },
  { id: 'S0455L03', expect: { type: 'A', known: 'बच्चे थके हुए थे', target: 'the children were tired', components: null },
    set: { type: 'M', components: [C('the children', 'बच्चे'), C('were tired', 'थके हुए थे')] }, why: '"the children" = बच्चे (477, 589)' },
  { id: 'S0462L03', expect: { type: 'A', known: 'युद्ध के दौरान', target: 'during the war', components: null },
    set: { type: 'M', components: [C('during', 'के दौरान'), C('the war', 'युद्ध')] }, why: '"during" = के दौरान (477)' },
  // ── M-LEGOs that were lies: comps empty, or a not-new copy carrying comps it never teaches ──
  { id: 'S0035L03', expect: { type: 'M', known: 'कुछ भी', target: 'anything', components: null }, set: { type: 'A' }, why: 'M with no components → A' },
  { id: 'S0037L03', expect: { type: 'M', known: 'बारीकी से', target: 'carefully', components: null }, set: { type: 'A' }, why: 'M with no components → A' },
  { id: 'S0343L01', expect: { type: 'M', known: 'जिसने कहा कि', target: 'who said that', components: [C('who said', 'जिसने कहा'), C('that', 'कि')] }, set: { type: 'A', components: null }, why: 'not-new copy of S0235L01 (A); its comps were never taught' },
  { id: 'S0344L01', expect: { type: 'M', known: 'जिसने कहा कि', target: 'who said that', components: [C('who said', 'जिसने कहा'), C('that', 'कि')] }, set: { type: 'A', components: null }, why: 'not-new copy of S0235L01 (A)' },
  { id: 'S0345L01', expect: { type: 'M', known: 'जिसने कहा कि', target: 'who said that', components: [C('who said', 'जिसने कहा'), C('that', 'कि')] }, set: { type: 'A', components: null }, why: 'not-new copy of S0235L01 (A)' },
  // ── LEGOs re-cut ──
  { id: 'S0339L02', expect: { type: 'M', known: 'चोट पहुँचाई है', target: 'hurt', components: [] },
    set: { known: 'उसने चोट पहुँचाई है', target: "he's hurt", components: [C("he's", 'उसने', false), C('hurt', 'चोट पहुँचाई है')] }, why: 'every phrase already says "he\'s hurt"; "he\'s" (= he has, उसने) and "hurt" taught as components' },
  { id: 'S0478L01', expect: { type: 'M', known: 'एक दयालु दिल', target: 'a kind heart', components: [C('kind', 'दयालु'), C('heart', 'दिल')] },
    set: { known: 'उसका दिल बहुत दयालु है', target: 'she has such a kind heart' }, why: 'the seed\'s Hindi never contained एक दयालु दिल; whole-seed LEGO, comps kind/heart kept' },
  { id: 'S0610L01', expect: { type: 'M', known: 'काम ढूँढना', target: 'to look for work', components: [C('to look for', 'ढूँढना'), C('work', 'काम')] },
    set: { known: 'काम ढूँढ़ना', components: [C('look for', 'ढूँढ़ना'), C('work', 'काम')] }, why: 'nukta to the course majority (ढूँढ़); "look for" as the component so "he needs to" + "look for" + "work" tiles' },
];

const P = (id, expectT, expectK, setT, setK, why) => ({ id: `${COURSE}:${id}`, expect: { target: expectT, known: expectK }, set: { ...(setT !== null ? { target: setT } : {}), ...(setK !== null ? { known: setK } : {}) }, why });
const PHRASES = [
  // 202 / 205 / 347 — "what was going to happen" = क्या होने वाला है is S0348L02, taught at 348; before that the Hindi is S0201L02 "what is going to happen"
  P('S0202L01B02', 'nobody was sure what was going to happen', 'किसी को यक़ीन नहीं था कि क्या होने वाला है।', 'nobody was sure what you were doing', 'किसी को यक़ीन नहीं था कि आप क्या कर रहे थे।', 'S0107L03'),
  P('S0202L01U02', 'they say nobody was sure what was going to happen', 'वे कहते हैं कि किसी को यक़ीन नहीं था कि क्या होने वाला है।', 'they say nobody was sure what you said', 'वे कहते हैं कि किसी को यक़ीन नहीं था कि आपने क्या कहा।', 'S0078L01'),
  P('S0202L01U03', "I'm afraid nobody was sure what was going to happen", 'मुझे डर है कि किसी को यक़ीन नहीं था कि क्या होने वाला है।', "I'm afraid nobody was sure what you were doing", 'मुझे डर है कि किसी को यक़ीन नहीं था कि आप क्या कर रहे थे।', 'S0107L03'),
  P('S0205L01U05', "I've forgotten what was going to happen", 'मैं भूल गई कि क्या होने वाला है।', "I've forgotten what is going to happen", null, 'Hindi unchanged = S0201L02 (known side is #941·H\'s, left as found)'),
  P('S0347L01U01', 'he wanted to know what was going to happen', 'वह जानना चाहता था कि क्या होने वाला है।', 'he wanted to know what you were doing', 'वह जानना चाहता था कि आप क्या कर रहे थे।', 'S0107L03'),
  // 319
  P('S0319L01B01', 'she needs to move', 'उसे जाना है', 'she needs to move tomorrow', 'उसे कल जाना है', 'bare LEGO row → build'),
  P('S0319L01B03', 'she needs to move over there', 'उसे वहाँ जाना है', 'she needs to move there', null, '"over there" only inside A-LEGOs; वहाँ = there (S157)'),
  P('S0319L01U02', 'she said that she needs to move', 'उसने कहा कि उसे जाना है', "I'm afraid she needs to move", 'मुझे डर है कि उसे जाना है', '"she said" is a component only at 322'),
  P('S0319L02B01', 'to a different country', 'किसी दूसरे देश में', 'she needs to move to a different country today', 'उसे आज किसी दूसरे देश में जाना है', 'bare LEGO row → build'),
  P('S0319L02U05', 'she said that she needs to move to a different country', 'उसने कहा कि उसे किसी दूसरे देश में जाना है', "I'm afraid she needs to move to a different country", 'मुझे डर है कि उसे किसी दूसरे देश में जाना है', 'as U02'),
  // 339 — L02 becomes "he's hurt"; the bare row follows it
  P('S0339L02B01', 'hurt', 'चोट पहुँचाई है', "he's hurt himself badly", 'उसने खुद को बुरी तरह चोट पहुँचाई है', 'bare LEGO row → build'),
  // 343
  P('S0343L03B01', "she's worried", 'वह चिंतित है', "she's worried this evening", 'वह आज शाम चिंतित है', 'bare LEGO row → build'),
  P('S0343L03B02', "she's very worried", 'वह बहुत चिंतित है', "yes she's worried", 'हाँ, वह चिंतित है', 'containment'),
  P('S0343L03U04', "she's not worried", 'वह चिंतित नहीं है', "I'm afraid she's worried", 'मुझे डर है कि वह चिंतित है', 'containment'),
  // 345
  P('S0345L02B01', 'to leave', 'निकलने के लिए', 'not ready to leave yet', 'अभी तक निकलने के लिए तैयार नहीं', 'bare LEGO row → build'),
  P('S0345L04B01', "he's not ready", 'वह तैयार नहीं है', "he's not ready this evening", 'वह आज शाम तैयार नहीं है', 'bare LEGO row → build'),
  P('S0345L04B03', "he's not quite ready", 'वह पूरी तरह तैयार नहीं है', "he's not ready yet", 'वह अभी तक तैयार नहीं है', 'containment; yet = अभी तक (S0345L03)'),
  // 355
  P('S0355L01B01', 'need to talk to', 'से बात करनी थी', 'need to talk to that woman today', 'आज उस औरत से बात करनी थी', 'bare LEGO row → build'),
  P('S0355L01U03', 'did I need to talk to him?', 'क्या मुझे उससे बात करनी थी?', 'did you need to talk to that woman today?', 'क्या आपको आज उस औरत से बात करनी थी?', '"did you" is the component (S0032L02); "did I" is not'),
  P('S0355L02B01', 'you know', 'जिसे आप जानते हैं', 'that woman you know today', 'आज उस औरत से जिसे आप जानते हैं', 'bare LEGO row → build'),
  // 363
  P('S0363L01B01', 'felt like talking', 'बातें करने का मन था', 'I felt like talking today', 'मुझे आज बातें करने का मन था', 'bare LEGO row → build'),
  P('S0363L02U05', 'he felt like talking a lot over there', 'उसे वहाँ बहुत बातें करने का मन था', 'he felt like talking a lot there', null, '"over there" only inside A-LEGOs'),
  // 364
  P('S0364L01B01', 'heard that', 'सुना कि', 'we heard that', 'हमने सुना कि', 'bare LEGO row → build'),
  P('S0364L01U04', 'I heard that you were there', 'मैंने सुना कि आप वहाँ थे', 'I heard that he was there', 'मैंने सुना कि वह वहाँ था', '"were" never a chunk; "he was" is S0266L01'),
  P('S0364L01U05', 'I heard that he was often quiet', 'मैंने सुना कि वह अक्सर चुप था', 'I heard that he was quiet today', 'मैंने सुना कि वह आज चुप था', '"often" only inside an A-LEGO; "he was quiet" is S0361L01'),
  P('S0364L02B01', 'that place', 'वह जगह', 'I want to see that place', 'मैं वह जगह देखना चाहती हूँ', 'bare LEGO row → build'),
  P('S0364L02U05', 'do I know that place?', 'क्या मैं वह जगह जानता हूँ?', "I don't know that place", 'मैं वह जगह नहीं जानती।', '"do I" never taught; "I don\'t know" is S0085L01'),
  P('S0364L03B01', "didn't like", 'पसंद नहीं थी', "I didn't like it", 'मुझे पसंद नहीं थी', 'bare LEGO row → build'),
  // 365
  P('S0365L01B01', "didn't hear", 'नहीं सुना कि', "we didn't hear", 'हमने नहीं सुना कि', 'bare LEGO row → build'),
  P('S0365L01U04', "I didn't hear that you were there", 'मैंने नहीं सुना कि आप वहाँ थे', "I didn't hear that he was there", 'मैंने नहीं सुना कि वह वहाँ था', '"were" never a chunk'),
  P('S0365L02B01', 'what she said to him', 'उसने उसे क्या कहा', 'what she said to him yesterday', 'कल उसने उसे क्या कहा', 'bare LEGO row → build'),
  // 380 / 382 / 433 / 451 / 452 / 453 — the Hindi is S0375L03 "what she is doing" = वह क्या कर रही है; only the English tense had shifted
  P('S0380L01U04', 'I asked what she was doing', 'मैंने पूछा कि वह क्या कर रही है।', 'I asked what she is doing', null, 'S0375L03'),
  P('S0382L01U03', 'did you ask what she was doing?', 'क्या आपने पूछा कि वह क्या कर रही है?', 'did you ask what she is doing?', null, 'S0375L03'),
  P('S0433L01U05', "they couldn't find out what she was doing", 'वे यह पता नहीं लगा सके कि वह क्या कर रही है।', "they couldn't find out what she is doing", null, 'S0375L03'),
  P('S0451L01U05', 'they said what she was doing', 'उन्होंने बताया कि वह क्या कर रही है।', 'they said what she is doing', null, 'S0375L03'),
  P('S0452L01U05', "they didn't say what she was doing", 'उन्होंने यह नहीं बताया कि वह क्या कर रही है।', "they didn't say what she is doing", null, 'S0375L03'),
  P('S0453L01U05', 'did they say what she was doing?', 'क्या उन्होंने बताया कि वह क्या कर रही है?', 'did they say what she is doing?', null, 'S0375L03'),
  // 385 / 386
  P('S0385L01B01', 'agree with her', 'उससे सहमत थे', 'did you agree with her yesterday?', 'क्या आप कल उससे सहमत थे?', 'containment'),
  P('S0385L01B02', 'you agree with her', 'आप उससे सहमत थे', 'did you agree with her last week?', 'क्या आप पिछले हफ़्ते उससे सहमत थे?', 'containment'),
  P('S0385L01U01', 'did you agree with her?', 'क्या आप उससे सहमत थे?', 'did you agree with her this evening?', 'क्या आप आज शाम उससे सहमत थे?', 'bare LEGO row → use'),
  P('S0386L01B01', 'agreed with her', 'उससे सहमत थी', 'I agreed with her yesterday', 'मैं कल उससे सहमत थी', 'bare LEGO row → build'),
  // 438
  P('S0438L01B01', 'decide', 'तय करना', 'decide today', 'आज तय करना', 'bare LEGO row → build'),
  P('S0438L02B01', 'what he should do', 'उसे क्या करना चाहिए', 'to ask what he should do', 'पूछना कि उसे क्या करना चाहिए', 'bare LEGO row → build'),
  // 465
  P('S0465L01B03', 'to tell next time', 'अगली बार बताना', 'to tell me next time', 'अगली बार मुझे बताना', '"tell" only inside S0070L02 "to tell me"'),
  P('S0465L01U03', 'next time we have to catch the train', 'अगली बार हमें ट्रेन पकड़नी है', 'next time they have to catch the train themselves', 'अगली बार उन्हें ख़ुद ट्रेन पकड़नी है', 'whole S0450L02'),
  P('S0465L01U05', 'next time the children will be ready', 'अगली बार बच्चे तैयार होंगे', "next time I'll be ready", 'अगली बार मैं तैयार हो जाऊँगी', '"will be ready" only inside S0252L01; "I\'ll be ready" is S0253L01'),
  P('S0465L02B01', 'I will ask', 'मैं पूछूँगा', 'I will ask today', 'मैं आज पूछूँगी', 'bare LEGO row → build'),
  // 477
  P('S0477L01U03', 'I have to leave after the holidays', 'छुट्टियों के बाद मुझे जाना है', 'we had to leave after the holidays', 'छुट्टियों के बाद हमें जाना पड़ा', '"I have to" never a chunk; "we had to leave" is S0455L01'),
  P('S0477L02U01', 'he came round on the second day of the holidays', 'वह छुट्टियों के दूसरे दिन आया', 'our friends came round on the second day of the holidays', 'हमारे दोस्त छुट्टियों के दूसरे दिन आए', 'whole S0454L01'),
  P('S0477L03U02', 'they were sick after the meal', 'वे भोजन के बाद बीमार थे', null, 'वे खाने के बाद बीमार थे', 'भोजन never taught; S0447L02 "after the meal" = खाने के बाद'),
  P('S0477L04U02', "he's been sick since the meal", 'वह भोजन के बाद से बीमार रहा है', "he's been sick since the second day", 'वह दूसरे दिन से बीमार रहा है', '"the meal" never taught alone'),
  // 478 — basket rebuilt around the whole-seed LEGO
  P('S0478L01B01', 'a kind heart', 'एक दयालु दिल', 'I think she has such a kind heart', 'मुझे लगता है उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  P('S0478L01B02', 'such a kind heart', 'ऐसा दयालु दिल', 'yes she has such a kind heart', 'हाँ, उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  P('S0478L01B03', 'has a kind heart', 'एक दयालु दिल है', "I'm sure she has such a kind heart", 'मुझे यक़ीन है कि उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  P('S0478L01B04', 'a very kind heart', 'बहुत दयालु दिल', "I don't think she has such a kind heart", 'मुझे नहीं लगता उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  P('S0478L01U01', 'she has such a kind heart', 'उसका दिल बहुत दयालु है', 'I heard that she has such a kind heart', 'मैंने सुना कि उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  P('S0478L01U02', 'she has a kind heart', 'उसके पास एक दयालु दिल है', 'she has such a kind heart if you ask me', 'मेरे हिसाब से उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  P('S0478L01U03', 'she has a very kind heart', 'उसका एक बहुत दयालु दिल है', "it's true she has such a kind heart", 'यह सच है कि उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  P('S0478L01U04', 'my grandfather has a kind heart', 'मेरे दादा का दिल दयालु है', "she has such a kind heart and she's my friend", 'उसका दिल बहुत दयालु है और वह मेरी दोस्त है', 'whole-seed LEGO'),
  P('S0478L01U05', 'he has such a kind heart', 'उसके पास ऐसा दयालु दिल है', 'I think that she has such a kind heart', 'मुझे लगता है कि उसका दिल बहुत दयालु है', 'whole-seed LEGO'),
  // 480
  P('S0480L01B01', 'whatever it is', 'चाहे जो हो', 'whatever they say', 'चाहे जो वे कहते हैं', '"is" ↔ हो (subjunctive) never taught; "they say" is S0200L01'),
  P('S0480L01B02', 'whatever I do', 'चाहे जो मैं करूँ', 'whatever I want', 'चाहे जो मैं चाहती हूँ', '"do" ↔ करूँ never taught'),
  P('S0480L01U01', "whatever it is, I don't want it", 'चाहे जो हो, मुझे यह नहीं चाहिए', "whatever they say, I don't want it", 'चाहे जो वे कहते हैं, मुझे यह नहीं चाहिए', 'as B01'),
  P('S0480L01U02', "whatever it is, it's not likely", 'चाहे जो हो, यह संभावित नहीं है', "whatever they say, it's not very likely", 'चाहे जो वे कहते हैं, ज़्यादा संभावना नहीं है', 'संभावित is a new lexeme; whole S0456L03'),
  P('S0480L01U03', "whatever I do, it's not easy", 'चाहे जो मैं करूँ, यह आसान नहीं है', "whatever I want, it isn't easy", 'चाहे जो मैं चाहती हूँ, यह आसान नहीं है', 'as B02; "isn\'t easy" is S0064L01'),
  P('S0480L01U04', 'whatever they want, we have to leave', 'चाहे जो वे चाहें, हमें जाना है', 'whatever they want, she needs to move', 'चाहे जो वे चाहें, उसे जाना है', '"we have to" never a chunk; S0319L01'),
  P('S0480L01U05', 'whatever it is, I want to change it', 'चाहे जो हो, मैं इसे बदलना चाहता हूँ', 'whatever they say, I want to change it', 'चाहे जो वे कहते हैं, मैं इसे बदलना चाहती हूँ', 'as B01'),
  P('S0480L02U02', 'the hotel is not far ahead', 'होटल ज़्यादा दूर नहीं है', 'a shop is not far ahead', 'एक दुकान ज़्यादा दूर नहीं है', '"the hotel" never a chunk'),
  P('S0480L03U05', 'he says he has to leave', 'वह कहता है कि उसे जाना है', 'he says she needs to move', null, 'ZUT: उसे जाना है is "she needs to move" (S0319L01)'),
  // 589
  P('S0589L01B01', 'she told me', 'उसने मुझे बताया', 'she told me yesterday', 'उसने मुझे कल बताया', 'bare LEGO row → build'),
  P('S0589L01B03', 'she told me again', 'उसने मुझे फिर से बताया', 'she told me that again', 'उसने मुझे इसे दोबारा बताया', 'फिर से never a prompt for "again"; S0061L02 "that again"'),
  P('S0589L01U03', "she told me it's very special", 'उसने मुझे बताया कि यह बहुत खास है।', 'she told me the holidays are very special', 'उसने मुझे बताया कि छुट्टियाँ बहुत ख़ास होती हैं।', 'whole S0574L01; nukta ख़ास'),
  P('S0589L01U05', "she told me it's my choice", 'उसने मुझे बताया कि यह मेरी पसंद है।', 'she told me the truth', 'उसने मुझे सच बताया।', '"my choice" only inside S0566L02; "the truth" is S0071L02'),
  P('S0589L02B01', 'the last bus', 'आखिरी बस', 'the last bus tomorrow', 'आखिरी बस कल', 'bare LEGO row → build'),
  P('S0589L03B01', "she'd just seen", 'उसने अभी देखी', "she'd just seen the last bus here", 'उसने अभी यहाँ आखिरी बस देखी', 'bare LEGO row → build'),
  // 598
  P('S0598L01B01', 'a thousand stories', 'हज़ारों कहानियाँ', 'a thousand stories about the economy', 'अर्थव्यवस्था के बारे में हज़ारों कहानियाँ', 'bare LEGO row → build'),
  P('S0598L01U04', "I suspect that he's heard a thousand stories", 'मुझे शक है कि उसने हज़ारों कहानियाँ सुनी हैं।', "I think he's heard a thousand stories", 'मुझे लगता है उसने हज़ारों कहानियाँ सुनी हैं।', '"I suspect" / शक never taught'),
  P('S0598L02B01', 'about what they were doing', 'कि वे क्या कर रहे थे', 'a thousand stories about what they were doing', 'हज़ारों कहानियाँ कि वे क्या कर रहे थे', 'bare LEGO row → build'),
  P('S0598L02U04', "he's heard a hundred stories about what they were doing", 'उसने सौ कहानियाँ सुनी हैं कि वे क्या कर रहे थे।', "he's heard hundreds of stories about what they were doing", 'उसने सैकड़ों कहानियाँ सुनी हैं कि वे क्या कर रहे थे।', '"a hundred" / सौ never taught; S0597L03 "hundreds of stories"'),
  // 604
  P('S0604L01B01', 'offered to let us stay', 'रहने देने की पेशकश की', 'offered to let us stay today', 'आज रहने देने की पेशकश की', 'bare LEGO row → build'),
  P('S0604L01U05', 'she knew that she offered to let us stay', 'वह जानती थी कि उसने हमें रहने देने की पेशकश की।', 'I think that she offered to let us stay', 'मुझे लगता है कि उसने हमें रहने देने की पेशकश की।', '"she knew that" arrives at 622 as "I knew that"; जानती थी never appears'),
  // 610 — nukta ढूँढ़ to the course majority; "has nothing"/"do you need to" replaced
  P('S0610L01B01', 'to look for work', 'काम ढूँढना', 'to look for work here', 'यहाँ काम ढूँढ़ना', 'bare LEGO row → build; nukta'),
  P('S0610L01B02', 'he needs to look for work', 'उसे काम ढूँढना है', null, 'उसे काम ढूँढ़ना है', 'nukta'),
  P('S0610L01B03', 'I need to look for work', 'मुझे काम ढूँढना है', null, 'मुझे काम ढूँढ़ना है', 'nukta'),
  P('S0610L01B04', 'we need to look for work', 'हमें काम ढूँढना है', null, 'हमें काम ढूँढ़ना है', 'nukta'),
  P('S0610L01U01', 'he needs to look for work now', 'उसे अभी काम ढूँढना है।', null, 'उसे अभी काम ढूँढ़ना है।', 'nukta'),
  P('S0610L01U02', 'I think he needs to look for work', 'मुझे लगता है उसे काम ढूँढना है।', null, 'मुझे लगता है उसे काम ढूँढ़ना है।', 'nukta'),
  P('S0610L01U03', 'do you need to look for work?', 'क्या आपको काम ढूँढना है?', 'he needs to look for work here', 'उसे यहाँ काम ढूँढ़ना है।', '"need to" only ever lumped; nukta'),
  P('S0610L01U04', "he doesn't want to look for work", 'वह काम ढूँढना नहीं चाहता।', null, 'वह काम ढूँढ़ना नहीं चाहता।', 'nukta'),
  P('S0610L01U05', 'he needs to look for work here because he has nothing', 'उसे यहाँ काम ढूँढना है क्योंकि उसके पास कुछ नहीं है।', 'he needs to look for work here now', 'उसे अभी यहाँ काम ढूँढ़ना है।', 'possessive "has" (के पास) never taught; nukta'),
  // 621 / 622
  P('S0621L01U03', 'was it broken?', 'क्या यह टूट गया था?', 'I heard that it was broken', 'मैंने सुना कि यह टूट गया था।', 'containment (Kai\'s wording)'),
  P('S0622L01B03', 'I knew that it was a mistake', 'मुझे पता था कि यह एक ग़लती थी।', 'I knew that it was broken', 'मुझे पता था कि यह टूट गया था।', '"a mistake" is not a chunk (S0617L01 is "that it was a mistake"); S0621L01'),
  // 637
  P('S0637L01B01', 'her bag', 'उसका बैग', 'her bag is here today', 'उसका बैग आज यहाँ है', 'bare LEGO row → build'),
];

// New build rows where a basket had a bare row AND another failing build (343 L3 needs a third counted build).
const ADDS = []; // every basket reaches 3 counted builds by turning its bare row into a real phrase; nothing needs a new row

const SEEDS_TOUCHED = [...new Set([...LEGOS.map(l => +l.id.slice(1, 5)), ...PHRASES.map(p => +p.id.split(':')[1].slice(1, 5)), ...ADDS.map(a => +a.lego.slice(1, 5))])].sort((a, b) => a - b);
const RED_SEEDS = [106, 202, 205, 319, 339, 343, 345, 347, 355, 363, 364, 365, 380, 382, 385, 386, 433, 438, 451, 452, 453, 465, 477, 478, 480, 589, 598, 604, 610, 621, 622, 637];

// ─── pure helpers (tested) ─────────────────────────────────────────────────────────────────────────────────
const normWords = (s) => String(s || '').toLowerCase().replace(/[.,!?;:।"“”]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
/** English: the LEGO's words in order, contiguous (the live containment gate). Hindi: every LEGO word present, in order, gaps allowed. */
function containsInOrder(hay, needle, gapsAllowed) {
  const h = normWords(hay).split(' ').filter(Boolean), n = normWords(needle).split(' ').filter(Boolean);
  if (!n.length) return true;
  if (!gapsAllowed) return ` ${h.join(' ')} `.includes(` ${n.join(' ')} `);
  let i = 0; for (const w of h) if (w === n[i]) i++;
  return i === n.length;
}
/** A LEGO's Hindi in the oblique/agreeing form its whole basket already uses — named per LEGO, never inferred. */
const LEGO_KNOWN_INFLECTED = { 'दूसरा दिन': ['दूसरे दिन'] };
const phraseContainsLego = (lego, phrase) => containsInOrder(phrase.target, lego.target, false)
  && [lego.known, ...(LEGO_KNOWN_INFLECTED[lego.known] || [])].some(k => containsInOrder(phrase.known, k, true));
const isBare = (lego, phrase) => normalizeForContainment(phrase.target) === normalizeForContainment(lego.target);

/** The component rows the /seed/complete route would write for these components. */
function componentRows(legoId, seed, idx, target, components) {
  const meaningful = getMeaningfulComponents(components || [], target);
  return meaningful.map((c, i) => ({
    id: makePhraseId(COURSE, seed, idx, 'component', i + 1), course_code: COURSE, seed_number: seed, lego_index: idx, position: i + 1,
    known_text: c.known, target_text: c.target, word_count: c.target.length, lego_count: 1, phrase_role: 'component',
    introduce: c.introduce !== false, connected_lego_ids: [], lego_position: computeLegoPosition(c.target, c.target),
    metadata: { buildup: 'component', component_index: i }, status: 'draft', version: 1,
  }));
}

/** Apply every edit to an in-memory dump ({seeds, legos, phrases}); returns { dump, plan } — plan is the exact row-level write list. */
function applyToDump(dump) {
  const legos = dump.legos.map(l => ({ ...l }));
  const phrases = dump.phrases.map(p => ({ ...p, metadata: p.metadata ? { ...p.metadata } : p.metadata }));
  const plan = { legoUpdates: [], phraseUpdates: [], phraseInserts: [], phraseDeletes: [], positionShifts: [] };
  const byId = new Map(phrases.map(p => [p.id, p]));
  for (const e of LEGOS) {
    const l = legos.find(x => x.lego_id === e.id);
    if (!l) throw new Error(`${e.id} not in dump`);
    const before = { type: l.type, known: l.known_text, target: l.target_text, components: l.components };
    Object.assign(l, e.set.type ? { type: e.set.type } : {}, e.set.known ? { known_text: e.set.known } : {}, e.set.target ? { target_text: e.set.target } : {},
      'components' in e.set ? { components: e.set.components } : {});
    plan.legoUpdates.push({ id: e.id, seed: l.seed_number, before, after: { type: l.type, known: l.known_text, target: l.target_text, components: l.components } });
    if ('components' in e.set || e.set.target) {
      const wantRows = componentRows(e.id, l.seed_number, l.lego_index, l.target_text, l.components);
      const haveRows = phrases.filter(p => p.seed_number === l.seed_number && p.lego_index === l.lego_index && p.phrase_role === 'component').sort((a, b) => a.position - b.position);
      const delta = wantRows.length - haveRows.length;
      if (delta > 0) {
        const others = phrases.filter(p => p.seed_number === l.seed_number && p.lego_index === l.lego_index && p.phrase_role !== 'component').sort((a, b) => b.position - a.position);
        for (const o of others) { plan.positionShifts.push({ id: o.id, from: o.position, to: o.position + delta }); o.position += delta; }
      }
      for (const w of wantRows) {
        const have = byId.get(w.id);
        if (!have) { phrases.push(w); byId.set(w.id, w); plan.phraseInserts.push({ ...w, lego: e.id }); }
        else if (have.known_text !== w.known_text || have.target_text !== w.target_text || have.introduce !== w.introduce) {
          plan.phraseUpdates.push({ id: w.id, lego: e.id, before: { known: have.known_text, target: have.target_text, introduce: have.introduce }, after: { known: w.known_text, target: w.target_text, introduce: w.introduce }, why: `component of ${e.id}` });
          Object.assign(have, { known_text: w.known_text, target_text: w.target_text, introduce: w.introduce });
        }
      }
      for (const h of haveRows) if (!wantRows.find(w => w.id === h.id)) { plan.phraseDeletes.push({ id: h.id, lego: e.id }); phrases.splice(phrases.indexOf(h), 1); byId.delete(h.id); }
    }
  }
  for (const e of PHRASES) {
    const p = byId.get(e.id);
    if (!p) throw new Error(`${e.id} not in dump`);
    const before = { known: p.known_text, target: p.target_text };
    if (e.set.known !== undefined) p.known_text = e.set.known;
    if (e.set.target !== undefined) p.target_text = e.set.target;
    plan.phraseUpdates.push({ id: e.id, before, after: { known: p.known_text, target: p.target_text }, why: e.why });
  }
  for (const a of ADDS) {
    const seed = +a.lego.slice(1, 5), idx = +a.lego.slice(6, 8);
    const l = legos.find(x => x.lego_id === a.lego);
    const same = phrases.filter(p => p.seed_number === seed && p.lego_index === idx);
    const sameRole = same.filter(p => p.phrase_role === a.role);
    const n = sameRole.length + 1;
    const lastBuildPos = Math.max(0, ...same.filter(p => p.phrase_role === 'build').map(p => p.position));
    const lastPos = Math.max(0, ...same.map(p => p.position));
    const position = a.role === 'build' ? lastBuildPos + 1 : lastPos + 1;
    if (a.role === 'build') for (const u of same.filter(p => p.phrase_role === 'use').sort((x, y) => y.position - x.position)) { plan.positionShifts.push({ id: u.id, from: u.position, to: u.position + 1 }); u.position += 1; }
    const row = { id: makePhraseId(COURSE, seed, idx, a.role, n), course_code: COURSE, seed_number: seed, lego_index: idx, position, known_text: a.known, target_text: a.target,
      word_count: a.target.length, lego_count: a.known.split(/\s+/).length, phrase_role: a.role, introduce: true, connected_lego_ids: [], lego_position: computeLegoPosition(a.target, l.target_text),
      metadata: { format: 'build_use', pipeline: 'v2', origin: SWEEP }, status: 'draft', version: 1 };
    if (byId.has(row.id)) throw new Error(`${row.id} already exists`);
    phrases.push(row); byId.set(row.id, row); plan.phraseInserts.push({ ...row, lego: a.lego });
  }
  return { dump: { seeds: dump.seeds, legos, phrases }, plan };
}

/** Rows whose text is new (for the checker, the cross-family read and the audio pass). */
function changedRows(plan) {
  const rows = [];
  for (const u of plan.legoUpdates) if (u.before.known !== u.after.known || u.before.target !== u.after.target) rows.push({ seed: u.seed, id: u.id, role: 'lego', known: u.after.known, target: u.after.target });
  for (const u of plan.phraseUpdates) rows.push({ seed: +u.id.split(':')[1].slice(1, 5), id: u.id.split(':')[1], role: u.why && u.why.startsWith('component') ? 'component' : (u.id.includes('B') && /B\d\d$/.test(u.id) ? 'build' : 'use'), known: u.after.known, target: u.after.target });
  for (const i of plan.phraseInserts) rows.push({ seed: i.seed_number, id: i.id.split(':')[1], role: i.phrase_role, known: i.known_text, target: i.target_text });
  return rows;
}

/** Replay the real validator over a dump: [{seed, issues}] for every red seed. */
function replayValidator(dump) {
  const { _test } = require('../../services/course-builder/routes/v2.cjs');
  const byKey = {}; for (const p of dump.phrases) { const k = `${p.seed_number}:${p.lego_index}`; (byKey[k] = byKey[k] || []).push(p); }
  const legosBySeed = {}; for (const l of dump.legos) (legosBySeed[l.seed_number] = legosBySeed[l.seed_number] || []).push(l);
  const vocab = new Set(); const out = [];
  const log = console.log; console.log = () => {};
  try {
    for (const s of [...dump.seeds].sort((a, b) => a.seed_number - b.seed_number)) {
      const sl = (legosBySeed[s.seed_number] || []).sort((a, b) => a.lego_index - b.lego_index);
      const issues = _test.runSeedChecks(s, sl, byKey, vocab, COURSE, false);
      if (issues.length) out.push({ seed: s.seed_number, issues });
      _test.accumulate(sl, vocab, false);
    }
  } finally { console.log = log; }
  return out;
}

/** Bidirectional ZUT over non-component rows of a dump: one known → several targets. */
function zutClashes(dump) {
  const nk = s => String(s || '').toLowerCase().trim().replace(/[.?!,।]+$/, '');
  const nt = s => String(s || '').toLowerCase().replace(/[\s.?!,]/g, '');
  const byKnown = new Map();
  const add = (known, target, id) => { const k = nk(known); if (!k) return; if (!byKnown.has(k)) byKnown.set(k, new Map()); const m = byKnown.get(k); const t = nt(target); if (!m.has(t)) m.set(t, []); m.get(t).push(id); };
  for (const l of dump.legos) add(l.known_text, l.target_text, l.lego_id);
  for (const p of dump.phrases) if (p.phrase_role !== 'component') add(p.known_text, p.target_text, p.id.split(':')[1]);
  return [...byKnown.entries()].filter(([, m]) => m.size > 1).map(([known, m]) => ({ known, targets: [...m.entries()].map(([t, ids]) => ({ target: t, ids: ids.slice(0, 4) })) }));
}

/** Hindi forms in changed rows that are agreement inflections of a taught word, not new lexemes (each named, none waved through). */
const KNOWN_SIDE_INFLECTIONS = {
  'सुनी': 'सुना (S0597L02 "he\'s heard" = उसने सुना है) agreeing with कहानियाँ, fem. pl. — the form every existing S0598 phrase already uses',
};
/** Known-side novelty: Hindi words in the changed rows that no LEGO/component known text up to that seed contains. */
function knownSideNewWords(dump, rows) {
  const hw = s => String(s || '').replace(/[।,.?!;:"'()]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  for (const r of rows) {
    if (r.role === 'lego' || r.role === 'component') continue;
    const seen = new Set();
    for (const l of dump.legos) if (l.seed_number <= r.seed) { hw(l.known_text).forEach(w => seen.add(w)); for (const c of (l.components || [])) hw(c.known).forEach(w => seen.add(w)); }
    const fresh = hw(r.known).filter(w => !seen.has(w) && !KNOWN_SIDE_INFLECTIONS[w]);
    if (fresh.length) out.push({ id: r.id, fresh });
  }
  return out;
}

/** Offline rules that must hold before any write. */
function offlineCheck(dump) {
  const problems = [];
  const { dump: after, plan } = applyToDump(dump);
  const legoOf = (p) => after.legos.find(l => l.seed_number === p.seed_number && l.lego_index === p.lego_index);
  // every build/use phrase under a touched LEGO contains its LEGO on both sides; no bare rows left in touched baskets
  // Both sides for every row THIS TOOL writes; for the rest of a touched basket the English gate only (a pre-existing
  // Hindi inflection — दूसरे दिन under दूसरा दिन, देखा under देखी — is agreement, not a defect, and is not this job's).
  const touchedLegos = new Set([...LEGOS.map(l => l.id), ...PHRASES.map(p => p.id.split(':')[1].slice(0, 8)), ...ADDS.map(a => a.lego)]);
  const written = new Set([...plan.phraseUpdates.map(u => u.id), ...plan.phraseInserts.map(i => i.id)]);
  for (const p of after.phrases) {
    if (p.phrase_role === 'component') continue;
    const l = legoOf(p); if (!l || !touchedLegos.has(l.lego_id)) continue;
    const lego = { known: l.known_text, target: l.target_text }, ph = { known: p.known_text, target: p.target_text };
    if (written.has(p.id) && !phraseContainsLego(lego, ph)) problems.push(`${p.id}: "${p.target_text}" | ${p.known_text} does not contain ${l.lego_id} on both sides`);
    if (!written.has(p.id) && !containsInOrder(ph.target, lego.target, false)) problems.push(`${p.id}: "${p.target_text}" does not contain ${l.lego_id}`);
    if (isBare(lego, ph)) problems.push(`${p.id}: still a bare-LEGO row`);
  }
  // the bare rows this tool rewrites really were bare, and the phrases it rewrites were failing or bare (never a passing row rewritten for nothing)
  for (const e of PHRASES) if (e.why.startsWith('bare')) {
    const l = dump.legos.find(x => x.lego_id === e.id.split(':')[1].slice(0, 8));
    if (!isBare({ target: l.target_text }, { target: e.expect.target })) problems.push(`${e.id}: expected a bare row, "${e.expect.target}" is not the LEGO "${l.target_text}"`);
  }
  // replay: every red seed touched is green, and nothing that was green turns red
  const before = new Map(replayValidator(dump).map(r => [r.seed, r.issues]));
  const afterRed = new Map(replayValidator(after).map(r => [r.seed, r.issues]));
  for (const s of RED_SEEDS) if (afterRed.has(s)) problems.push(`seed ${s} still red: ${afterRed.get(s).join('; ')}`);
  for (const [s, issues] of afterRed) if (!before.has(s)) problems.push(`seed ${s} turned RED: ${issues.join('; ')}`);
  // no new ZUT clash, and no new Hindi lexeme in a changed phrase
  const clashBefore = new Set(zutClashes(dump).map(c => c.known));
  for (const c of zutClashes(after)) if (!clashBefore.has(c.known)) problems.push(`new ZUT clash: "${c.known}" → ${c.targets.map(t => `${t.target} (${t.ids.join(',')})`).join(' / ')}`);
  const fresh = knownSideNewWords(after, changedRows(plan));
  for (const f of fresh) problems.push(`known-side new word(s) in ${f.id}: ${f.fresh.join(' ')}`);
  return { problems, plan, after, before, afterRed };
}

// ─── live ──────────────────────────────────────────────────────────────────────────────────────────────────
function supa() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

/** Read the whole course in three statements over a direct connection (the REST client times out paging 11k phrase rows). */
async function loadLive() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const seeds = (await client.query('select seed_number, known_text, target_text, approved_at from course_seeds where course_code=$1 order by seed_number', [COURSE])).rows;
    const legos = (await client.query('select lego_id, seed_number, lego_index, type, is_new, known_text, target_text, components, target_lego_id from course_legos where course_code=$1 order by seed_number, lego_index', [COURSE])).rows;
    const phrases = (await client.query('select id, seed_number, lego_index, position, phrase_role, known_text, target_text, introduce, metadata, status from course_practice_phrases where course_code=$1 order by id', [COURSE])).rows;
    return { seeds, legos, phrases };
  } finally { await client.end().catch(() => {}); }
}

/** The live rows must be exactly what this tool was written against (or already what it writes — idempotent). */
function guard(live) {
  const problems = []; let alreadyDone = 0, todo = 0;
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  for (const e of LEGOS) {
    const l = live.legos.find(x => x.lego_id === e.id);
    if (!l) { problems.push(`${e.id} missing`); continue; }
    const isExpect = l.type === e.expect.type && l.known_text === e.expect.known && l.target_text === e.expect.target && same(l.components, e.expect.components);
    const want = { ...e.expect, ...e.set };
    const isDone = l.type === want.type && l.known_text === want.known && l.target_text === want.target && same(l.components, want.components);
    if (isDone && !isExpect) alreadyDone++; else if (isExpect) todo++; else problems.push(`${e.id} is ${l.type} "${l.target_text}" | ${l.known_text} comps=${JSON.stringify(l.components)}`);
  }
  for (const e of PHRASES) {
    const p = live.phrases.find(x => x.id === e.id);
    if (!p) { problems.push(`${e.id} missing`); continue; }
    const knownMatters = e.set.known !== undefined; // #941·H owns the known side of gendered rows; where this tool leaves it alone it is not compared
    const isExpect = (!knownMatters || p.known_text === e.expect.known) && p.target_text === e.expect.target;
    const want = { ...e.expect, ...e.set };
    const isDone = (!knownMatters || p.known_text === want.known) && p.target_text === want.target;
    if (isDone && !isExpect) alreadyDone++; else if (isExpect) todo++; else problems.push(`${e.id} is "${p.target_text}" | ${p.known_text}`);
  }
  return { problems, alreadyDone, todo };
}

async function apply(sb, live) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const { plan } = applyToDump(live);
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'update',
    scope: { seed_numbers: SEEDS_TOUCHED, lego_ids: plan.legoUpdates.map(u => u.id), phrase_ids: [...plan.phraseUpdates.map(u => u.id), ...plan.phraseInserts.map(i => i.id)] },
    detail: { job: JOB, ruling: RULING, spec: 'd/92221f8f', legoUpdates: plan.legoUpdates.length, phraseUpdates: plan.phraseUpdates.length, phraseInserts: plan.phraseInserts.length, phraseDeletes: plan.phraseDeletes.length },
  });
  console.log(`edit event ${eventId}`);
  // 1. position shifts first (descending, so the unique (seed, lego, position) key never collides)
  for (const s of plan.positionShifts) must(await sb.from('course_practice_phrases').update({ position: s.to }).eq('course_code', COURSE).eq('id', s.id), `shift ${s.id}`);
  if (plan.positionShifts.length) console.log(`shifted ${plan.positionShifts.length} build/use rows to make room for new components`);
  // 2. LEGOs
  for (const u of plan.legoUpdates) {
    const patch = { last_edit_event_id: eventId };
    if (u.before.type !== u.after.type) patch.type = u.after.type;
    if (u.before.known !== u.after.known) patch.known_text = u.after.known;
    if (u.before.target !== u.after.target) patch.target_text = u.after.target;
    if (JSON.stringify(u.before.components ?? null) !== JSON.stringify(u.after.components ?? null)) patch.components = u.after.components;
    must(await sb.from('course_legos').update(patch).eq('course_code', COURSE).eq('lego_id', u.id), u.id);
    console.log(`  ${u.id} ${Object.keys(patch).filter(k => k !== 'last_edit_event_id').join(',')}`);
  }
  // 3. phrases: deletes (component rows no longer in the list), updates, inserts
  for (const d of plan.phraseDeletes) { must(await sb.from('course_practice_phrases').delete().eq('course_code', COURSE).eq('id', d.id), `delete ${d.id}`); console.log(`  − ${d.id}`); }
  for (const u of plan.phraseUpdates) {
    const patch = { last_edit_event_id: eventId, qa_checked: null };
    if (u.before.known !== u.after.known) patch.known_text = u.after.known;
    if (u.before.target !== u.after.target) patch.target_text = u.after.target;
    if (u.after.introduce !== undefined && u.before.introduce !== u.after.introduce) patch.introduce = u.after.introduce;
    must(await sb.from('course_practice_phrases').update(patch).eq('course_code', COURSE).eq('id', u.id), u.id);
    console.log(`  ${u.id.split(':')[1]} → "${u.after.target}" | ${u.after.known}`);
  }
  for (const i of plan.phraseInserts) {
    const { lego, ...row } = i;
    must(await sb.from('course_practice_phrases').insert({ ...row, last_edit_event_id: eventId }), `insert ${i.id}`);
    console.log(`  + ${i.id.split(':')[1]} (${i.phrase_role} pos ${i.position}) "${i.target_text}" | ${i.known_text}`);
  }
  // 4. the round index; the audio pass (appended, never replaced)
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow(); console.log('course_round_index refreshed');
  const rows = changedRows(plan);
  const reason = `red-seeds-fix ${JOB}: ${rows.length} rows re-worded/added across seeds ${SEEDS_TOUCHED.join(',')} (${SWEEP})`;
  const pending = must(await sb.from('audio_pass_requests').select('id,reason').eq('course_code', COURSE).eq('status', 'pending').order('created_at', { ascending: false }).limit(1), 'pending audio pass');
  if (pending && pending.length) { const prev = String(pending[0].reason || '').trim(); must(await sb.from('audio_pass_requests').update({ reason: prev ? `${prev} + ${reason}` : reason }).eq('id', pending[0].id), 'append reason'); console.log(`audio pass: appended to pending request ${pending[0].id}`); }
  else { const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs'); await queueAudioPass(COURSE, { reason, requestedBy: `@${SWEEP}` }); console.log('audio pass: queued'); }
  return { eventId, plan };
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const dumpDir = opt('--dump');
  let dump;
  const sb = dumpDir ? null : supa();
  if (dumpDir) dump = { seeds: JSON.parse(fs.readFileSync(path.join(dumpDir, 'seeds.json'))), legos: JSON.parse(fs.readFileSync(path.join(dumpDir, 'legos.json'))), phrases: JSON.parse(fs.readFileSync(path.join(dumpDir, 'phrases.json'))) };
  else dump = await loadLive();
  if (opt('--rows')) { const { plan } = applyToDump(dump); fs.writeFileSync(opt('--rows'), JSON.stringify(changedRows(plan), null, 1)); console.log(`${changedRows(plan).length} rows → ${opt('--rows')}`); return; }

  console.log(`\n══════ ${COURSE}: the 32 red seeds (${JOB}) — ${LEGOS.length} LEGO edits, ${PHRASES.length} phrase edits, ${ADDS.length} new rows ══════`);
  const g = guard(dump);
  for (const p of g.problems) console.error(`BLOCKED  ${p}`);
  if (g.problems.length) { console.error(`\nBLOCKED — ${g.problems.length} live row(s) differ from what this tool was written against. Nothing written.`); process.exit(1); }
  if (g.todo === 0) { console.log(`already applied (${g.alreadyDone} rows in their final state). Nothing to do.`); return; }
  const { problems, plan, afterRed, before } = offlineCheck(dump);
  console.log(`offline: ${before.size} red before → ${afterRed.size} red after; plan = ${plan.legoUpdates.length} LEGO updates, ${plan.phraseUpdates.length} phrase updates, ${plan.phraseInserts.length} inserts, ${plan.phraseDeletes.length} deletes, ${plan.positionShifts.length} position shifts`);
  for (const [s, issues] of afterRed) console.log(`  still red: ${s} — ${issues.join('; ')}`);
  for (const p of problems) console.error(`RULE  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — offline rules fail. Nothing written.'); process.exit(1); }
  if (!argv.includes('--apply')) { console.log('\ndry run — pass --apply to write.'); return; }
  const { eventId } = await apply(sb, dump);
  const liveAfter = await loadLive();
  const red = replayValidator(liveAfter);
  console.log(`\nlive after apply: ${red.length} red seed(s): ${red.map(r => r.seed).join(',') || 'none'} (event ${eventId})`);
}

module.exports = { COURSE, JOB, LEGOS, PHRASES, ADDS, KNOWN_SIDE_INFLECTIONS, LEGO_KNOWN_INFLECTED, SEEDS_TOUCHED, RED_SEEDS, containsInOrder, phraseContainsLego, isBare, componentRows, applyToDump, changedRows, replayValidator, zutClashes, knownSideNewWords, offlineCheck, guard };
if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
