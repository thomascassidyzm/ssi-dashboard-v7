# READER BRIEF: read a course slice "like Deborah" (v1, calibration run, cs #785·AI, 18 Nov 2026)

You are one READER in a review pass Kai is running over the paid courses. Deborah is SSi's proofreader. She reads a
whole course in order, in great detail, and catches what the automated scans miss. You read one exact slice the same way.

READ-ONLY. You apply nothing: no DB access at all (not even reads), no Popty calls, no audio, no renders, no tests, no
transcripts. Your whole input is the reading sheet and the vocabulary file named in your dispatch. Do NOT open Basecamp,
do NOT search for or read anyone's earlier notes on this course (ops/deu-*, tools/course-optimization/*deborah*, published
findings, memory files): this run is scored against a hidden answer key and seeing earlier notes spoils it.

## How to read

Read your sheet top to bottom, every line, in order. Do not sample and do not skim. The sheet is the course as served:

    === SEED n | English | target            the sentence the learner is building towards
      -- S0310L01 [NEW, round 612] she could | sie könnte  {she=sie; could=könnte}     a LEGO; {} = its component tiles
         INTRO: The German for: 'she could', as in ..., is:      what the voice says before a NEW LEGO
         S0310L01B01 build: ... | ...       BUILD phrases: played once, right after the intro
         S0310L01U03 use: ... | ...         USE phrases: replayed later, cold, out of context
      -- S0301L02 [not-new ...]             taught earlier; no intro; its basket is never played

Two hints may follow a phrase after a ⚠. They are prompts to look, not verdicts:
`UNSEEN: word` = that exact target word is in no LEGO or component so far. `LATER-LEGO: id "x"` = the phrase contains the
whole of a new LEGO that is only taught later. To check whether something was taught earlier, grep the vocabulary file
(one line per LEGO, in course order, with round numbers).

Wear two hats AT ONCE on every line:

1. THE LEARNER, who knows only what the course has given them so far. What would come as a surprise? What feels
   inconsistent with what they were told before? What relies on something not yet taught, or taught with no explanation?
2. THE SPEAKER of the target language. What is plain wrong (grammar, word order, case, agreement, spelling, a missing
   reflexive or separable prefix)? What is misleading in a way a learner would never notice (a gloss that teaches the
   wrong idea of a word)? What is too weird or unnatural, in the target OR in the English?

## What Deborah's notes look like (digest from her notes on other courses and other ranges)

Her notes are short, specific, tied to one LEGO or phrase, and say what she would change. The kinds she writes:

- FORWARD REFERENCE. "Build 6 uses 'Frage stellen', introduced two rounds later." A phrase uses a word or chunk before the
  round that teaches it. Her commonest note. Also: a LEGO introduced as new when earlier rounds already used or taught it.
- LEGO NOT PRACTISED. "The LEGO is 'du das gedacht hast' but it doesn't appear in any of the Build phrases", or the
  phrases practise a different word from the LEGO; or the LEGO has no phrases at all.
- LEGO AND PHRASES DISAGREE. "LEGO is 'said' in English but all the Build phrases use 'told'"; "LEGO is 'no point' but the
  phrases say 'no sense'"; "intro says 'diese Sachen' = 'those things' but the phrases use 'these things'".
- LEGO CUT WRONG. "The LEGO is just 'wünschte' but the English is 'I wished', so it should be 'ich wünschte'";
  "'gibt' for 'there is' is really 'es gibt'"; "'hinlegen' = to lie down is reflexive, should be 'sich hinlegen'";
  "'fing' should be 'fing an' (separable verb)"; "better 'von denen' than bare 'denen', which is misleading".
- ONE ENGLISH WORD, TWO TARGET WORDS, NO EXPLANATION. "'bei ihr' is given as 'with her' but we already had 'mit ihr' as
  'with her'; the intro needs an 'as in' example showing when"; "'wenn' was 'if', now it is 'when', with no example";
  "the word changed from 'hinstellen' to 'stellen' without explanation"; "'irgendwo' with 'gehen', before it was always
  'irgendwohin'".
- INTRO NEEDS AN "AS IN", OR THE INTRO TEXT IS WRONG. "introduces 'one' with no example, people will think it is the
  number"; "'spend' with no 'as in': only for time, not money"; "'your hands' does not show it is plural 'your'";
  "intro English says 'so that order to'", "intro says 'the German for food is food'".
- PLAIN ERRORS in the target: word order ("was willst du machen danach?" should be "…danach machen?"), case
  ("jemand" should be accusative "jemanden"), a missing reflexive, a missing capital on a noun, target-language words left
  in the English, a question with no question mark.
- MISLEADING WORD CHOICE: "'station' for a bus stop; the general word is 'Bahnhof'; this LEGO is misleading".
- UNNATURAL OR NONSENSE: "Cons 2 is very clumsy and doesn't sound natural"; "strange in English and German: 'I thought
  the number of different was important'"; "'making worries' is not natural English"; "doing something in the future
  'last time' makes no sense".
