# Distinction coverage — scan-course Check 19

**2026-08-19** · `tools/check-distinction-coverage.cjs` · propose-only, both directions, gated

## The problem, in both directions

A course pairs a KNOWN language with a TARGET language. Wherever one side grammatically marks
a distinction the other does not, the pair has a problem — but **which** problem depends on which
side is richer, and **the two have opposite remedies**.

Shuchita, the eng_for_hin proofreader, named the first case:

> "Hindi genders things that you dont in English. We want to make sure that the Hindi speakers
> understand the lack of gendering in these contexts — so we should prompt for the multiple
> options (both genders for example) with the same English phrase as the answer. Drilling that
> will help them understand the phrase they learnt is acceptable for both genders instead of just
> the one originally introduced."

**DIRECTION A — known richer.** Several known-side prompts collapse onto one target answer. The
learner meets one, learns the answer, and has no way to know it answers the others too.
*Remedy: teach the collapse — same answer, several prompts, drilled.*

**DIRECTION B — target richer.** The learner must PRODUCE a distinction their own language does
not make, with nothing in the prompt telling them which. *Remedy is the opposite: not a lesson,
a potentially unanswerable card. Disambiguate the prompt, split the card, or confirm the
ambiguity is deliberate.*

A check that knew only Direction A would report every Direction B case as healthy — worse than not
having the check. Both are detected, labelled, and never given each other's remedy.

**Neither slot is English.** The checker names no language and no axis; both are configuration.
The one English-shaped rule that survived the first draft — "reject if the answer says he/she" —
is now `cueFor(otherLang, axis)`, so it works for hin→eng, eng→hin or hin→kor without knowing
which of them is English.

## THE GATE — the most important part

> "Just because the same word can be used in both ways, does not mean the learner will find the
> process painless." — Kai, 2026-08-19

The question is **not** "is the target form genuinely the same?" That is a fact about the language
and it is not sufficient. The question is **will the learner reach for the thing they already
know?** His two worked examples define the boundary, and both are pinned as tests:

| | |
|---|---|
| **WORKS** | Taught "she speaks" = *se puhuu*. Asked "he speaks", the learner thinks *"I only know how to say she speaks… I'll just say that"* — and it is the same. Surprise, reward, lesson learned. |
| **FAILS** | Taught "I am learning" = *dw i'n dysgu*. Asked "I am teaching" — the same Welsh word — they do **not** think "the closest thing I know is learning". They think *"I don't know that one, aaa!"* A wall, not a lesson. |

What separates them is **not** surface minimality — both are one word apart. It is that *she/he*
are one paradigm the learner already holds as a set, while *learning/teaching* are two open-class
words whose connection exists only in Welsh, which is exactly what the learner cannot see yet. So
the gate looks for two ways of being obviously neighbours from the learner's side: the differing
words are forms of the same word, or members of one small closed paradigm. Minimal pairs pass;
accidental collisions fail; the middle ground is flagged rather than guessed.

Every candidate carries an explicit verdict with its reasoning, and failures are reported
**separately** as *"same target form, but not a drill candidate"*.

The gate is doing real work, not decoration. On eng_for_hin it removed four proposals like:

> `मैं देख रहा था आप बात कर रहे थे।` ↔ `मैं देख रही थी आप बात कर रही थीं।` — "I could see you were talking to someone"

which swaps the speaker's gender **and** the listener's at once. Two distinctions, not one — not a
single step from anything the learner holds.

And it found the estate's own `dysgu`: eng_for_hin teaches **अभी खेलना** and **अभी बजाना** — two
unrelated Hindi verbs — both answering "to play now". A learner who knows खेलना would never reach
for it when shown बजाना.

## The four detectors

| | direction | needs config | question |
|---|---|---|---|
| **A1** | A, generative | morphology on the known side | the counterpart prompt is missing — propose it |
| **A2** | A, observational | **none — runs on every pair** | the course already reaches one answer from >1 prompt; drill or wall? |
| **B1** | B, generative | morphology on the target side | this answer is marked, the prompt gives no cue, and the other form is never taught |
| **B2** | B, observational | **none** | one prompt taught with two answers that are forms of one word |

The reach test applies to **A only**. Reach is a question about drill candidacy. Direction B is not
proposing a drill; its question is whether the prompt determines the answer.

## Calibration — four courses, three directions

Nothing here is a count without a hand-checked case behind it.

### eng_for_hin (hin→eng) — Direction A, generative

```
axis gender: DIRECTION A (known richer), morphology available
coverage 5082/5082 rows carrying a marked form (100%)
A1 proposals passing the reach test : 1944
    same target form but NOT a drill: 4
    attested both sides              : 33      ← the calibration signal
    rejected                         : 2102 across six named rules
A2 reachable collapses 8 · not-drill-pairs 201 (20 in sentences) · flagged 166
```

The **33 attested** rows are the evidence: places eng_for_hin already teaches both genders against
one English answer (`चाहता`/`चाहती` → "wants"; `सकता है`/`सकती है` → "can"). Found by hand before
the tool existed, then reproduced by it. A run reporting zero attested here would be a broken run,
not a clean course.

