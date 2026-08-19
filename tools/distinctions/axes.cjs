/**
 * axes.cjs — what each LANGUAGE grammatically marks, and (where we have earned one)
 * the morphology to swap it.
 *
 * Shared by:
 *   - tools/check-distinction-coverage.cjs   (scan-course Check 19)
 *
 * THE SUBJECT IS A PAIR, NOT A LANGUAGE, AND NEITHER SLOT IS ENGLISH.
 * A course pairs a KNOWN language with a TARGET language. Whenever one side marks a
 * distinction the other does not, the pair has a problem — but WHICH problem depends
 * on which side is richer, and the two have OPPOSITE remedies:
 *
 *   DIRECTION A — KNOWN RICHER. Several known-side prompts collapse onto one target
 *   answer. The learner meets one prompt, learns the answer, and has no way to know
 *   it also answers the others. REMEDY: TEACH THE COLLAPSE — same target answer,
 *   several known-side prompts, drilled. (Hindi known / English target: Hindi genders
 *   the speaker, English does not. Shuchita's case.)
 *
 *   DIRECTION B — TARGET RICHER. The learner must PRODUCE a distinction their own
 *   language does not make, with nothing in the prompt telling them which. REMEDY IS
 *   THE OPPOSITE: this is not a lesson, it is a potentially unanswerable card. The
 *   prompt needs disambiguating, or the card needs splitting. (English known /
 *   Spanish target: the learner must pick cansado or cansada.)
 *
 * A check that only knew Direction A would report every Direction B case as healthy,
 * which is worse than not having the check. Both are detected, labelled, and given
 * their own remedy in the output.
 *
 * DIRECTION B FINDINGS ARE NEVER ASSERTED AS DEFECTS. Deliberate ambiguity is
 * sometimes a teaching tool on this estate. They are candidates for a human.
 *
 * AND EVERY CANDIDATE PASSES THE REACH TEST (tools/distinctions/reach-test.cjs)
 * before it is offered as a drill. A technically-correct collapse the learner would
 * never reach for is a wall wearing a lesson's clothes.
 *
 * WHAT LIVES HERE
 *   LANGUAGES[lang].marks[axis]  does this language mark it in ordinary learner
 *                                sentences? This decides whether a check runs at all.
 *                                'full'     — we also have the morphology below, so
 *                                             Direction A can GENERATE the missing
 *                                             counterpart prompt.
 *                                'declared' — we know it marks it, we have no table.
 *                                             Direction detection and the
 *                                             observational detectors still work;
 *                                             nothing is generated.
 *   LANGUAGES[lang].paradigms    closed sets the learner holds as a group (he/she,
 *                                my/your). Used by the reach test.
 *   LANGUAGES[lang].morphology   full swap tables, anchors and rejection rules.
 *
 * ADDING A LANGUAGE IS AN ENTRY HERE, NOT A CHANGE TO THE CHECKER. The checker never
 * names a language or an axis.
 *
 * PRECISION DOCTRINE — read before adding morphology.
 * Keep swap tables HIGH PRECISION and narrow. A distinction only belongs in one if
 * the marked form agrees with the SPEAKER or the ADDRESSEE — the participants the
 * other language leaves unmarked. Hindi marks plenty of gender that is NOT speaker
 * gender, and every one of those is a false positive:
 *   - मुझे लगता है "I think" — लगता agrees with the thing thought, never the thinker.
 *     A woman also says मुझे लगता है. (617 rows in eng_for_hin. The biggest trap.)
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

/**
 * The axes. Each is a distinction some languages grammaticalise and others do not.
 * Gender is the one with morphology so far; the rest are declared, which is enough
 * to tell a pair which direction it is in and to label what a detector found.
 */
