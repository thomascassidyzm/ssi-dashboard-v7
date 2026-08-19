/**
 * known-distinctions.cjs — single source of truth for "the KNOWN language makes a
 * distinction the TARGET language does not, so one target answer needs more than
 * one known prompt."
 *
 * Shared by:
 *   - tools/check-known-distinction-coverage.cjs   (scan-course Check 19)
 *
 * THE CONCEPT (Shuchita, proofreader for eng_for_hin, 2026-08-19)
 * --------------------------------------------------------------
 * Hindi genders things English does not. A Hindi-speaking learner meets ONE
 * gendered Hindi prompt, learns an English answer, and has no way of knowing the
 * same English answer serves the other gender too — they reasonably assume it
 * belongs to the gender they saw. The remedy is to present BOTH gendered prompts
 * with the SAME English answer; the repetition is what teaches the equivalence.
 *
 * Gender in Hindi is ONE INSTANCE of the axis. The axis is:
 *   same target answer, multiple known-side prompts,
 *   wherever the learner's own language distinguishes what the target does not.
 * Formality tiers, number, inclusive/exclusive "we" and case are the same shape in
 * other languages. Add one by adding an entry to DISTINCTIONS — not by editing the
 * checker.
 *
 * NOTE THIS IS NOT ZUT'S PROBLEM, IT IS ITS MIRROR. ZUT forbids one known prompt
 * mapping to two target forms. This finds one target form reachable from two known
 * prompts and only one of them taught. Both can be true of a healthy course.
 *
 * PRECISION DOCTRINE — read before adding a form.
 * Keep the form table HIGH PRECISION and narrow. A distinction only belongs here if
 * the marked form agrees with the SPEAKER or the ADDRESSEE — the participants English
 * leaves unmarked. Hindi marks plenty of gender that is NOT speaker gender, and every
 * one of those is a false positive:
 *   - मुझे लगता है "I think" — लगता agrees with the thing thought, never the thinker.
 *     A woman also says मुझे लगता है. (617 rows in eng_for_hin. The single biggest trap.)
 *   - अगर मुझे पता होता "if I had known" — पता is a masculine noun; invariant.
 *   - मैंने शुरू किया "I started" — ergative: the perfective agrees with the OBJECT,
 *     so a woman also says मैंने शुरू किया. Every perfective transitive is out.
 *   - मुझे मिला "I got" — agrees with what was got.
 *   - मेरा / मेरी / आपका — agree with the possessed noun, not the possessor.
 *   - अच्छा / अच्छी — agree with whatever is being called good; गाड़ी अच्छी है is forced
 *     by गाड़ी being feminine, not by anyone's gender.
 * These lexemes are deliberately ABSENT from the tables below. Absence is the
 * mechanism: a form that is not listed is never swapped and never proposed.
 */

// Devanagari has no ASCII word boundary — JS \b silently never fires inside it.
// U+0964/U+0965 (danda, double danda) are EXCLUDED from the class: they are the
// sentence terminator, i.e. a boundary. Left in, चाहता हूँ। never matched and every
// full sentence in the course was silently skipped.
const DEVA = '\\u0900-\\u0963\\u0966-\\u097F';
const word = (s) => new RegExp(`(?<![${DEVA}])${s}(?![${DEVA}])`, 'gu');

/**
 * True when every swapped form can only be agreeing with the SPEAKER: either it is
 * directly followed by the 1st-person-singular copula हूँ / हूं (whose only possible
 * subject is मैं), or it is a -ऊँगा/-ऊँगी future, which is 1sg by its own morphology.
 * Used to waive third-person rejections on sentences that merely MENTION someone else.
 */
function speakerLocked(knownText, swapped) {
  if (!swapped || !swapped.length) return false;
  return swapped.every((s) => {
    if (s.class === 'future-1sg') return true;
    const re = new RegExp(`(?<![${DEVA}])${s.from}(?![${DEVA}])\\s+(हूँ|हूं)(?![${DEVA}])`, 'u');
    return re.test(knownText);
  });
}

/**
 * A distinction is keyed by KNOWN language. Each has:
 *   axis        what is distinguished (gender, formality, number, clusivity…)
 *   blindTargets target languages that do NOT make this distinction. A course whose
 *               target DOES make it is skipped — there the learner sees it anyway.
 *   sides       the names of the two poles, in table-column order
 *   classes     form tables. Each class may be one-directional when the reverse map
 *               is ambiguous (Hindi honorific feminine collapses two masculine forms).
 *   anchors     the phrase must show that a participant, not a third party, controls
 *               agreement. Without one the row is UNANCHORED, reported but not proposed.
 *   rejects     ordered rules that disqualify a row, each with an id so the rejected
 *               set is reportable with its reasoning instead of vanishing.
 */