| seed | has | missing | shared answer |
|---|---|---|---|
| 1 | मैं बोलना चाहता हूँ। | मैं बोलना चाहती हूँ। | I want to speak |
| 2 | कोशिश कर रहा हूँ | कोशिश कर रही हूँ | I'm trying |
| 14 | क्या आप बोलते हैं? | क्या आप बोलती हैं? | do you speak? |
| 205 | मैं आज भूल गया। | मैं आज भूल गई। | I've forgotten today |
| 490 | मैं कभी भरोसा नहीं करूँगा | मैं कभी भरोसा नहीं करूँगी | I will never trust anyone |

### hin_for_eng (eng→hin) — Direction B, generative, same table

The same Hindi morphology, pointed the other way, on the mirror-image course:

```
axis gender: DIRECTION B (target richer), morphology available
coverage 2200/2200 (100%)
UNDER-DETERMINED, other form never taught : 912
prompt carries a cue (he/she/sir…)        : 626
BOTH FORMS TAUGHT SOMEWHERE               : 0
```

**Zero.** The English prompt "I want to speak" gives no gender; the course teaches
`मैं बोलना चाहता हूँ` and never once the feminine. Independently verified outside the tool:
`चाहता हूँ` 267 rows, `चाहती हूँ` **0**; `रहा हूँ` 175, `रही हूँ` **0**. A woman learning Hindi is
never shown how to say "I want" about herself.

### spa_for_eng (eng→spa) — Direction B, and the design flaw it exposed

Worker **#262** hand-checked this course before I trusted any detector, and its finding changed the
design. Its warning, verbatim:

> "Do not treat 'same English, two Spanish' as the primary signal. It found 9 good formality cases
> but missed all 690 rows of family A, because family A has no collision — the course is perfectly
> self-consistent in being masculine-only. The strongest defect here is invisible to a collision
> detector."

690 rows put an English first-person subject against a Spanish gender-marked adjective; the
feminine first-person form appears **zero** times in 668 seeds. Verified independently: 206 rows of
`estoy (un poco) cansado/seguro/listo/ocupado/contento`, **0** feminine.

My Direction B was collision-only and structurally could not see it. **That is why B1 exists.**
Spanish morphology is not written yet, so B1 does not fire on spa_for_eng — the gap is real and
stated. What B2 does find there is sound:

| prompt | taught | also taught | undetermined |
|---|---|---|---|
| Your friend | Tu amigo (s83) | Tu amiga (s284) | gender |
| Busy | Ocupado (s192) | Ocupada (s246) | gender |
| help you | Ayudarte (s62) | ayudarle (s645) | formality |
| what do you think | ¿qué piensas? (s493) | qué piensa (s651) | formality |
| you want | Quieras (s97) | quieres (s169) | mood |
| I was | Estaba (s42) | estuve (s386) | aspect |

### cym_s_for_eng (eng→cym) — Direction A, observational, no config at all

A2 runs with zero language configuration, which is how the check reaches the whole estate. Welsh
also produced the reach test's biggest correction: it flagged 12 "walls" that were really statement/
question pairs of the same sentence —

> `wnest ti ddechrau ymarfer` answers both "you started to practice" and "did you start to practice?"

Positional diffing called those unrelated; an English speaker plainly sees the same material. Adding
a word-order-insensitive overlap measure cut the walls from 12 to 4 and moved the rest to *flagged*
— the middle ground, decided by a human rather than by a heuristic.

## False positives, hunted and removed

### Never swapped at all — absence is the mechanism

| pattern | rows | why it is not participant gender |
|---|---|---|
| मुझे लगता है "I think" | 617 | लगता agrees with the thing thought, never the thinker. The biggest trap in the course. |
| मैंने … किया "I started" | 265 | Ergative — the perfective agrees with the object, identical for both speakers. |
| अगर मुझे पता होता | 169 | पता is a masculine noun; invariant. |
| मुझे मिला / मेरा / अच्छा | — | Agree with the thing obtained, possessed, or described. |

### Rejected by named rule — 2,102 rows on eng_for_hin

| rule | rows | reasoning |
|---|---|---|
| `other-side-marks-gender` | ~1,000 | The other side already says he/she/sir, so the two forms do **not** share one counterpart. Not an English rule — the cue vocabulary comes from whichever language sits opposite. |
| `third-person-subject` | ~870 | A third party or gendered noun controls the agreement: `मेरी बेटी सीख रही है`. |
| `reverse-direction-needs-speaker-lock` | 139 | Feminine→masculine, `-ती` is ambiguous between `-ता` and `-ते`; the raw swap produced ungrammatical `आप चाहता हैं`. |
| `ambiguous-agreement-controller` | 100 | An honorific `-ते` after a plural nominal agrees with **that noun**: in `लोगों से जो अंग्रेज़ी बोलते हैं`, बोलते belongs to the people. A real bug in the first cut. |
| `explicitly-gendered-address` | 6 | The prompt says महोदया. |
| `ergative-perfective` | 1 | ने marks the ergative. |