const AXES = {
  gender: {
    label: 'gender of the speaker or the person addressed',
    sides: ['masculine', 'feminine'],
  },
  formality: {
    label: 'formality / T-V distinction on "you"',
    sides: ['familiar', 'polite'],
  },
  number: {
    label: 'singular vs plural "you"',
    sides: ['singular', 'plural'],
    // OFF BY DEFAULT. English's one "you" covers both numbers, so a tú/vosotros split
    // does collapse — but it is an accepted, whole-estate feature rather than a defect.
    // Roughly 79 of the 283 asymmetric (course, axis) hits on this estate are this axis
    // alone, and firing on them would drown every other signal. Pass includeDisabled to
    // see them anyway.
    enabledByDefault: false,
  },
  clusivity: {
    label: 'inclusive vs exclusive "we"',
    sides: ['inclusive', 'exclusive'],
  },
};

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
/** Hindi participant gender — the one axis with morphology so far. */
const HIN_GENDER = {
      id: 'hin-participant-gender',
      axis: 'gender',
      label: 'Hindi marks the gender of the speaker and of the person addressed',
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
      // Forms that are in a swap table but must NOT swap in a particular collocation.
      // मुझे नहीं पता था is dative-experiencer: था agrees with पता, a masculine noun, so
      // "पता थी" is ungrammatical. The table lists था because मैं चाहता था needs it; the
      // guard is what stops it firing one clause later. (Adjudicated as a live false
      // positive by worker #258, row A21, 2026-08-19.)
      invariantAfter: [
        { form: 'था', after: ['पता'] },
        { form: 'थी', after: ['पता'] },
        { form: 'होता', after: ['पता'] },
      ],
      // Masculine predicate adjectives we do NOT swap (they usually agree with something
      // other than a participant) but which, left behind next to a swapped feminine verb,
      // produce mixed agreement: मैं अच्छा दिखना चाहती हूँ is ill-formed. Their presence
      // does not block the finding — it blocks the PROPOSAL, which is a different thing.
      // (Worker #258, row A29.)
      strandingRisk: ['अच्छा', 'बुरा', 'छोटा', 'बड़ा', 'नया', 'पूरा', 'तैयार', 'खाली', 'सीधा', 'पक्का'],
      anchors: {
        // मैंने is deliberately NOT a speaker anchor — it is the ergative, and the
        // ergative is handled as a rejection, not an anchor.
        speaker: new RegExp(`(?<![${DEVA}])(मैं|हम|हूँ|हूं|हूँगा|हूँगी)(?![${DEVA}])`, 'u'),
        addressee: new RegExp(`(?<![${DEVA}])(आप|तुम|तू)(?![${DEVA}])`, 'u'),
      },
      rejects: [
        {
          id: 'explicitly-gendered-address',
          why: 'the prompt names the gender of the person addressed (महोदया / महोदय), so '
            + 'its counterpart is a different sentence, not the same one said by someone else',
          test: ({ knownText }) => new RegExp(
            `(?<![${DEVA}])(महोदया|महोदय|मैडम|सर|बहनजी|भाईसाहब)(?![${DEVA}])`, 'u',
          ).test(knownText),
        },
        {
          // NOT an English rule. The cue regex comes from whichever language sits on the
          // OTHER side of the pair (LANGUAGES[lang].cues), so this works for hin→eng,
          // hin→kor or eng→hin without knowing which of them is English.
          id: 'other-side-marks-gender',
          why: 'the other side of the pair already names the gender, so the two forms do '
            + 'NOT share one counterpart — this is a real distinction, not a hidden one',
          // Waived for speaker-locked forms, exactly as the third-person rule is. "I know
          // an old woman" names a woman, but जानता हूँ is the SPEAKER's gender and can be
          // no one else's — the cue is about somebody the sentence merely mentions.
          test: ({ knownText, otherText, otherCue, swapped }) => !!otherCue
            && !speakerLocked(knownText, swapped)
            && otherCue.test(otherText || ''),
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
};


/**
 * THE ESTATE MATRIX. 73 languages across 143 real courses, compiled 2026-08-19 from the
 * live course list — not from memory and not from a doc.
 *
 * Values:
 *   'full'      marked, and we have swap morphology below (Direction A can generate)
 *   'declared'  marked, obligatory in ordinary learner sentences; no morphology
 *   'partial'   marked, but register-bound, optional or moribund. A DISTINCT THIRD
 *               STATE on purpose: folding these into yes/no makes the check either too
 *               loud or blind. Reported, never fired on by default.
 *   'unknown'   nobody has checked. Never fires. An honest unknown beats a confident
 *               wrong entry, because a wrong entry here silently turns a whole course's
 *               check on or off.
 *   absent      not marked.
 *
 * The five deliberate unknowns: nep/gender (1sg feminine agreement is optional and
 * usage varies), hak/clusivity (unverified Southern-Min-style split), and lmo, rgn, vec
 * T-V (Romance gender agreement is certain; which T-V paradigm the taught variety uses
 * is not). All are 0-seed or draft courses, so waiting costs nothing.
 */
/**
 * The language table. `marks` is what decides whether a check runs on a pair at all,
 * and in which direction. Entries are 'full' (morphology present, Direction A can
 * generate a missing prompt) or 'declared' (we know it marks it; nothing generated).
 *
 * An axis a language does NOT mark is simply absent. Absence is a claim, so only add
 * a language when someone has actually checked it — a wrong entry here silently turns
 * a check on or off for a whole course.
 */
const LANGUAGES = {
  afr: { marks: { formality: 'partial', number: 'declared' }, note: 'jy/julle; u formal but near-dead in speech' },
  ara: { marks: { gender: 'declared', number: 'declared' }, note: 'عايز/عايزة, إنت/إنتي; politeness is lexical (حضرتك), not grammatical T-V' },
  aze: { marks: { formality: 'declared', number: 'declared' }, note: 'sən/siz' },
  ben: { marks: { formality: 'declared', number: 'declared' }, note: 'three-way tui/tumi/apni; no grammatical gender' },
  bre: { marks: { formality: 'declared', number: 'declared' }, note: 'te/c\'hwi' },
  bul: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'l-participle бил/била; adj. уморен/уморена' },
  cat: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'sóc cansat/cansada; tu/vostè' },
  ces: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'past dělal/dělala — every past-tense I-sentence' },
  cor: { marks: { formality: 'partial', number: 'declared' }, note: 'ty/hwi; revived-language usage norms unsettled' },
  cym: { marks: { formality: 'declared', number: 'declared' }, note: 'ti/chi; no gender on verb or predicative adj.' },
  dan: { marks: { number: 'declared' }, note: 'du/I; De effectively dead' },
  deu: { marks: { formality: 'declared', number: 'declared' }, note: 'du/Sie; "ich bin müde" does not inflect' },
  ell: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'είμαι κουρασμένος/κουρασμένη' },
  eng: { marks: { number: 'partial' }, note: 'only a weak you/you all; the reference "marks nothing" language' },
  est: { marks: { formality: 'declared', number: 'declared' }, note: 'sina/teie; no gender' },
  eus: { marks: { gender: 'partial', formality: 'declared', number: 'declared' }, note: 'allocutive hika marks addressee gender — restricted register, absent from standard zu' },
  fas: { marks: { formality: 'declared', number: 'declared' }, note: 'to/shomâ; no gender' },
  fin: { marks: { formality: 'declared', number: 'declared' }, note: 'sinä/te; teitittely weaker than Slavic but real' },
  fra: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'je suis allé/allée; tu/vous' },
  fur: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'Romance adj./participle agreement; tu/vô' },
  gla: { marks: { formality: 'declared', number: 'declared' }, note: 'thu/sibh (sibh IS polite-singular); tha mi sgìth invariant' },
  gle: { marks: { number: 'declared' }, note: 'tú/sibh is number only — Irish has no T-V, unlike Welsh/Gaelic' },
  glg: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'cansado/cansada; ti/vostede' },
  guj: { marks: { gender: 'declared', formality: 'declared', number: 'declared', clusivity: 'declared' }, note: 'હું ગયો/ગઈ; ame (excl) vs āpaṇe (incl)' },
  heb: { marks: { gender: 'declared', number: 'declared' }, note: 'present tense אני הולך/הולכת — every I-sentence' },
  hin: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'जाता हूँ/जाती हूँ; tū/tum/āp; ham only, no incl/excl' },
  hrv: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'past bio/bila' },
  hun: { marks: { formality: 'declared', number: 'declared' }, note: 'te/ön/maga; no gender' },
  hye: { marks: { formality: 'declared', number: 'declared' }, note: 'դու/դուք' },
  ind: { marks: { formality: 'declared', number: 'partial', clusivity: 'declared' }, note: 'kamu/Anda; kami (excl) vs kita (incl) — the textbook case' },
  isl: { marks: { gender: 'declared', number: 'declared' }, note: 'ég er þreyttur/þreytt; þér archaic' },
  ita: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'sono andato/andata; tu/Lei' },
  jpn: { marks: { gender: 'partial', formality: 'declared', number: 'partial' }, note: 'gender is register not agreement; formality is grammatical and pervasive' },
  kan: { marks: { formality: 'declared', number: 'declared' }, note: 'nīnu/nīvu; 1sg verb does not mark gender (unlike Hindi)' },
  kor: { marks: { formality: 'declared', number: 'partial' }, note: 'speech levels + honorifics; no gender' },
  lav: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'noguris/nogurusi' },
  lit: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'pavargęs/pavargusi' },
  mar: { marks: { gender: 'declared', formality: 'declared', number: 'declared', clusivity: 'declared' }, note: 'मी गेलो/गेले; āmhī (excl) vs āpaṇ (incl)' },
  mkd: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'l-participle бил/била' },
  mlt: { marks: { gender: 'declared', number: 'declared' }, note: 'predicative adj. għajjien/għajjiena' },
  nan: { marks: { number: 'declared', clusivity: 'declared' }, note: 'goán (excl) vs lán (incl) — robust in Southern Min' },
  nap: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'Romance agreement; tu/vuje' },
  nld: { marks: { formality: 'declared', number: 'declared' }, note: 'je/u; je/jullie' },
  nor: { marks: { number: 'declared' }, note: 'De dead' },
  pan: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'maiṁ giā/gaī; asīṁ only, no incl/excl' },
  pdc: { marks: { number: 'declared' }, note: 'du/dihr is number, not T-V' },
  pol: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'byłem/byłam; pan/pani marks addressee gender inside the formality system' },
  por: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'cansado/cansada; pt tu/você/o senhor, br você/o senhor' },
  roh: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'ti/Vus' },
  ron: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'obosit/obosită; tu/dumneavoastră/dumneata (three-way)' },
  rus: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'past был/была — every past-tense I-sentence' },
  scn: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'Romance agreement; tu/vossia' },
  sin: { marks: { formality: 'declared', number: 'declared' }, note: 'verbs don\'t agree at all in colloquial Sinhala; diglossia' },
  sme: { marks: { number: 'declared' }, note: 'don (sg) / doai (dual) / dii (pl) — a three-way' },
  spa: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'cansado/cansada (adjectives/participles, not finite verbs); tú/usted, es adds vosotros' },
  srp: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'past bio/bila' },
  swa: { marks: { formality: 'partial', number: 'declared' }, note: 'plural-for-respect only; no grammatical T-V, no gender' },
  swe: { marks: { number: 'declared' }, note: 'post-du-reform: ni is plural, not polite' },
  tam: { marks: { formality: 'declared', number: 'declared', clusivity: 'declared' }, note: 'nī/nīṅkaḷ; nāṅkaḷ (excl) vs nām (incl)' },
  tel: { marks: { formality: 'declared', number: 'declared', clusivity: 'declared' }, note: 'nuvvu/mīru; mēmu (excl) vs manaṁ (incl)' },
  tha: { marks: { gender: 'declared', formality: 'declared', number: 'partial' }, note: 'ครับ/ค่ะ mark speaker gender obligatorily in polite speech' },
  tur: { marks: { formality: 'declared', number: 'declared' }, note: 'sen/siz; no gender' },
  ukr: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'past був/була' },
  urd: { marks: { gender: 'declared', formality: 'declared', number: 'declared' }, note: 'identical to Hindi on all four' },
  vec: { marks: { gender: 'declared', formality: 'unknown', number: 'declared' }, note: 'Romance agreement certain; T-V paradigm unverified' },
  yid: { marks: { formality: 'declared', number: 'declared' }, note: 'du/ir; predicative adjectives uninflected, so no speaker gender' },
  yor: { marks: { formality: 'declared', number: 'declared' }, note: 'ìwọ vs respect-ẹ̀; no grammatical gender' },
  yue: { marks: { number: 'declared' }, note: 'néih/néihdeih; no nín, no inclusive zán' },
  zho: { marks: { formality: 'partial', number: 'declared', clusivity: 'partial' }, note: '您 is real but limited; 咱们 inclusive is northern and optional' },
  nep: { marks: { gender: 'unknown', formality: 'declared', number: 'declared' }, note: 'four-way ta/timī/tapāī/hajur certain; 1sg feminine agreement optional — UNKNOWN' },
  hak: { marks: { number: 'declared', clusivity: 'unknown' }, note: 'inclusive/exclusive we in Hakka — unverified' },
  lmo: { marks: { gender: 'declared', formality: 'unknown', number: 'declared' }, note: 'Romance agreement certain; T-V paradigm in the taught variety unverified' },
  rgn: { marks: { gender: 'declared', formality: 'unknown', number: 'declared' }, note: 'Romance agreement certain; T-V unverified' },
  // The four entries below come AFTER the matrix and therefore override it. Each one
  // keeps the matrix's own reading and adds what we have earned on top: morphology,
  // paradigms for the reach test, or the cue vocabulary.
  hin: {
    name: 'Hindi',
    // matrix says gender/formality/number declared; we have gender morphology.
    marks: { gender: 'full', formality: 'declared', number: 'declared' },
    morphology: { gender: HIN_GENDER },
    paradigms: {
      'first/second person pronouns': ['मैं', 'हम', 'आप', 'तुम', 'तू'],
      'third person pronouns': ['वह', 'वो', 'वे', 'यह', 'ये'],
    },
  },
  spa: {
    name: 'Spanish',
    // Gender: NOT on finite verbs, but on adjectives and participles agreeing with the
    // subject — estoy cansado / cansada. So an English speaker producing Spanish must
    // decide their own gender with nothing in the prompt to tell them (Direction B).
    // Formality: tú / usted. Number on "you": vosotros / ustedes (Spain).
    marks: { gender: 'declared', formality: 'declared', number: 'declared' },
    paradigms: {
      'subject pronouns': ['yo', 'tú', 'usted', 'él', 'ella', 'nosotros', 'vosotros', 'ustedes', 'ellos', 'ellas'],
      'demonstratives': ['este', 'esta', 'esto', 'ese', 'esa', 'eso', 'aquel', 'aquella'],
    },
  },
  cym: {
    name: 'Welsh',
    // Formality/number both ride on ti vs chi. Welsh does NOT mark the speaker's gender
    // in ordinary sentences, so a Welsh-known course is not a Direction A gender case.
    marks: { formality: 'declared', number: 'declared' },
    paradigms: {
      'pronouns': ['i', 'fi', 'ti', 'chi', 'e', 'fe', 'hi', 'ni', 'nhw'],
    },
  },
  eng: {
    name: 'English',
    // English marks none of the four in ordinary learner sentences: no speaker gender,
    // no T-V, one 'you' for both numbers, one 'we'. That absence is the whole reason
    // Hindi→English collapses and English→Spanish under-determines.
    marks: {},
    // What English text SAYS the distinction out loud, when English itself does not
    // grammaticalise it. A prompt carrying one of these determines the answer, so the
    // pair is not hidden from the learner and there is nothing to teach or to flag.
    cues: {
      gender: /\b(he|she|him|her|his|hers|himself|herself|sir|madam|ma'am|mr|mrs|ms|man|woman|boy|girl|male|female|son|daughter|brother|sister|mother|father|husband|wife)\b/i,
      formality: /\b(sir|madam|ma'am|formally|politely|informally|mr|mrs|ms)\b/i,
      number: /\b(you all|all of you|both of you|you two|everyone|y'all)\b/i,
    },
    paradigms: {
      'third person pronouns': ['he', 'she', 'it', 'him', 'her', 'they', 'them'],
      'possessives': ['his', 'her', 'hers', 'its', 'my', 'mine', 'your', 'yours', 'our', 'ours', 'their', 'theirs'],
      'subject pronouns': ['i', 'you', 'we', 'they', 'he', 'she', 'it'],
      'demonstratives': ['this', 'that', 'these', 'those'],
    },
  },
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
  // A class that only makes sense under an anchor must not fire without one. करते in
  // मैं ... करते रहना चाहूँगा is an invariant compound, not the listener's agreement;
  // swapping it dragged the whole row into a third-person rejection and lost a valid
  // first-person proposal. (Worker #258, row B6.)
  const present = anchorsIn(text, distinction);
  for (const cls of distinction.classes) {
    if (cls.direction === 'toFeminine' && fromSide !== 'masculine') continue;
    if (cls.direction === 'toMasculine' && fromSide !== 'feminine') continue;
    if (cls.requiresAnchor && !present.includes(cls.requiresAnchor)) continue;
    const { fwd, rev } = classMaps(cls);
    const map = fromSide === 'masculine' ? fwd : rev;
    for (const [from, to] of map) {
      const re = word(from);
      if (!re.test(out)) continue;
      out = out.replace(word(from), (m, offset, full) => {
        const before = full.slice(0, offset).trim().split(/\s+/u).pop();
        const blocked = (distinction.invariantAfter || [])
          .some((g) => g.form === from && g.after.includes(before));
        return blocked ? m : to;
      });
      if (out.includes(to)) swapped.push({ from, to, class: cls.id });
    }
  }
  // A form may have been blocked in every position it occurred in.
  const kept = swapped.filter((sw) => !word(sw.from).test(out));
  return { text: out, swapped: kept };
}

/**
 * A form we deliberately never swap, left stranded next to one we did — mixed agreement,
 * so the counterpart is not well-formed and must not be offered as a drill.
 */
function strandedAfterSwap(swappedText, distinction) {
  if (!(distinction.strandingRisk || []).length) return null;
  return distinction.strandingRisk.find((adj) => word(adj).test(swappedText)) || null;
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

const marksOf = (lang) => (LANGUAGES[lang] || {}).marks || {};
const paradigmsOf = (lang) => (LANGUAGES[lang] || {}).paradigms || {};
/** How the OTHER side of a pair says a distinction out loud, when it does not inflect it. */
const cueFor = (lang, axis) => ((LANGUAGES[lang] || {}).cues || {})[axis] || null;

/**
 * Which axes are asymmetric for this pair, and which way round.
 *
 * Returns one entry per axis where exactly one side marks it:
 *   direction 'A'  known richer  → several prompts collapse onto one answer
 *   direction 'B'  target richer → the learner must produce an undetermined form
 * An axis both sides mark is NOT a finding: the learner sees the distinction in their
 * own language and carries it across. An axis neither marks is not a finding either.
 *
 * `generative` is true only when the RICHER side has morphology, which is what lets
 * Direction A propose the missing prompt rather than merely observe collapses.
 */
const FIRES = new Set(['full', 'declared']);

function directionsFor(knownLang, targetLang, opts = {}) {
  const k = marksOf(knownLang); const t = marksOf(targetLang);
  const out = [];
  for (const axis of Object.keys(AXES)) {
    if (AXES[axis].enabledByDefault === false && !opts.includeDisabled) continue;
    // 'partial' and 'unknown' are not claims strong enough to fire a check on.
    const kMarks = FIRES.has(k[axis]); const tMarks = FIRES.has(t[axis]);
    if (kMarks === tMarks) continue;
    const direction = kMarks ? 'A' : 'B';
    const richer = kMarks ? knownLang : targetLang;
    out.push({
      axis,
      direction,
      richerSide: kMarks ? 'known' : 'target',
      richerLang: richer,
      label: AXES[axis].label,
      generative: (kMarks ? k[axis] : t[axis]) === 'full',
      morphology: ((LANGUAGES[richer] || {}).morphology || {})[axis] || null,
    });
  }
  return out;
}

/** Every configured inflectional pair for a language+axis, as "a|b" keys for the reach test. */
function axisPairKeys(lang, axis) {
  const m = ((LANGUAGES[lang] || {}).morphology || {})[axis];
  const keys = new Set();
  if (!m) return keys;
  for (const cls of m.classes) {
    for (const [a, b] of cls.forms) {
      if (a !== b) keys.add([a, b].sort().join('|'));
    }
  }
  return keys;
}

module.exports = {
  AXES,
  LANGUAGES,
  directionsFor,
  axisPairKeys,
  paradigmsOf,
  cueFor,
  marksOf,
  swapSide,
  strandedAfterSwap,
  anchorsIn,
  knownKey,
  targetKey,
};
