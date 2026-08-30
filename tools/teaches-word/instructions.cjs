/**
 * The reading instructions — TWO SETS, because the two sides are judged by different rules.
 *
 * The wording of the rules is taken from `docs/course-methodology-canon.md`, quoted rather than
 * paraphrased, so that what a reader is told and what the canon says cannot drift apart.
 *
 *   K8  "The TARGET side stays strict, always. Every target sentence tiles from taught chunks,
 *        no exceptions. K6 and K7 are known-side latitude only."
 *   P2  "Phrases tile from WHOLE already-introduced chunks, never re-split into words… if a
 *        wording needs a form you have not introduced as a whole chunk, it fails."
 *   K6  "The known side MAY use uninstructed forms of taught words; only genuinely different
 *        WORDS are defects… the known can use a different case, or conjugation, contraction,
 *        gender or whatever if it needs, even if it isn't introduced… They'll try with the
 *        closest thing they know, and be pleasantly surprised. The controlled-language
 *        constraint on the known side is about LEXEMES, not surface forms."
 *   K7  "A known-side finding is NOT serious by definition… Three tiers: (1) Fine (design): a
 *        contraction, gender, case or conjugation of a word they know. (2) Mild defect: a
 *        distinct lexeme for a concept whose mapping they were taught differently. (3) Serious:
 *        the learner has NO CHANCE of guessing at all."
 *
 * The worked examples below are real rows from the live database, chosen for the borderlines.
 */

const TARGET_RULES = `You are checking the TARGET side: the sentence in the language the learner is LEARNING.

THE TARGET SIDE IS STRICT. The methodology canon puts it this way: "The TARGET side stays strict,
always. Every target sentence tiles from taught chunks, no exceptions." And: "Phrases tile from
WHOLE already-introduced chunks, never re-split into words... if a wording needs a form you have
not introduced as a whole chunk, it fails."

So the test is: does the sentence contain the taught word IN THE EXACT FORM IT WAS TAUGHT?
Teach the form, get the form.

USES — the sentence contains the taught word in the same form:
- Exactly as taught, anywhere in the sentence.
- SPLIT IS FINE. If the taught item is more than one word, another word may be inserted between
  its words, or its words reordered by normal grammar. Every word must still be there, and each
  in the SAME FORM as taught.
- The only variation slight enough to pass is one a learner would barely perceive: a mild
  softening mutation of the first letter, or a slightly different vowel ending. Nothing more.

MISSING — anything else, and in particular:
- AN INFLECTED FORM DOES NOT COUNT. A different tense, person, number, or case of the taught word
  is MISSING on this side, even though it is the same word. This is the opposite of the rule for
  the other side, and it is deliberate.
- A different word, a synonym, or a paraphrase.
- One or more words of a multi-word taught item absent.

WORKED EXAMPLES, from real course rows:

1. WORD "dw i'n mynd i" / SENTENCE "dw i'n mynd i ddysgu"
   USES. Every word present, exact form, with "ddysgu" simply following it.

2. WORD "pour eux" / SENTENCE "avec eux"
   MISSING. "pour" has been replaced by a different preposition, "avec".

3. WORD "ychydig o ffrindiau" / SENTENCE "dw i'n mynd mas gyda ychydig o ffrindiau heno"
   USES. The taught item sits inside a longer sentence, intact and unchanged.

4. WORD "siarad" / SENTENCE "dw i'n siarad Cymraeg"
   USES. Exact form.

5. WORD "siarad" / SENTENCE "siaradais i"
   MISSING. "siaradais" is an inflected form of the same verb. On the target side that fails:
   the learner was taught "siarad" and has not been given "siaradais" as a chunk.

6. WORD "Cymraeg" / SENTENCE "dw i'n dysgu Gymraeg"
   USES. "Gymraeg" is the same word under a mild softening mutation of its first letter — the
   kind of difference a learner barely perceives. This is the one tolerated variation.

7. WORD "menos" / SENTENCE "eso es menos interesante"
   USES. Exact form, inside a longer sentence.

8. WORD "会说" / SENTENCE "会说中文"
   USES. Exact characters present. In a script with no spaces between words, "present" means the
   characters appear in order, unbroken.`;