### Two rules had to be *weakened*, not strengthened

A blanket "any third person present → reject" threw away 112 valid rows: `मैं आपके दोस्त से बात करना चाहता हूँ`
is the speaker's gender however many friends it names. Both the third-person rule and the cue rule
are now waived when every swapped form is **speaker-locked** — followed by the 1sg copula हूँ, whose
only possible subject is मैं, or a `-ऊँगा` future. The machinery then does the right thing on the hard
case:

> `मुझे लगता है कि मैं उस जवान औरत को जानता हूँ जो बात कर रही है`
> → `… मैं उस जवान औरत को जानती हूँ जो बात कर रही है`

`जानता` (the speaker's) swapped; `रही` (the young woman's) untouched; `लगता` never considered.

### One found by calibrating on a second language

Spanish taught "can you hold this" as both *¿puedes sostener esto?* and *¿puedes mantener esto?*.
A shared-affix measure called them relatives — they share an **ending**, which in a suffixing
language is shared inflection, not a shared word. Shared endings are now weak evidence and flag
rather than assert. Welsh initial mutation (*dysgu*/*ddysgu*) is the opposite case and still passes.

### One silent zero

U+0964, the danda, sits inside the Devanagari range. With it in the word-boundary class,
`चाहता हूँ।` never matched and **every complete sentence in the course was skipped**. The count
looked plausible throughout. Excluded, with a test.

## Where it fires on the estate

`node tools/check-distinction-coverage.cjs --estate` — **118 of 146 courses** have an asymmetric
axis. Every language on the estate except the `zzz` test code has an entry.

- **Direction A, 30 courses.** The heartland is the 20 courses with English as the target. Highest
  expected volume: the Indic 668-seed block (eng_for_mar, _tel, _kan, _guj, _hin, _urd, _pan, _tam,
  _ben, _sin) and eng_for_jpn (formality, the heaviest on the estate).
- **Direction B, 92 courses.** The larger and, on the evidence above, more dangerous list — these
  are potentially unanswerable cards. Released and high-volume first: spa_for_eng, fra_for_eng,
  por_for_eng, ita_for_eng (gender + T-V), jpn_for_eng and kor_for_eng (speech level on *every*
  card), cym_n/s_for_eng (ti/chi), heb_for_eng (gender on every present-tense verb — the densest
  case on the estate), tha_for_eng (ครับ/ค่ะ).
- **Seven courses are two-sided**, with a collapse to teach on one axis and an unanswerable card to
  fix on another: the three Arabic-for-Japanese courses, ara_for_cym, jpn_for_zho, kor_for_zho,
  zho_for_jpn.

Only `hin` has morphology, so only eng_for_hin and hin_for_eng get A1/B1 today. Every other course
gets A2 and B2, which need no configuration.

### What deliberately does not fire

- **you-number, estate-wide.** English's one "you" covers both numbers, so a *tú/vosotros* split
  genuinely collapses — but it is an accepted whole-estate feature, and ~79 of the 283 asymmetric
  (course, axis) hits are this axis alone. Firing would drown every other signal.
- **`partial`** — marked but register-bound, optional or moribund: Japanese gender (register, not
  agreement), Basque *hika*, Mandarin 您, Afrikaans *u*, Swahili, Cornish.
- **`unknown`** — nobody has checked: Nepali gender (1sg feminine agreement is optional and usage
  varies), Hakka clusivity, Lombard/Romagnol/Venetian T-V. All are 0-seed or draft, so waiting
  costs nothing.

These are four distinct states on purpose. Folding `partial` and `unknown` into yes/no makes the
check either too loud or blind, and a wrong entry silently turns a whole course's check on or off.

## Known limits

- **The gate has no semantic knowledge.** A near-synonym pair in the known language ("speak"/"talk",
  "remember"/"recall") is called a wall when a learner might well connect them. It errs safe:
  withholding a proposal rather than making a bad one.
- **Relatedness is affix-based.** Templatic morphology (Arabic, Hebrew) and unspaced scripts
  (Japanese, Chinese, Thai) return `flag` — never a confident verdict they have not earned.
- **B1's "never taught" string is a mechanical swap** and can over-swap non-participant agreement
  elsewhere in the sentence (`समय नहीं था` → `थी`, where था agrees with समय). The finding is sound;
  the rendered counterpart is an illustration, not authored text.
- **A speaker-gendered form under a third-person subject is missed.** `वह मुझे अकेला नहीं छोड़ना चाहता था` —
  `अकेला` is the speaker's gender and English marks none of it, but the row dies on "he" in the answer.
- **B1 does not run on Spanish**, so the single largest Direction B population on the estate — 690
  rows in spa_for_eng — is visible only through worker #262's hand pass, not through the tool.
  Closing that needs Spanish morphology.

## Not done, on purpose

- No phrases were created. Proposing them is the deliverable.
- Nothing was written to course content; the course builder was not touched.
- Shuchita's other finding — the Hindi is too literal and too formal — is a separate, much larger
  pass and is untouched here.