const DISTINCTIONS = {
  hin: [
    {
      id: 'hin-participant-gender',
      axis: 'gender',
      label: 'Hindi marks speaker/addressee gender; English does not',
      knownLang: 'hin',
      blindTargets: ['eng'],
      sides: ['masculine', 'feminine'],
      classes: [
        {
          // Subject-agreeing participles, auxiliaries and predicate adjectives,
          // singular. Agreement here is with the grammatical subject, so an anchor
          // that makes the subject 1st/2nd person makes it participant gender.
          id: 'sg-subject-agreement',
          direction: 'both',
          forms: [
            ['चाहता', 'चाहती'], ['जानता', 'जानती'], ['सकता', 'सकती'],
            ['करता', 'करती'], ['रहा', 'रही'], ['था', 'थी'],
            ['बोलता', 'बोलती'], ['सीखता', 'सीखती'], ['समझता', 'समझती'],
            ['सोचता', 'सोचती'], ['पाता', 'पाती'], ['पढ़ता', 'पढ़ती'],
            ['सुनता', 'सुनती'], ['कहता', 'कहती'], ['खाता', 'खाती'],
            ['पीता', 'पीती'], ['देता', 'देती'], ['लेता', 'लेती'],
            ['जाता', 'जाती'], ['आता', 'आती'], ['रखता', 'रखती'],
            ['बनाता', 'बनाती'], ['भूलता', 'भूलती'], ['लिखता', 'लिखती'],
            ['गया', 'गई'], ['हुआ', 'हुई'], ['वाला', 'वाली'],
            ['थका', 'थकी'], ['भूखा', 'भूखी'], ['प्यासा', 'प्यासी'],
            ['अकेला', 'अकेली'], ['तैयार', 'तैयार'],
          ],
        },
        {
          // 1sg future. -ऊँगा / -ऊँगी is speaker gender with nothing else it could be.
          id: 'future-1sg',
          direction: 'both',
          // -ऊँगा / -ऊँगी IS the 1sg subject; the phrase needs no separate मैं to prove
          // whose gender is at stake.
          selfAnchoring: true,
          forms: [
            ['चाहूँगा', 'चाहूँगी'], ['पाऊँगा', 'पाऊँगी'], ['करूँगा', 'करूँगी'],
            ['जाऊँगा', 'जाऊँगी'], ['सकूँगा', 'सकूँगी'], ['रहूँगा', 'रहूँगी'],
            ['हूँगा', 'हूँगी'], ['बोलूँगा', 'बोलूँगी'], ['सीखूँगा', 'सीखूँगी'],
            ['दूँगा', 'दूँगी'], ['लूँगा', 'लूँगी'],
          ],
        },
        {
          // Honorific/plural agreement under आप / तुम. A woman addressed as आप takes
          // the feminine singular (आप चाहती हैं), so masculine -ते maps to -ती.
          // ONE-DIRECTIONAL: -ती maps back to both -ता (सg) and -ते (honorific), so we
          // never propose a masculine counterpart from this class — we would have to
          // guess which, and a guessed prompt is worse than a missed one.
          id: 'honorific-agreement',
          direction: 'toFeminine',
          forms: [
            ['चाहते', 'चाहती'], ['रहे', 'रही'], ['सकते', 'सकती'],
            ['करते', 'करती'], ['जानते', 'जानती'], ['बोलते', 'बोलती'],
            ['सीखते', 'सीखती'], ['समझते', 'समझती'], ['सोचते', 'सोचती'],
            ['जाते', 'जाती'], ['आते', 'आती'], ['थे', 'थीं'],
          ],
          requiresAnchor: 'addressee',
        },
      ],
      anchors: {
        // मैंने is deliberately NOT a speaker anchor — it is the ergative, and the
        // ergative is handled as a rejection, not an anchor.
        speaker: new RegExp(`(?<![${DEVA}])(मैं|हम|हूँ|हूं|हूँगा|हूँगी)(?![${DEVA}])`, 'u'),
        addressee: new RegExp(`(?<![${DEVA}])(आप|तुम|तू)(?![${DEVA}])`, 'u'),
      },
      rejects: [
        {
          id: 'target-marks-gender',
          why: 'the English answer already names the gender (he/she/his/her), so the '
            + 'two Hindi prompts do NOT share one answer — this is a real distinction, '
            + 'not a hidden one',
          test: ({ targetText }) => /\b(he|she|him|her|his|hers|himself|herself)\b/i.test(targetText),
        },
        {
          id: 'third-person-subject',
          why: 'agreement is controlled by a third party or a gendered noun, not by the '
            + 'speaker — the counterpart would be a different sentence, not a variant',
          // Waived when every swapped form is SPEAKER-LOCKED: a form directly followed by
          // the 1sg copula हूँ, or a -ऊँगा future, can have no subject but मैं, so a वह
          // elsewhere in the sentence is someone else's business.
          // मैं अपने दोस्त के बारे में बोलना चाहता हूँ is the speaker's gender however many
          // friends the sentence mentions.
          test: ({ knownText, swapped }) => !speakerLocked(knownText, swapped) && new RegExp(
            `(?<![${DEVA}])(वह|वो|वे|उस|उन|उसका|उसकी|यह|ये|इस|इन|`
            + `आदमी|औरत|लड़का|लड़की|बहन|भाई|माँ|पिता|बेटा|बेटी|पत्नी|पति|दोस्त)(?![${DEVA}])`, 'u',
          ).test(knownText),
        },
        {
          id: 'explicitly-gendered-address',
          why: 'the prompt names the gender of the person addressed (महोदया / महोदय), so '
            + 'its counterpart is a different sentence, not the same one said by someone else',
          test: ({ knownText }) => new RegExp(
            `(?<![${DEVA}])(महोदया|महोदय|मैडम|सर|बहनजी|भाईसाहब)(?![${DEVA}])`, 'u',
          ).test(knownText),
        },
        {
          id: 'reverse-direction-needs-speaker-lock',
          why: 'going feminine→masculine, -ती is ambiguous between singular -ता and '
            + 'honorific -ते, and a feminine auxiliary often belongs to a feminine NOUN '
            + '(बात की थी). We only propose a masculine counterpart when the form is '
            + 'locked to मैं — a guessed prompt is worse than a missed one',
          test: ({ knownText, swapped, side }) => side === 'feminine' && !speakerLocked(knownText, swapped),
        },
        {
          id: 'ambiguous-agreement-controller',
          why: 'an honorific -ते form sits after a plural/relative nominal, so it agrees '
            + 'with THAT noun and not with the addressee — लोगों से जो अंग्रेज़ी बोलते हैं '
            + 'stays बोलते however the listener is gendered',
          test: ({ knownText, swapped }) => {
            const honorific = swapped.filter((s) => s.class === 'honorific-agreement');
            if (!honorific.length) return false;
            const cue = new RegExp(
              `(?<![${DEVA}])(जो|जिस|जिन|जिन्हें|लोग|लोगों|बच्चे|बच्चों|दोस्तों|सब|दूसरे)(?![${DEVA}])`, 'gu',
            );
            const cues = [...knownText.matchAll(cue)].map((m) => m.index);
            if (!cues.length) return false;
            const first = Math.min(...cues);
            return honorific.some((s) => {
              const at = knownText.search(word(s.from));
              return at > first;
            });
          },
        },
        {
          id: 'ergative-perfective',
          why: 'ने marks the ergative; the perfective then agrees with the OBJECT, so '
            + 'the form is identical for a male and a female speaker',
          test: ({ knownText }) => new RegExp(`(?<![${DEVA}])ने(?![${DEVA}])`, 'u').test(knownText),
        },
      ],
    },
  ],
};

