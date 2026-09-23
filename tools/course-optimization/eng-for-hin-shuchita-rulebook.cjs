// eng_for_hin — Shuchita's rulebook (job #891·H, Kai, 2026-09-23).
//
// WHY THIS EXISTS. Shuchita, the native Hindi proofreader for English-for-Hindi-speakers, has
// finished and is no longer available. Kai: "very careful checks from now on, based on all of her
// decisions." Every rule below is distilled from something SHE did, in one of two phases:
//   Phase 1 (21–31 Aug 2026): seed-level rewrites, 541 net edits across 423 seeds. Recorded in
//     content_audit_log (no author column — attribution is by window and shape; see the
//     2026-09-03 register document d/a3d97d1b). Treated here as PREFERENCES, lower confidence.
//   Phase 2 (3–22 Sept 2026): the per-seed review in the Popty orchestrator — 221 redo notes on
//     200 seeds (seed_redo_snapshots.notes, actor e0422ab3…, "shuchita") and 678 approvals.
//     The notes carry her exact wording; the pre-redo snapshot carries the line she was shown.
//     474 before/after pairs are in eng-for-hin-shuchita-calibration.json. HIGH confidence.
// Where the two phases disagree, Phase 2 wins (it is later, explicit and signed).
//
// HONESTY RULE (Kai): where her intent is ambiguous the rule says so in `confidence` and `note`,
// and the checker reports it as a question, not a fix. No rule here was invented; each carries the
// seed(s) it came from. A rule marked `kind: 'judged'` cannot be decided by pattern-matching and
// is handed to a model with her precedents as the brief (see the checker's --judge).
//
// SHAPE. Each rule: { id, title, kind: 'deterministic'|'judged', side: 'hindi'|'english'|'both',
//   severity: 'fix'|'flag', confidence, precedent: [{seed, before, after}], note, check(row) }.
//   check(row) returns [] or [{ message, proposed }]. row = { known, target, role?, id?, seed? }.
//   severity 'fix' = mechanical and her precedent is direct, the checker may apply it;
//   severity 'flag' = list it for Kai.

'use strict';

const NUKTA = '़';
const hasWord = (t, re) => re.test(t || '');
const eng = (row) => (row.target || '').toLowerCase();
const hin = (row) => row.known || '';

// ---------------------------------------------------------------------------------------------
// Nukta spelling. Seeds 11–21 (she typed "मुझे यक़ीन नहीं है" seed after seed), seed 99: "If possible,
// यकीन needs to be changed to यक़ीन in the whole grid in order to be consistent with the earlier
// instances". Phase 1: 157 seeds gained a nukta, 47 of the 541 edits were nukta-only.
// Her own later notes sometimes omit it (129, 132, 146, 288, 296, 472, 474, 600, 663 use यकीन) —
// the explicit whole-grid instruction wins over her typing.
// ---------------------------------------------------------------------------------------------
const NUKTA_PAIRS = [
  ['यकीन', 'यक़ीन'], ['गलती', 'ग़लती'], ['गलतियाँ', 'ग़लतियाँ'], ['हफ्ते', 'हफ़्ते'], ['हफ्ता', 'हफ़्ता'],
  ['खुश', 'ख़ुश'], ['खुशी', 'ख़ुशी'], ['काफी', 'काफ़ी'], ['खरीद', 'ख़रीद'], ['तरीका', 'तरीक़ा'], ['तरीके', 'तरीक़े'],
  ['वक्त', 'वक़्त'], ['फर्क', 'फ़र्क़'], ['ऑफिस', 'ऑफ़िस'], ['बगीचे', 'बग़ीचे'], ['मुफ्त', 'मुफ़्त'],
  ['बेवकूफी', 'बेवक़ूफ़ी'], ['जरूरत', 'ज़रूरत'], ['जरूरी', 'ज़रूरी'], ['ज्यादा', 'ज़्यादा'], ['खत्म', 'ख़त्म'],
  ['जवाब', 'जवाब'], // no nukta in जवाब — listed so nobody "corrects" it
  ['फैसला', 'फ़ैसला'], ['फिल्म', 'फ़िल्म'], ['जिंदगी', 'ज़िंदगी'], ['अफसोस', 'अफ़सोस'], ['ख्याल', 'ख़्याल'],
  ['कॉफी', 'कॉफ़ी'], ['ईमेल', 'ईमेल'], ['जगह', 'जगह'], ['बिल्कुल', 'बिल्कुल'],
].filter(([a, b]) => a !== b);