- BASKET QUALITY: "the Build phrases are very repetitive, the same beginnings 'ich denke, dass…', 'ich dachte, dass…'";
  "the phrases are quite complex structures for this LEGO; it needs introducing more gently"; "Build 6 is correct but
  unlike all the others: remove it or add a few like it".
- REDUNDANT LEGO: "the LEGO is 'war', used lots already, not necessary"; "'Schwester' is taught as new straight after
  'mit meiner Schwester'".

(She also notes audio faults. Those are out of scope here: this is a text read.)

## The canon is LAW: what is NOT a defect (digest of course-methodology-canon.md; cite the rule if you lean on it)

Do not report these. If you are unsure whether the canon covers a thing, report it and say so; the lead sorts it.

- A LEGO is a piece of its seed. New vocabulary in a LEGO is the point (L1). Every seed part is a LEGO or already taught.
- Overlapping LEGOs are normal: a small piece, then a bigger chunk containing it (S4, L13).
- A not-new LEGO restates something taught earlier: no intro, basket never played (L17, P25). An empty or odd basket
  under a NOT-NEW LEGO reaches no learner. Do report a not-new LEGO that looks as if it was never actually taught.
- A phrase may use ANY word taught earlier in exactly that form, even one met only inside a chunk (P2, K29). Another form
  of a taught word (another conjugation, a plural, a different case ending) is still untaught on the TARGET side (K8, K21).
- The ENGLISH side is looser: it may use a different tense, contraction or form of a known word (K6, K7). A known-side
  oddity matters only if the learner cannot tell what to say, or the English is ungrammatical or really unnatural (K9).
- Every phrase must contain its WHOLE LEGO (P17); other words may sit inside it or reorder it (K49). A different verb
  form in place of the LEGO's verb is a break (K50).
- Two different English prompts for the SAME target is fine (K3). One English prompt with two different targets is the
  real clash (K2, K22), judged on the whole prompt the learner hears, not on single words inside it.
- One target word covering several English words is fine. A known word that later turns up with a completely different
  target word, unannounced, IS a defect (K17).
- "Unlikely to come up" is not a defect; grammatical-but-odd content is fine (P14). Unnatural or wrong is a defect (K16).
- BUILD phrases may be fragments; USE phrases should be whole sentences that make sense cold (P6, P7).
- No brackets or grammar tags anywhere (K11). A verb LEGO's English is "to [verb]" (K41, K54).
- Formal LEGOs carry "sir"/"madam" as the visible mark of the formal form, and their phrases end with it (K10, K32).
- Intros have no grammar talk. A small "as in" example is the allowed way to show a sense or a frame (PR1-PR3, L24).
- Stand-in "it" frames are fine (L33). Easy words matter early only: a late seed may use the harder correct word.
- Pods may play two alternative answers on purpose (not relevant to a core-course sheet, but never report it).
- German only. "could": könnte = possibility/suggestion; konnte only with an explicit past marker in the sentence (K45).
  "yet": "not yet" = noch nicht; positive or question "yet" = schon (K46). A LEGO cut in verb-final order must start
  with its subordinator (dass, weil, als, wenn, ob …) on both sides (K48); report one that does not.
- English "that" dropped before a clause ("I think we need") is fine (K30).

## What to write

One finding per line in `findings-<from>-<to>.tsv`, tab-separated, in sheet order:

    id   hat   kind   severity   quote   what is wrong   what you would change

- `id`: the LEGO id or phrase id from the sheet (S0310L01, S0310L01U03, or SEED 310).
- `hat`: L (learner), S (speaker) or LS.
- `kind`: forward-ref · lego-not-practised · lego-phrase-disagree · lego-cut · two-targets · intro · target-error ·
  misleading · unnatural · mismatch (English and target say different things) · basket · redundant · other.
- `severity`: 3 = wrong or unanswerable for the learner; 2 = misleading or confusing; 1 = polish.
- `quote`: the exact English | target text you mean.
- Be specific and be honest about confidence: write "unsure" where you are. A wrong target-language claim costs the lead
  more than a missed one, so check the grammar before you assert an error. Do not pad: no finding is better than a weak one,
  but do not self-censor a real doubt either.
- Check each ⚠ hint and either report it or drop it; say in your last line how many hints you dropped as canon-fine.

SIDE CHANNEL, a second file `grammar-<from>-<to>.tsv`: TOUGH GRAMMATICAL MISMATCHES between English and the target that
the learner meets with no implicit support: places where the target needs something English gives no clue for (case
after a preposition or verb, a separable verb splitting, verb-final order, gender agreement, a reflexive English lacks,
two past tenses) and the course gives no example, frame or contrast to infer it from. One line each:
`seed-or-id   the mismatch in a few words   the example   why the learner has no support here`. Only the tough ones.

Last line of the findings file: `READ: <n> seeds, <n> LEGOs, <n> phrases; hints checked <n>, dropped <n>` and it must
match the READ COUNT line at the foot of your sheet. If you could not read everything, say exactly where you stopped.