/** Every (form, side) pair a class can swap, as a flat lookup. */
function classMaps(cls) {
  const fwd = new Map(); // masculine -> feminine
  const rev = new Map(); // feminine -> masculine
  for (const [m, f] of cls.forms) {
    if (m === f) continue; // invariant form listed for documentation only
    fwd.set(m, f);
    if (!rev.has(f)) rev.set(f, m);
  }
  return { fwd, rev };
}

/**
 * Swap every marked token in `text` from `fromSide` to the other side.
 * Returns {text, swapped:[{from,to,class}]}. A phrase mixing an adjective and a
 * participle must swap BOTH or the proposal is half-wrong: थका हुआ हूँ has to become
 * थकी हुई हूँ, never थका हुई हूँ.
 */
function swapSide(text, distinction, fromSide) {
  let out = text;
  const swapped = [];
  for (const cls of distinction.classes) {
    if (cls.direction === 'toFeminine' && fromSide !== 'masculine') continue;
    if (cls.direction === 'toMasculine' && fromSide !== 'feminine') continue;
    const { fwd, rev } = classMaps(cls);
    const map = fromSide === 'masculine' ? fwd : rev;
    for (const [from, to] of map) {
      const re = word(from);
      if (!re.test(out)) continue;
      out = out.replace(word(from), to);
      swapped.push({ from, to, class: cls.id });
    }
  }
  return { text: out, swapped };
}

/** Which anchor kinds this text carries. */
function anchorsIn(text, distinction) {
  const found = [];
  for (const [kind, re] of Object.entries(distinction.anchors || {})) {
    if (re.test(text)) found.push(kind);
  }
  return found;
}

/** Normalised known-side key for counterpart lookup: trailing punctuation is not a prompt. */
function knownKey(text) {
  return (text || '').replace(/[।.!?॥]+\s*$/u, '').replace(/\s+/gu, ' ').trim();
}

/** Target answers are compared case- and punctuation-insensitively. */
function targetKey(text) {
  return (text || '').toLowerCase().replace(/[।.!?॥,]+/gu, '').replace(/\s+/gu, ' ').trim();
}

/** Distinctions that apply to a course, given its known and target languages. */
function distinctionsFor(knownLang, targetLang) {
  return (DISTINCTIONS[knownLang] || []).filter((d) => d.blindTargets.includes(targetLang));
}

module.exports = {
  DISTINCTIONS,
  distinctionsFor,
  swapSide,
  anchorsIn,
  knownKey,
  targetKey,
};