function nuktaCheck(row) {
  const out = [];
  const h = hin(row);
  for (const [plain, dotted] of NUKTA_PAIRS) {
    // match the plain form only where it is not already the dotted form
    const re = new RegExp(plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let m;
    while ((m = re.exec(h))) {
      const slice = h.slice(m.index, m.index + dotted.length);
      if (slice === dotted) continue;
      // the plain form followed by a nukta on its first consonant means it's already dotted
      if (h[m.index + 1] === NUKTA) continue;
      out.push({ message: `spelling: ${plain} → ${dotted} (nukta)`, proposed: { known: h.replace(re, (w, i) => (h[i + 1] === NUKTA ? w : dotted)) } });
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------------------------
const RULES = [
  {
    id: 'H-NUKTA', title: 'Hindustani spelling: the nukta is written (यक़ीन, ज़रूरत, ख़ुश, हफ़्ते …)',
    kind: 'deterministic', side: 'hindi', severity: 'fix', confidence: 'high',
    precedent: [
      { seed: 12, before: 'मुझे यकीन नहीं है कि मैं अंदाज़ा लगाना चाहता हूँ।', after: 'मुझे यक़ीन नहीं है कि मैं अंदाज़ा लगाना चाहता हूँ।' },
      { seed: 99, before: 'मुझे यकीन नहीं है कि आपको ख़ुद से पूछना चाहिए।', after: 'मुझे यक़ीन नहीं है कि आपको ख़ुद से पूछना चाहिए।' },
      { seed: 98, before: 'मुझे यकीन नहीं है कि मैं कुछ और कहना चाहता हूँ।', after: 'मुझे यक़ीन नहीं है कि मैं कुछ और कहना चाहता हूँ।' },
    ],
    note: 'Seed 99: "यकीन needs to be changed to यक़ीन in the whole grid". Phase 1: 157 seeds gained a nukta. Her later notes sometimes type यकीन; the explicit whole-grid instruction wins.',
    check: nuktaCheck,
  },
  {
    id: 'H-KE-BAJAY', title: 'के बजाय, never की बजाय',
    kind: 'deterministic', side: 'hindi', severity: 'fix', confidence: 'high',
    precedent: [{ seed: 523, before: 'की बजाय', after: 'के बजाय' }],
    note: 'Seed 523: "Please use के बजाय in place of की बजाय."',
    check: (row) => hasWord(hin(row), /की बजाय/) ? [{ message: 'की बजाय → के बजाय', proposed: { known: hin(row).replace(/की बजाय/g, 'के बजाय') } }] : [],
  },
  {
    id: 'H-ALREADY', title: '"already" is पहले ही (or पहले से), never bare पहले',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'medium',
    precedent: [
      { seed: 421, before: 'पहले', after: 'पहले ही', note: '"The equivalent for the word already in Hindi is पहले ही. So, please replace all पहले with पहले ही in this seed."' },
      { seed: 290, before: null, after: 'पता नहीं उसे पहले से जवाब पता है या नहीं। → I wonder if he knows the answer already' },
      { seed: 425, before: null, after: 'वे पहले ही जानते हैं कि वे समझते हैं। → they already know they understand' },
    ],
    note: 'Ambiguity stated: she ruled पहले ही at 421 but herself wrote पहले से at 290 for "knows … already". Bare पहले with "already" is what she rejected; both tails pass.',
    check: (row) => {
      if (!/\balready\b/.test(eng(row))) return [];
      const h = hin(row);
      if (/पहले (ही|से)/.test(h)) return [];
      if (/पहले/.test(h)) return [{ message: '"already" rendered as bare पहले; she ruled पहले ही (421), and used पहले से (290)', proposed: null }];
      return [];
    },
  },
  {
    id: 'H-A-QUESTION', title: '"a question" is एक सवाल',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'medium',
    precedent: [{ seed: 422, before: 'सवाल', after: 'एक सवाल', note: '"A question means सवाल, but a question in the context it has been used in this seed means एक सवाल. So, please replace all सवाल with एक सवाल in this seed."' }],
    note: 'She scoped it to "in this seed"; applied elsewhere only as a flag.',
    check: (row) => (/\ba question\b/.test(eng(row)) && /सवाल/.test(hin(row)) && !/एक सवाल/.test(hin(row))) ? [{ message: '"a question" without एक before सवाल', proposed: null }] : [],
  },
  {
    id: 'H-SUBJECT-PRONOUN', title: 'The Hindi carries its subject pronoun when the English does (मैं … हूँ, वे …)',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 2, before: 'कर रहा हूँ', after: 'मैं कर रहा हूँ', note: 'her first note, 3 Sept: "कर रहा हूँ should be मैं कर रहा हूँ"' },
      { seed: 2, before: 'कोशिश कर रहा हूँ', after: 'मैं कोशिश कर रहा हूँ → I\'m trying' },
      { seed: 9, before: 'बोलता हूँ', after: 'मैं बोलता हूँ → I speak' },
      { seed: 41, before: 'लेकिन थकान लगने लगी है', after: 'लेकिन मुझे थकान लगने लगी है → but I\'m starting to feel tired' },
      { seed: 431, before: 'जल्दी तैयार हो जाएँगे', after: 'वे जल्दी तैयार हो जाएँगे', note: '"In all of the sentences of L3, वे is missing from the Hindi translation of they\'ll be ready."' },
    ],
    note: 'Component rows (CPT/CMP) that gloss a bare verb are exempt: she split "I can" into मैं + सकता हूँ herself (seed 10).',
    check: (row) => {
      if (row.role === 'component') return [];
      const e = eng(row); const h = hin(row);
      const out = [];
      // Only a FINITE Hindi clause is tested: a LEGO fragment ("के लिए उत्सुक → I'm looking forward
      // to") or a component is allowed to be bare — she split "I can" into मैं + सकता हूँ herself (seed 10).
      const tests = [
        [/^i(\s|'m|'d|'ll|'ve)/, /(हूँ|ूँगा|ूँगी)/, /(मैं|मुझे|मेरा|मेरी|मेरे|मैंने)/, 'I → मैं/मुझे/मैंने'],
        [/^they(\s|'ll|'re|'d|'ve)/, /(हैं|थे|थीं|ेंगे|ेंगी|ँगे|ंगे|ँगी|ंगी)/, /(वे|उन्हें|उनके|उनकी|उनका|उन्होंने|उनसे|उनको|वो|लोग)/, 'they → वे/उन्हें/उन्होंने'],
        [/^we(\s|'ll|'re|'d|'ve)/, /(हैं|थे|ेंगे|ेंगी|ँगे|ंगे|ें)/, /(हम|हमें|हमारे|हमारी|हमारा|हमने|हमसे)/, 'we → हम/हमें/हमने'],
        [/^you(\s|'ll|'re|'d|'ve)/, /(हैं|थे|ेंगे|ेंगी|ँगे|ंगे)/, /(आप|आपको|आपके|आपकी|आपका|आपने|आपसे|तुम)/, 'you → आप…'],
      ];
      const eTrim = e.replace(/^(but|and|so|because|today|now|here|tomorrow|yesterday|unfortunately|then)\s+/, '');
      for (const [er, finite, hr, label] of tests) {
        if (er.test(eTrim) && finite.test(h) && !hr.test(h)) out.push({ message: `subject pronoun missing on the Hindi side (${label})`, proposed: null });
      }
      return out;
    },
  },
  {
    id: 'H-SIR-MADAM-AGREEMENT', title: 'सर takes masculine agreement, मैडम feminine (कर रही हैं, मैडम)',
    kind: 'deterministic', side: 'hindi', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 642, before: null, after: 'आप बहुत अच्छा कर रही हैं, मैडम। → you\'re doing very well madam' },
      { seed: 642, before: null, after: 'आप क्या सोचती हैं, मैडम? → what do you think madam?' },
      { seed: 644, before: null, after: 'क्या आप वह कह सकती हैं, मैडम? → could you say that madam?' },
      { seed: 647, before: null, after: 'आप यह बोलते हैं, सर। → you speak it sir' },
    ],
    note: 'Phase 1 (31 Aug): all fifteen vocative seeds 639–655 rewritten to ", सर" / ", मैडम" with the comma; श्रीमान/महोदया removed.',
    check: (row) => {
      const h = hin(row); const out = [];
      if (/मैडम/.test(h) && /(रहे हैं|सकते हैं|करते हैं|सोचते हैं|बोलते हैं|चाहते हैं|जानते हैं|समझते हैं)/.test(h)) out.push({ message: 'मैडम with masculine verb agreement', proposed: null });
      if (/\bसर\b/.test(h) && /(रही हैं|सकती हैं|करती हैं|सोचती हैं|बोलती हैं|चाहती हैं|जानती हैं|समझती हैं)/.test(h)) out.push({ message: 'सर with feminine verb agreement', proposed: null });
      if (/(मैडम|सर)[।?]?$/.test(h.trim()) && !/, ?(मैडम|सर)/.test(h)) out.push({ message: 'vocative without the comma she added before every सर/मैडम', proposed: { known: h.replace(/\s+(मैडम|सर)([।?!]?)$/, ', $1$2') } });
      return out;
    },
  },
  {
    id: 'H-ADDRESS-WORDS', title: 'सर / मैडम / शुक्रिया / आप — never श्रीमान, महोदया, धन्यवाद, तुम, तू',
    kind: 'deterministic', side: 'hindi', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 639, before: 'श्रीमान', after: 'सर', note: 'Phase 1, seven seeds' },
      { seed: 642, before: 'महोदया', after: 'मैडम', note: 'Phase 1, eight seeds' },
      { seed: 142, before: null, after: 'मदद के लिए बहुत-बहुत शुक्रिया → thank you very much for helping' },
    ],
    note: 'आप in 192 live seeds, तुम/तू zero and she added neither. धन्यवाद appears nowhere and she never introduced it. कृपया is NOT flagged: Phase 1 removed it twice but her September notes for seed 414 write कृपया in six lines — her later wording stands.',
    check: (row) => {
      const h = hin(row); const out = [];
      if (/श्रीमान/.test(h)) out.push({ message: 'श्रीमान → सर', proposed: { known: h.replace(/श्रीमान/g, 'सर') } });
      if (/महोदया/.test(h)) out.push({ message: 'महोदया → मैडम', proposed: { known: h.replace(/महोदया/g, 'मैडम') } });
      if (/धन्यवाद/.test(h)) out.push({ message: 'धन्यवाद → शुक्रिया', proposed: { known: h.replace(/धन्यवाद/g, 'शुक्रिया') } });
      if (/(^|\s)(तुम|तू|तुम्हें|तुम्हारा|तुम्हारी|तुम्हारे|तेरा|तेरी|तेरे)(\s|$|[।?!,])/.test(h)) out.push({ message: 'informal you (तुम/तू): the course is आप throughout', proposed: null });
      return out;
    },
  },
  {
    id: 'H-TOLD', title: '"told" is बताया; सुनाई/सुनाया only when a story is narrated',
    kind: 'deterministic', side: 'both', severity: 'fix', confidence: 'high',
    precedent: [
      { seed: 527, before: 'मुझे किसने सुनाई', after: 'मुझे किसने बताया', note: '"मुझे किसने सुनाई is fine as long as it concerns a story. But, otherwise, it would in general mean मुझे किसने बताया।"' },
      { seed: 569, before: 'क्या आपने फ़ैसला कर लिया है कि मुझे किसने सुनाई?', after: 'क्या आपने फ़ैसला कर लिया है कि मुझे किसने बताया?' },
      { seed: 601, before: 'हम बात कर रहे थे कि मुझे किसने सुनाई।', after: 'हम बात कर रहे थे कि मुझे किसने बताया।' },
    ],
    note: 'Mechanical only for the exact form she corrected (किसने सुनाई with no story in the English).',
    check: (row) => {
      const e = eng(row); const h = hin(row);
      if (!/\btold\b/.test(e) || /\bstory\b/.test(e)) return [];
      if (/किसने सुनाई/.test(h)) return [{ message: '"told" rendered as सुनाई with no story in the English', proposed: { known: h.replace(/किसने सुनाई/g, 'किसने बताया') } }];
      if (/सुना(ई|या)/.test(h)) return [{ message: '"told" rendered as सुनाई/सुनाया with no story in the English (→ बताया/बताई)', proposed: null }];
      return [];
    },
  },
  {
    id: 'H-SAME-TIME', title: '"at the same time" is साथ के साथ; एक साथ is "together"',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 62, before: 'मुझे यक़ीन नहीं है कि मैं एक साथ आपकी मदद कर सकता हूँ या नहीं।', after: 'मुझे यक़ीन नहीं है कि मैं साथ के साथ आपकी मदद कर सकता हूँ या नहीं।', note: '"एक साथ is more like together, whereas साथ के साथ is nearer to simultaneously or at the same time." Asked twice; the agent refused once and then applied it.' },
      { seed: 63, before: null, after: 'क्या आपको सच में साथ के साथ मेरी मदद करने में कोई आपत्ति नहीं है? → are you sure you don\'t mind helping me at the same time?' },
    ],
    note: null,
    check: (row) => {
      const e = eng(row); const h = hin(row); const out = [];
      if (/at the same time/.test(e) && /एक साथ/.test(h)) out.push({ message: '"at the same time" rendered as एक साथ (together); she ruled साथ के साथ', proposed: { known: h.replace(/एक साथ/g, 'साथ के साथ') } });
      if (/\btogether\b/.test(e) && /साथ के साथ/.test(h)) out.push({ message: '"together" rendered as साथ के साथ (at the same time); she ruled एक साथ', proposed: null });
      return out;
    },
  },
  {
    id: 'H-ANYTHING', title: '"anything" is कुछ (कुछ नहीं with don\'t/doesn\'t); "something" is कुछ, not कुछ भी',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'medium',
    precedent: [
      { seed: 35, before: 'कुछ भी', after: 'कुछ', note: '"anything means कुछ in Hindi. For the negative कुछ नहीं, we need to add doesn\'t/don\'t. Like, doesn\'t/don\'t...anything."' },
      { seed: 35, before: null, after: 'वह कुछ नहीं पढ़ना चाहती → she doesn\'t want to read anything' },
    ],
    note: 'Ambiguity stated: the redo agent could not apply the bare LEGO कुछ → anything because seed 4 teaches कुछ → something (ZUT). Her negative form (कुछ नहीं … doesn\'t … anything) stands. Flag only.',
    check: (row) => {
      const e = eng(row); const h = hin(row); const out = [];
      if (/\banything\b/.test(e) && !/कुछ/.test(h)) out.push({ message: '"anything" with no कुछ on the Hindi side', proposed: null });
      if (/\bsomething\b/.test(e) && /कुछ भी/.test(h)) out.push({ message: '"something" rendered as कुछ भी (her कुछ)', proposed: null });
      return out;
    },
  },
  {
    id: 'H-EMBEDDED-TENSE', title: 'An embedded clause keeps the tense of its main clause ("what she is doing" after a present main clause)',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 375, before: 'मुझे नहीं पता वह क्या कर रही है। → I don\'t know what she was doing', after: '… → I don\'t know what she is doing', note: '"the what she was doing part needs to be changed to what she is doing, because the first parts of these sentences are in the present tense."' },
      { seed: 201, before: 'क्या होने वाला है → what was going to happen', after: 'क्या होने वाला है → what is going to happen' },
      { seed: 213, before: 'हमें नहीं पता कि क्या होने वाला है। → we don\'t know what was going to happen', after: '… → we don\'t know what is going to happen' },
    ],
    note: null,
    check: (row) => {
      const e = eng(row); const h = hin(row);
      const out = [];
      if (/\b(was|were) (going to|[a-z]+ing)\b/.test(e) && /(रह(ा|ी|े) (है|हैं)|वाल(ा|ी|े) (है|हैं))/.test(h) && !/(था|थी|थे)/.test(h)) {
        out.push({ message: 'English past ("was/were …") against a present Hindi clause — she moved the English to present (375, 201, 213)', proposed: null });
      }
      return out;
    },
  },
  {
    id: 'H-OBLIQUE-PLURAL', title: 'A plural noun before का/को/से/में/पर takes the oblique (तथ्यों का, जवाबों का, अंडों का)',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 311, before: 'मैं तीन सबसे अहम तथ्यों जानना चाहता हूँ।', after: 'मैं तीन सबसे अहम तथ्य जानना चाहता हूँ।', note: '"तथ्य remains identical in both singular and plural forms, except when the noun is followed by a postposition or case marker (ने, को, से, में, पर, की). In that case … तथ्यों"' },
      { seed: 331, before: null, after: 'मुझे सभी जवाबों का पता लगाना है। → I have to find out all the answers ("because here, जवाब is followed by का")' },
      { seed: 586, before: null, after: 'मैं बीस उबले अंडों का इंतज़ार कर रहा हूँ। ("because, here, it\'s followed by का")' },
      { seed: 633, before: null, after: 'मैं पानी के एक बड़े गिलास का इंतज़ार कर रहा हूँ। ("का इंतज़ार changes the direct case to oblique")' },
    ],
    note: 'Deterministic for the nouns she ruled on; other nouns are a judged check.',
    check: (row) => {
      const e = eng(row); const h = hin(row); const out = [];
      const pairs = [
        [/\bfacts\b/, /तथ्य (का|की|के|को|से|में|पर|ने)/, 'तथ्य + postposition → तथ्यों'],
        [/\banswers\b/, /जवाब (का|की|के|को|से|में|पर|ने)/, 'जवाब + postposition → जवाबों'],
        [/\beggs\b/, /अंडे (का|की|के|को|से|में|पर|ने)/, 'अंडे + postposition → अंडों'],
        [/\bglass of water\b/, /पानी का एक बड़ा गिलास का/, 'पानी का एक बड़ा गिलास का → पानी के एक बड़े गिलास का'],
      ];
      for (const [er, hr, msg] of pairs) if (er.test(e) && hr.test(h)) out.push({ message: msg, proposed: null });
      // oblique used with NO postposition (her seed-311 correction, the other direction)
      if (/तथ्यों(?! (का|की|के|को|से|में|पर|ने))/.test(h)) out.push({ message: 'तथ्यों without a following postposition → तथ्य (seed 311)', proposed: { known: h.replace(/तथ्यों(?! (का|की|के|को|से|में|पर|ने))/g, 'तथ्य') } });
      return out;
    },
  },
  {
    id: 'H-FEM-AGREEMENT', title: 'Feminine nouns take feminine verb agreement (कहानी बताई, कॉफ़ी अच्छी रहेगी)',
    kind: 'deterministic', side: 'hindi', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 464, before: 'मैंने उसे कहानी बताया था।', after: 'मैंने उसे कहानी बताई थी। ("because कहानी in Hindi is feminine gender")' },
      { seed: 633, before: 'एक कप चाय या कॉफ़ी अच्छा रहेगा।', after: 'एक कप चाय या कॉफ़ी अच्छी रहेगी। ("because the nearest subject कॉफ़ी is feminine gender")' },
    ],
    note: 'Lexicon limited to feminine nouns she or the course use as objects; a masculine perfective right after one is flagged.',
    check: (row) => {
      const h = hin(row); const out = [];
      const fem = '(कहानी|किताब|कॉफ़ी|कॉफी|चाय|गाड़ी|कार|चीज़|बात|कोशिश|मदद|फ़िल्म|ईमेल|ड्रेस|कक्षा|राशि|संख्या)';
      const re = new RegExp(fem + ' (बताया|सुनाया|पढ़ा|लिखा|देखा|किया|ख़रीदा|खरीदा|बनाया|भेजा|ख़त्म किया|पूरा किया|दिया)( था| है)?(?=[।?!\\s]|$)');
      const m = re.exec(h);
      if (m) out.push({ message: `feminine noun ${m[1]} with masculine perfective ${m[2]}`, proposed: null });
      if (/कॉफ़ी अच्छा रहेगा|चाय अच्छा रहेगा/.test(h)) out.push({ message: 'nearest subject feminine → अच्छी रहेगी (seed 633)', proposed: { known: h.replace(/अच्छा रहेगा/g, 'अच्छी रहेगी') } });
      return out;
    },
  },
  {
    id: 'H-THAT-IS-WHY', title: '"that isn\'t why" is इसलिए नहीं; "that is why" is इसीलिए',
    kind: 'deterministic', side: 'both', severity: 'fix', confidence: 'high',
    precedent: [
      { seed: 127, before: 'इसीलिए नहीं → that isn\'t why', after: 'इसलिए नहीं → that isn\'t why' },
      { seed: 128, before: null, after: 'इसीलिए आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था। → that is why you\'re like someone I used to know' },
      { seed: 146, before: null, after: 'इसीलिए हमने इसे ठीक करने की कोशिश की। → that is why we tried to fix it' },
    ],
    note: null,
    check: (row) => {
      const e = eng(row); const h = hin(row); const out = [];
      if (/that isn't why|that is not why/.test(e) && /इसीलिए नहीं/.test(h)) out.push({ message: 'इसीलिए नहीं → इसलिए नहीं (seed 127)', proposed: { known: h.replace(/इसीलिए नहीं/g, 'इसलिए नहीं') } });
      if (/\bthat is why\b|\bthat's why\b/.test(e) && /(^|\s)इसलिए(\s|$)/.test(h) && !/इसलिए नहीं/.test(h)) out.push({ message: '"that is why" rendered as इसलिए; she writes इसीलिए (128, 146)', proposed: { known: h.replace(/(^|\s)इसलिए(\s|$)/g, '$1इसीलिए$2') } });
      return out;
    },
  },
  {
    id: 'H-USED-TO-ALWAYS', title: 'हमेशा only where the English says "always" ("used to insist" ≠ हमेशा ज़ोर देती थी)',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 587, before: 'वह हमेशा ज़ोर देती थी कि → she used to insist that', after: 'either हमेशा removed from the Hindi OR "always" added after "used to"' }],
    note: 'Either side may move; that choice is Kai\'s, so flag.',
    check: (row) => (/हमेशा/.test(hin(row)) && !/\balways\b/.test(eng(row))) ? [{ message: 'हमेशा on the Hindi side with no "always" in the English', proposed: null }] : [],
  },
  {
    id: 'H-KOI-KISI', title: '"somewhere warmer" as an object is कोई ज़्यादा गर्म जगह, not किसी',
    kind: 'deterministic', side: 'hindi', severity: 'fix', confidence: 'high',
    precedent: [
      { seed: 578, before: 'किसी ज़्यादा गर्म जगह', after: 'कोई ज़्यादा गर्म जगह', note: '"the context of the sentences requires किसी ज़्यादा गर्म जगह to be replaced by कोई ज़्यादा गर्म जगह"' },
      { seed: 623, before: null, after: 'क्या आप कोई ज़्यादा गर्म जगह लेना चाहेंगे? → do you want somewhere warmer?' },
    ],
    note: 'Mechanical for this phrase only.',
    check: (row) => /किसी ज़्यादा गर्म जगह(?! (से|में|पर|को|का|की|के))/.test(hin(row)) ? [{ message: 'किसी ज़्यादा गर्म जगह → कोई ज़्यादा गर्म जगह (578)', proposed: { known: hin(row).replace(/किसी ज़्यादा गर्म जगह(?! (से|में|पर|को|का|की|के))/g, 'कोई ज़्यादा गर्म जगह') } }] : [],
  },
  {
    id: 'H-MOVE-HEAD', title: '"move my head" alone is अपना सिर हिलाता हूँ',
    kind: 'deterministic', side: 'both', severity: 'fix', confidence: 'high',
    precedent: [{ seed: 513, before: 'अपना सिर करता हूँ', after: 'अपना सिर हिलाता हूँ', note: '"अपना सिर ऊपर-नीचे करता हूँ is fine for move my head up and down, अपना सिर करता हूँ should be replaced by अपना सिर हिलाता हूँ when it\'s just when I move my head."' }],
    note: null,
    check: (row) => (/सिर करत(ा|ी) हूँ/.test(hin(row)) && !/ऊपर-नीचे/.test(hin(row))) ? [{ message: 'सिर करता हूँ → सिर हिलाता हूँ (513)', proposed: { known: hin(row).replace(/सिर करत(ा|ी) हूँ/g, 'सिर हिलात$1 हूँ') } }] : [],
  },
  {
    id: 'H-NOT-SURE', title: '"I\'m not sure" is मुझे यक़ीन नहीं है (never पक्का / मुझे नहीं लगता)',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 11, before: null, after: 'L1 USE मुझे यक़ीन नहीं है', note: 'she re-typed this line for seeds 11, 12, 13, 16, 17, 18, 19, 20, 21' },
      { seed: 62, before: null, after: 'मुझे यक़ीन नहीं है कि मैं साथ के साथ आपकी मदद कर सकता हूँ या नहीं। → I\'m not sure if I can help you at the same time.' },
    ],
    note: 'Phase 1 drifted to मुझे नहीं लगता / पक्का नहीं (d/4bc3061d §g); the 2 Sept decision and her own Phase 2 lines keep यक़ीन नहीं है so that "I\'m not sure", "I don\'t think" and "I\'m not convinced" stay three cues.',
    check: (row) => {
      const e = eng(row); const h = hin(row);
      if (!/i'm not sure|i am not sure/.test(e)) return [];
      if (/यक़ीन नहीं|यकीन नहीं/.test(h)) return [];
      return [{ message: '"I\'m not sure" without मुझे यक़ीन नहीं है', proposed: null }];
    },
  },
  {
    id: 'H-FRAMES', title: 'Her frame lexicon: the English frame and its Hindi form travel together',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'medium',
    precedent: [
      { seed: 114, before: null, after: 'मुझे लग रहा है कि अब जाने का समय है। → I feel as if it\'s time to go' },
      { seed: 125, before: null, after: 'मेरा मानना है कि अब जाने का समय है। → I believe that it\'s time to go' },
      { seed: 132, before: null, after: 'मुझे हैरानी है कि … → I\'m surprised …' },
      { seed: 139, before: null, after: 'मुझे अफ़सोस है कि अब जाने का समय है। → I\'m sorry that it\'s time to go' },
      { seed: 146, before: null, after: 'इससे कोई फ़र्क़ नहीं पड़ता / दुर्भाग्य से / मुझे लगता है / आप समझ रहे हैं' },
      { seed: 290, before: 'मुझे आश्चर्य है कि क्या', after: 'पता नहीं उसे जवाब पता है या नहीं। → I wonder if he knows the answer' },
      { seed: 526, before: null, after: 'मुझे विश्वास नहीं हो रहा कि … → I\'m finding it hard to believe that …' },
      { seed: 296, before: null, after: 'मुझे चिंता है कि … → I\'m worried that …' },
      { seed: 94, before: null, after: 'यह कारगर होगा → it will work' },
      { seed: 64, before: null, after: 'मज़ेदार लगता है → it is fun' },
      { seed: 545, before: null, after: 'इंतज़ार करने की बारी आपकी है। → it\'s your turn to wait' },
      { seed: 599, before: null, after: 'मुझे इंतज़ार करने में ख़ुशी होती। → I\'d have been happy to wait' },
    ],
    note: 'Consistency, not grammar: where the English carries one of her frames, the Hindi should carry the form she wrote for it. A miss is a question for Kai, never an automatic edit.',
    check: (row) => {
      const e = eng(row); const h = hin(row); const out = [];
      const FR = [
        [/\bi feel as if\b/, /लग रहा है/, 'I feel as if → मुझे लग रहा है (114, 129)'],
        [/\bi believe\b/, /मानना है/, 'I believe → मेरा मानना है (125, 129)'],
        [/\bi'm surprised\b/, /हैरानी/, 'I\'m surprised → मुझे हैरानी है (132, 146)'],
        [/\bi'm sorry\b/, /अफ़सोस|अफसोस|माफ़/, 'I\'m sorry → मुझे अफ़सोस है (139, 146)'],
        [/\bunfortunately\b/, /दुर्भाग्य से/, 'unfortunately → दुर्भाग्य से (132, 296)'],
        [/\bi'm afraid\b/, /डर है/, 'I\'m afraid → मुझे डर है (201)'],
        [/\bi'm worried\b/, /चिंता/, 'I\'m worried → मुझे चिंता है (296)'],
        [/\bi hope\b/, /उम्मीद/, 'I hope → मुझे उम्मीद है (149)'],
        [/\bi suspect\b/, /शक/, 'I suspect → मुझे शक है (597)'],
        [/\bit doesn't matter\b/, /फ़र्क़ नहीं पड़ता|फर्क नहीं पड़ता/, 'it doesn\'t matter → इससे कोई फ़र्क़ नहीं पड़ता (600, 606)'],
        [/\bi wonder if\b/, /पता नहीं .*या नहीं/, 'I wonder if → पता नहीं … या नहीं (290)'],
        [/\bfaintest idea\b/, /बिल्कुल भी अंदाज़ा नहीं/, 'the faintest idea → बिल्कुल भी अंदाज़ा नहीं (266, 375)'],
        [/\bfinding it hard to believe\b/, /विश्वास नहीं हो रहा/, 'I\'m finding it hard to believe → मुझे विश्वास नहीं हो रहा (526)'],
        [/\bit will work\b/, /कारगर/, 'it will work → कारगर होगा (94, 97, 102)'],
        [/\btime to go\b/, /जाने का समय/, 'it\'s time to go → अब जाने का समय है (114–139)'],
        [/\bit's your turn to\b/, /बारी आपकी है/, 'it\'s your turn to → … की बारी आपकी है (545, 555, 611, 615)'],
        [/\bi'd have been happy to\b/, /ख़ुशी होती|खुशी होती/, 'I\'d have been happy to → … में ख़ुशी होती (599, 611)'],
        [/\bit's a good idea to\b/, /अच्छा विचार है/, 'it\'s a good idea to → … अच्छा विचार है (541, 611, 615)'],
        [/\bat the same time\b/, /साथ के साथ/, 'at the same time → साथ के साथ (62)'],
        [/\blater on\b/, /बाद में/, 'later on → बाद में (16)'],
        [/\bit's like this\b/, /बात (यह|ऐसी) है/, 'it\'s like this → बात यह है कि (49)'],
        [/\bthat is why\b/, /इसीलिए/, 'that is why → इसीलिए (128, 132, 146)'],
        [/\bfun\b/, /मज़ेदार|मजेदार/, 'fun → मज़ेदार (64, 111, 133)'],
      ];
      for (const [er, hr, msg] of FR) if (er.test(e) && !hr.test(h)) out.push({ message: `frame: ${msg}`, proposed: null });
      return out;
    },
  },
  // ---------------------------------------------------------------------------------------------
  // English-side rules — Phase 2, mostly after seed 380, where her notes switch to prose instructions
  // about the English. These are about what the Hindi MEANS, per her wording.
  // ---------------------------------------------------------------------------------------------
  {
    id: 'E-TOO-LATE', title: '"too late", not "so late"',
    kind: 'deterministic', side: 'english', severity: 'fix', confidence: 'high',
    precedent: [{ seed: 558, before: 'so late', after: 'too late', note: '"In the English sentences, using too late would be better instead of so late."' }],
    note: null,
    check: (row) => /\bso late\b/.test(eng(row)) ? [{ message: '"so late" → "too late" (558)', proposed: { target: (row.target || '').replace(/\bso late\b/gi, 'too late') } }] : [],
  },
  {
    id: 'E-EXPLAIN-TO', title: '"explain … to you", not "with you"',
    kind: 'deterministic', side: 'english', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 8, before: 'I want to explain in English with you', after: 'I want to explain in English to you', note: 'the redo agent could not apply it: "to you" was not yet taught at seed 8' }],
    note: 'Flag, not fix: the taught-vocabulary gate decides whether "to you" is available at that seed.',
    check: (row) => /\bexplain\b.*\bwith (you|me|him|her|us|them)\b/.test(eng(row)) ? [{ message: '"explain … with X" → "explain … to X" (8)', proposed: null }] : [],
  },
  {
    id: 'E-BECOMES-INTERESTING', title: 'दिलचस्प हो जाता है is "it becomes interesting", not "it\'s interesting"',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 58, before: 'यह दिलचस्प हो जाता है → it\'s interesting', after: '→ it becomes interesting', note: '"the expression It\'s interesting is not always correct when compared to its Hindi translation. I would suggest to replace it with it becomes interesting."' }],
    note: 'The redo agent found five later seeds still glossing the old way and stopped at the seed boundary; those are in scope here.',
    check: (row) => (/दिलचस्प हो जात/.test(hin(row)) && /\bit's interesting\b|\bit is interesting\b/.test(eng(row))) ? [{ message: 'दिलचस्प हो जाता है glossed "it\'s interesting" → "it becomes interesting" (58)', proposed: { target: (row.target || '').replace(/\bit's interesting\b/gi, 'it becomes interesting').replace(/\bit is interesting\b/gi, 'it becomes interesting') } }] : [],
  },
  {
    id: 'E-READY-NOW', title: 'मैं तैयार हूँ is "I\'m ready"; मुझे देर हो गई is "I\'m late"',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 505, before: 'I\'ll be ready / I\'m going to be late', after: 'I\'m ready / I\'m late', note: '"Please change I\'ll be ready to I\'m ready, and I\'m going to be late to I\'m late in all instances."' }],
    note: 'Scoped to the Hindi present forms; a Hindi future (तैयार हो जाऊँगा, देर हो जाएगी) keeps its English future.',
    check: (row) => {
      const e = eng(row); const h = hin(row); const out = [];
      if (/\bi'll be ready\b/.test(e) && /तैयार हूँ/.test(h)) out.push({ message: 'मैं तैयार हूँ glossed "I\'ll be ready" → "I\'m ready" (505)', proposed: null });
      if (/\bi'm going to be late\b/.test(e) && /देर हो (गई|गयी) है|देर हो गई/.test(h) && !/जाएगी|जाऊँगा/.test(h)) out.push({ message: 'मुझे देर हो गई glossed "I\'m going to be late" → "I\'m late" (505)', proposed: null });
      return out;
    },
  },
  {
    id: 'E-THAT-IT-WOULD', title: 'कि यह … होगा is "that it would be …", the "it" is not dropped',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 571, before: 'कि यह बहुत अच्छा विचार होगा → that would be a very good idea', after: '→ that it would be a very good idea' }],
    note: null,
    check: (row) => (/कि यह .*होगा/.test(hin(row)) && /\bthat would be\b/.test(eng(row))) ? [{ message: 'कि यह … होगा glossed "that would be" → "that it would be" (571)', proposed: { target: (row.target || '').replace(/\bthat would be\b/gi, 'that it would be') } }] : [],
  },
  {
    id: 'E-SEEM-IT', title: '"I don\'t want IT to seem as though …" when the subordinate subject is not I',
    kind: 'deterministic', side: 'english', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 538, before: 'I don\'t want to seem as though he\'s happy', after: 'I don\'t want it to seem as though he\'s happy', note: '"when the subject of the subordinate clause is anything other than the speaker, an it would be required in the main clause"' }],
    note: null,
    check: (row) => /\bwant to seem as though (he|she|it|they|you|we)\b/.test(eng(row)) ? [{ message: '"want to seem as though <not I>" → "want it to seem as though" (538)', proposed: { target: (row.target || '').replace(/\bwant to seem as though\b/gi, 'want it to seem as though') } }] : [],
  },
  {
    id: 'E-LONG-TIME-SINCE', title: '"it\'s a long time" — "since" only with a reference point',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'medium',
    precedent: [{ seed: 619, before: 'it\'s a long time since', after: 'बहुत समय हो गया → it\'s a long time ("adding since would require a reference point")' }],
    note: 'Flag: whether the reference point is present is a reading, not a pattern.',
    check: (row) => (/^बहुत (लंबा )?समय हो गया[।]?$/.test(hin(row).trim()) && /\bsince\b/.test(eng(row))) ? [{ message: 'bare बहुत समय हो गया glossed with "since" (619)', proposed: null }] : [],
  },
  {
    id: 'E-WHEN-WE-MEET', title: 'हमारे मिलने पर is "when we meet" — the English needs the "when"',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 568, before: 'हमारे मिलने पर मुझे देर हो जाएगी। → I\'m going to be late', after: '→ I\'m going to be late when we meet ("Since the above English sentences do not mention next time, we need to add when.")' }],
    note: null,
    check: (row) => (row.role !== 'component' && /मिलने पर/.test(hin(row)) && !/\bwhen we meet\b|\bnext time\b|\bwhen (i|you|they|he|she) meet/.test(eng(row))) ? [{ message: 'हमारे मिलने पर with no "when we meet" in the English (568)', proposed: null }] : [],
  },
  {
    id: 'E-MONEY', title: 'राशि / पैसे must be said in the English ("as much money as possible")',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 437, before: 'as much as possible', after: 'as much money as possible', note: '"the reader may not understand what is being raised – whether it\'s money for charity, or a toast or the blinds"' }],
    note: null,
    check: (row) => (/(राशि|पैसे|पैसा)/.test(hin(row)) && /\bas much as possible\b/.test(eng(row)) && !/\bmoney\b/.test(eng(row))) ? [{ message: '"as much as possible" with राशि/पैसे → "as much money as possible" (437)', proposed: { target: (row.target || '').replace(/\bas much as possible\b/gi, 'as much money as possible') } }] : [],
  },
  {
    id: 'E-THOSE', title: 'उन / वे लोग and "those": the two sides agree on definiteness',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'low',
    precedent: [
      { seed: 434, before: 'उन छात्रों → students', after: 'either remove उन from the Hindi OR "those students" ("I would prefer उन to be removed from Hindi")' },
      { seed: 500, before: 'दो लड़कियों → the two girls', after: 'उन दोनों लड़कियों OR "two girls"' },
      { seed: 288, before: 'वे लोग … → people like watching television', after: '→ those people like watching television' },
      { seed: 286, before: 'क्या आप वे लोग जानते हैं', after: 'क्या आप उन लोगों को जानते हैं → do you know people? (no "those")' },
    ],
    note: 'AMBIGUOUS, stated: at 286 she kept "people" for उन लोगों; at 288 she added "those" for वे लोग; at 434 she preferred dropping उन. Flag only; Kai decides per line.',
    check: (row) => {
      const e = eng(row); const h = hin(row); const out = [];
      // उन लोगों is excluded: at seed 286 she wrote it six times against plain "people".
      if (/(^|\s)(उन|वे) (छात्रों|छात्र|लोग(?![ों])|दोनों)/.test(h) && !/\bthose\b|\bthe two\b|\bthem\b|\bthey\b/.test(e)) out.push({ message: 'उन/वे + noun with no "those" on the English side (434/288 vs 286 — her call was per line)', proposed: null });
      return out;
    },
  },
  {
    id: 'E-SUCH-A-SHOP', title: '"such a shop" where the Hindi is ऐसी दुकान',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [{ seed: 461, before: 'a shop', after: 'such a shop', note: '"In other sentences of this seed a shop is later clarified by what kind of shop except in L1."' }],
    note: null,
    check: (row) => (/ऐसी (कोई )?दुकान/.test(hin(row)) && /\ba shop\b/.test(eng(row)) && !/\bsuch a shop\b/.test(eng(row))) ? [{ message: 'ऐसी दुकान glossed "a shop" → "such a shop" (461)', proposed: { target: (row.target || '').replace(/\ba shop\b/gi, 'such a shop') } }] : [],
  },
  {
    id: 'E-ASK-IT', title: 'यह पूछने … needs "ask it" (or the यह goes)',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'medium',
    precedent: [{ seed: 420, before: 'यह … पूछने → … ask', after: 'either add "it" after "ask" in all the English sentences OR remove यह from all Hindi sentences' }],
    note: 'Either side may move; Kai\'s call.',
    check: (row) => (/यह (नहीं )?पूछ/.test(hin(row)) && /\bask\b(?! (it|me|you|him|her|them|us|yourself|if|whether|what|who|where|when|how|why|for))/.test(eng(row))) ? [{ message: 'यह पूछ… with a bare "ask" in the English (420)', proposed: null }] : [],
  },
  {
    id: 'E-SO-WELL', title: '"so well" / "very well": इतना अच्छा vs बहुत अच्छा',
    kind: 'deterministic', side: 'both', severity: 'flag', confidence: 'medium',
    precedent: [{ seed: 129, before: 'आप इतना अच्छा कर रहे हैं → you\'re doing so well', after: 'आप बहुत अच्छा कर रहे हैं → you\'re doing so well', note: 'she moved the Hindi to बहुत अच्छा and kept "so well"; the redo agent objected that बहुत अच्छा is the course\'s "very well" (149, 642)' }],
    note: 'AMBIGUOUS, stated: her Hindi and the course\'s ZUT pull apart here. Flag only.',
    check: (row) => (/इतना अच्छा/.test(hin(row)) && /\bso well\b/.test(eng(row))) ? [{ message: 'इतना अच्छा for "so well": she rewrote it as बहुत अच्छा (129) — but बहुत अच्छा is "very well" elsewhere', proposed: null }] : [],
  },
  // ---------------------------------------------------------------------------------------------
  // Judged rules — a model reads the row against her precedents. Never auto-applied.
  // ---------------------------------------------------------------------------------------------
  {
    id: 'J-CALQUE', title: 'The Hindi is Hindi, not the English in Hindi words (word order, postposition, case)',
    kind: 'judged', side: 'hindi', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 18, before: 'मैं आज आपके साथ मिलना चाहता हूँ।', after: 'मैं आज आपसे मिलना चाहता हूँ। → I want to meet with you today' },
      { seed: 78, before: 'मैं आपने जो कहा वह जानना चाहता हूँ।', after: 'आपने जो कहा मैं वह जानना चाहता हूँ। → I want to find out what you said' },
      { seed: 122, before: 'मुझे लग रहा है कि यह कम रोमांचक है, उससे जो वह कह रही थी।', after: 'मुझे लग रहा है कि यह उससे कम रोमांचक है जो वह कह रही थी।' },
      { seed: 457, before: 'मुझे नहीं पता अलग-अलग क्षेत्रों की संख्या।', after: 'मुझे अलग-अलग क्षेत्रों की संख्या नहीं पता।' },
      { seed: 237, before: 'वह आज चाहता था कि मैं आपको जवाब बता दूँ।', after: 'वह चाहता था कि मैं आज आपको जवाब बता दूँ। → he wanted me to tell you the answer today' },
      { seed: 55, before: 'जब मुझे नींद नहीं आई तो मैं थोड़ा थका हुआ हूँ।', after: 'मैं थोड़ा थका हुआ हूँ क्योंकि मुझे नींद नहीं आई। → I\'m a little tired because I didn\'t sleep ("awkward both in English and Hindi")' },
    ],
    note: 'Two thirds of her September corrections (readout d/539e6c98 §2A). Kai\'s 19 Aug relay: "so literal to the English that it\'s hard to understand". Her rule from Phase 1: fronted subordinate clause, correlative जो…वह / अगर…तो, the time adverb after the subject, the postposition the verb takes (मिलना + से).',
    check: null,
  },
  {
    id: 'J-JO-KYA', title: 'Embedded "what": क्या when it is a question word inside the clause, जो when it means "that which"',
    kind: 'judged', side: 'hindi', severity: 'flag', confidence: 'medium',
    precedent: [
      { seed: 384, before: 'जो', after: 'क्या', note: '"in all the sentences of L2 जो needs to be replaced by क्या because what here is a direct question word embedded in a dependent clause"' },
      { seed: 663, before: null, after: 'मुझे यकीन नहीं है कि आप सबने क्या कहा। / मुझे वह नहीं पता जो आप सबने कहा। ("The Hindi word for what … may change depending on whether it\'s the interrogative what or whether it means whatever")' },
    ],
    note: 'Her own seed-663 lines use both; the choice is a reading of the clause.',
    check: null,
  },
  {
    id: 'J-NONSENSE', title: 'A line that makes no sense in either language is removed, not repaired',
    kind: 'judged', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 33, before: 'how long have you been learning quickly', after: '(removed) "This phrase makes no sense, neither in Hindi nor in English"' },
      { seed: 145, before: 'why are you not happy any more all day?', after: '(removed)' },
      { seed: 206, before: 'I enjoy waiting this evening', after: '(removed) "This sentence does not make sense."' },
      { seed: 574, before: 'it hurts most for everyone', after: '(removed) "This sentence doesn\'t belong here, as it would translate to it hurts everyone the most."' },
    ],
    note: null,
    check: null,
  },
  {
    id: 'J-FIDELITY', title: 'The Hindi prompt still elicits exactly the taught English (one prompt → one answer)',
    kind: 'judged', side: 'both', severity: 'flag', confidence: 'high',
    precedent: [
      { seed: 597, before: 'मुझे लगता है उसने … सैकड़ों कहानियाँ सुनी हैं → I believe he\'s heard a hundred stories', after: '→ I believe he\'s heard hundreds of stories; "मुझे फिर से शक है कि → I suspect that again" — "either change the Hindi to मुझे शक है कि फिर से OR the English to I suspect again that"' },
      { seed: 594, before: 'क्या हमें अपने खिलौने मिल सकते हैं? → could we have my toys?', after: '"Please either change अपने to मेरे Or my to ours."' },
      { seed: 466, before: 'मैं दीवार पर किसी से मिला था। → I met someone over the wall', after: '"over the wall seems to mean literally on the wall; so the meaning in Hindi would change accordingly"' },
    ],
    note: 'The 2 Sept ruling (d/4bc3061d): many Hindi prompts reaching one English answer is fine; one Hindi prompt reaching two English answers is the defect. Her Phase-1 over-idiomatising was the risk; her Phase-2 notes police it themselves.',
    check: null,
  },
  {
    id: 'J-COPULA', title: 'The final है / था / थे / थी is written, not dropped',
    kind: 'judged', side: 'hindi', severity: 'flag', confidence: 'medium',
    precedent: [
      { seed: 63, before: '…कोई आपत्ति नहीं?', after: '…कोई आपत्ति नहीं है?' },
      { seed: 191, before: 'मुझे बिल्कुल आपत्ति नहीं।', after: 'मुझे बिल्कुल आपत्ति नहीं है।' },
      { seed: 464, before: 'मैंने उसे कहानी बताया', after: 'मैंने उसे कहानी बताई थी' },
    ],
    note: 'Phase 1 inference (25 copula restorations, 18 past-auxiliary restorations in 541 edits) — she never stated it as a rule, so judged, not mechanical.',
    check: null,
  },
  {
    id: 'J-REGISTER', title: 'Everyday Hindustani over Sanskritic — but meaning beats register',
    kind: 'judged', side: 'hindi', severity: 'flag', confidence: 'low',
    precedent: [
      { seed: 300, before: 'अमित्र', after: 'ग़ैर मिलनसार / बेरुखी' },
      { seed: 551, before: 'बदसूरत', after: 'भद्दा' },
      { seed: 390, before: 'प्रवेश द्वार', after: 'दरवाज़ा' },
      { seed: 414, before: 'लाल शराब', after: 'रेड वाइन' },
      { seed: 130, before: 'आश्चर्य', after: 'हैरानी' },
      { seed: 121, before: 'अजीब', after: 'असामान्य (the English is "unusual") — the counter-example: precision wins' },
    ],
    note: 'Phase 1 inference only (d/a3d97d1b §2b–c). RETRACTED by her own Phase-2 lines and therefore NOT rules: विचार करना (she wrote "विचार करना चाहिए" at seed 98), ज़रूरी→अहम (she wrote ज़रूरी है at 242), गाड़ी→कार (she wrote गाड़ी at 320), कृपया removed (she wrote कृपया six times at 414). Advisory only.',
    check: null,
  },
];

// ---------------------------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------------------------
function runDeterministic(row, opts = {}) {
  const hits = [];
  for (const rule of RULES) {
    if (rule.kind !== 'deterministic' || !rule.check) continue;
    if (opts.only && !opts.only.includes(rule.id)) continue;
    let res = [];
    try { res = rule.check(row) || []; } catch (e) { res = [{ message: `rule error: ${e.message}`, proposed: null }]; }
    for (const r of res) hits.push({ rule: rule.id, title: rule.title, severity: rule.severity, confidence: rule.confidence, side: rule.side, message: r.message, proposed: r.proposed || null, precedent: rule.precedent[0] });
  }
  return hits;
}

const judgedRules = () => RULES.filter(r => r.kind === 'judged');
const deterministicRules = () => RULES.filter(r => r.kind === 'deterministic');

module.exports = { RULES, runDeterministic, judgedRules, deterministicRules, NUKTA_PAIRS };