const KNOWN_RULES = `You are checking the KNOWN side: the prompt in the language the learner ALREADY SPEAKS.

THE KNOWN SIDE IS DELIBERATELY LOOSER THAN THE OTHER SIDE. The methodology canon puts it this way:
"The known side MAY use uninstructed forms of taught words; only genuinely different WORDS are
defects... the known can use a different case, or conjugation, contraction, gender or whatever if
it needs, even if it isn't introduced... They'll try with the closest thing they know, and be
pleasantly surprised." And: "The controlled-language constraint on the known side is about
LEXEMES, not surface forms."

The reason for the latitude: the known side must be GRAMMATICAL in the learner's own language, and
that sometimes forces a form different from the one taught, because the target language is simpler
and needs the form the learner already knows.

THE TEST IS AUTOMATICITY. It passes if the learner would connect the two instantly, without having
to stop and think. If they know the word for "to speak" but have never been given "speaking", they
will still reach for "to speak" — that connection is automatic, so it passes. It fails where the
two words are related but the connection is NOT automatic: where the learner would have to work out
that these are the same word.

USES:
- Any different ending, case, tense, person, number, gender, contraction or conjugation of the
  taught word. All of these are the same word and all are fine here.
- A dropped pronoun the language routinely omits.
- A multi-word taught item with its words separated or reordered by normal grammar.

MISSING — only a GENUINELY DIFFERENT WORD:
- A synonym or near-synonym: a distinct word for the same idea. The canon's own example is a
  lesson that teaches "know" as one verb and then a sentence that needs a different verb for
  "know" — to the learner that feels like a whole new word.
- A paraphrase or a more everyday alternative standing in for the taught word.
- The taught word simply absent, with nothing standing in for it.

WORKED EXAMPLES, from real course rows:

1. WORD "to remember" / SENTENCE "I can't remember"
   USES. Same word, different form. Automatic.

2. WORD "I still want" / SENTENCE "I still need to remember how to learn"
   MISSING. "need" is a genuinely different word from "want" — not a form of it.

3. WORD "I need" / SENTENCE "I can't remember how to try"
   MISSING. Nothing stands in for "need" at all.

4. WORD "知っている" (to know) / SENTENCE "わかりません"
   MISSING. わかる is a different verb from 知る, not a form of it. This is the canon's paradigm
   case: the learner taught one word for "know" meets another and it feels like a new word.

5. WORD "眠った" (slept) / SENTENCE "ここでよく眠れなかった"
   USES. 眠れなかった is the same verb 眠る in another form. On the known side that is fine, and
   the learner reaches for it automatically.

6. WORD "I'm surprised at" / SENTENCE "I'm happy because I've learnt a lot already"
   MISSING. "happy" is a different word from "surprised".

7. WORD "today" / SENTENCE "where do you want to learn Welsh?"
   MISSING. No word for "today" appears, in any form.

8. WORD "a few friends" / SENTENCE "with a few friends"
   USES. The whole taught item is present.`;

const SHARED_TAIL = (lang) => `
The items below are in ${lang}.

Ignore anything in brackets in the WORD: that is a note to the author, not part of the word.
If the WORD offers alternatives separated by a slash or a middle dot, using ANY ONE of them counts.
If the SENTENCE is plainly not written in ${lang} at all, answer UNSURE and say so.

UNSURE is a respectable answer and you should use it whenever you genuinely cannot tell. A wrong
confident answer is much worse than an honest UNSURE.

Answer with one line of JSON per item and nothing else. No preamble, no code fence.
Each line: {"n": <item number>, "verdict": "USES" | "MISSING" | "UNSURE", "why": "<one short sentence>"}`;

function readerInstructions(side, lang) {
  const rules = side === 'target' ? TARGET_RULES : KNOWN_RULES;
  return `${rules}\n${SHARED_TAIL(lang)}`;
}

/**
 * The confirm pass. Same asymmetry: what counts as a successful rebuttal differs by side, so the
 * second reader must not be handed the other side's escape hatch.
 */
function confirmInstructions(side, lang) {
  const common = `A first reader has accused each practice sentence below of NOT using the word its lesson teaches.
Your job is to overturn that accusation wherever it does not hold up.

Answer with one line of JSON per item and nothing else. No preamble, no code fence.
Each line: {"n": <item number>, "ruling": "UPHELD" | "OVERTURNED", "why": "<one short sentence>"}`;

  if (side === 'target') {
    return `You are the second reader on the TARGET side of some ${lang} course material — the language
the learner is LEARNING. This side is STRICT: the sentence must contain the taught word in the
EXACT FORM it was taught. Teach the form, get the form.

OVERTURN the accusation only if:
- The taught word IS present in its exact form, and the first reader missed it — including when a
  multi-word item has been split by another word or reordered. Splitting is allowed.
- The only difference is one a learner would barely perceive: a mild softening mutation of the
  first letter, or a slightly different vowel ending.
- The difference is only punctuation, spacing or capitalisation.

UPHOLD it if the sentence uses a DIFFERENT FORM of the word — a different tense, person, number or
case. On this side an inflected form is a genuine defect, NOT a rescue. Do not overturn on the
grounds that "it is the same word": that reasoning belongs to the other side and is wrong here.
Uphold it too where the word, or any part of a multi-word item, is simply absent or replaced.

If you cannot decide, answer UPHELD: on this side the strict reading is the correct default.

${common}`;
  }

  return `You are the second reader on the KNOWN side of some ${lang} course material — the language the
learner ALREADY SPEAKS. This side is deliberately LOOSE. The canon: "The known side MAY use
uninstructed forms of taught words; only genuinely different WORDS are defects."

OVERTURN the accusation if ANY of these is true:
- The sentence uses the same word in a different form — a different tense, person, number, gender,
  case, contraction or conjugation. All of these are fine on this side.
- The taught item is a phrase and the sentence uses it with its words separated or reordered.
- The difference is only a pronoun the language routinely drops, a bracketed note to the author,
  punctuation, or spacing.
- The taught word offers alternatives and the sentence uses any one of them.
- The first reader is simply wrong about the language.

The test is AUTOMATICITY: would the learner connect the two instantly, without stopping to think?
If yes, OVERTURN.

UPHOLD it only where the sentence uses a GENUINELY DIFFERENT WORD — a synonym, a near-synonym, a
paraphrase — or where nothing stands in for the taught word at all.

If you cannot decide, answer OVERTURNED. On this side the tie goes to the material: a check that
accuses good sentences is worse than no check at all.

${common}`;
}

module.exports = { readerInstructions, confirmInstructions, TARGET_RULES, KNOWN_RULES };
