# Pennsylvania Dutch (Deitsch) → English — `pdc_for_eng`

**Verdict: most viable of the batch.** Real candidate, not just a probe — we have a native
checker (Kai, 2026-07-03). Good source scholarship exists (Mark Louden). Adapted structurally
from the Standard German course, but Deitsch descends from **Palatine German, not Hochdeutsch** —
do not treat it as "German with a spelling change."

**Status:** Fable probe only. No DB rows, no LEGOs, no audio. `pdc` code not yet registered
(absent from `language_codes.csv` — must be added before any build).

Sources: [Wikipedia: Pennsylvania Dutch language](https://en.wikipedia.org/wiki/Pennsylvania_Dutch_language) ·
Louden 2019, ["The English Infusion in Pennsylvania German"](https://padutch.net/wp-content/uploads/2020/01/Louden_English_Infusion_in_PA_German_2019.pdf) ·
[padutchdictionary.com](https://www.padutchdictionary.com/) (Beam-based) · Wiktionary PG entries.

---

## 1. Orthography decision: Buffington-Barba-Beam (BBB), Lancaster norm

**Correction to a common mis-framing:** the two spelling camps are **not** "Buffington-Barba vs
Beam." C. Richard Beam's system *is* the German-based standard — **Buffington-Barba-Beam (BBB)**.
The competing camp is the **unstandardized English-phonetic** tradition used in many Amish
publications (*shvetza* for *schwetze*). If a build brief says "use the Beam system" meaning the
phonetic one, you get exactly the wrong output.

| BBB (German-based, chosen) | English-phonetic (Amish) |
|---|---|
| *Unser Vadder im Himmel, dei Naame loss heilich sei…* | *Unsah Faddah im Himmel, dei nohma loss heilich sei…* |

**Use BBB**, because: SSi is audio-first (learners barely see text, so "reads intuitively for
English speakers" buys little); **every validation asset we have** (dictionaries, Wiktionary
conjugation tables, Louden's corpus) is in BBB; the phonetic camp has no internal standard, so we
couldn't even be *consistently* phonetic. Caveat: **ask the checker which system they read
comfortably** — if Amish and BBB is alien, keep BBB as canonical storage and give them audio + a
one-page BBB key.

Sample BBB: *Deitsch, schwetze, hawwe, net, nau, ebbes, yuscht, bissel, mei/dei, deheem, awwer*.

## 2. Where "just tweak the German" fails

- **Case system collapsed.** No genitive at all (possession = *em Mann sei Hund* or *vun*).
  Accusative/dative lost on nouns; pronouns keep only subject/object. German article gymnastics
  (*einen/einem/eines*) → mostly `en` / `der/die/es`. **`es`, not `das`, for neuter "the".**
- **No simple past except *war*.** Everything past is perfect (*ich hab gsaat*, not *ich sagte*).
- **Future = *zeele/zelle* (Lancaster) or *figgere* (Midwest) + infinitive**, grammaticalised from
  "count/figure" — NOT German *werden*.
- **Obligatory progressive**: *ich bin am schwetze* — the `am` + infinitive aspect is *not* optional
  as it is in European German. A German adaptation that ignores it is systematically wrong.
- **Infinitive marker *zu* is lost**: English "to VERB" → `fer` or nothing; **modals take a bare
  infinitive** (no `fer`). Conditional uses *deet* (< *täte*), not *würde*.
- **Lexicon**: `schwetze` = speak (***sprechen does not exist in Deitsch***); `gleiche` = to like
  (vicious false friend — Std German *gleichen* = resemble); `net` = not; `nau` = now; `ebbes` =
  something; ~15–20% English-derived vocab (*die Kaer*, *der Schtohr*, *bikahs*), which still takes
  German inflection.
- **Sound shifts are etymological, not mechanical**: *daheim→deheem* but *mei/dei/Zeit* keep *ei*
  (MHG *ei* shifts, MHG *î* doesn't). **Never apply a sound-shift rule generatively** — only use
  dictionary-attested forms.
- What carries over: V2 main clauses, verb-final subordinate clauses, the *Satzklammer*, separable
  prefixes, 3 genders, `ge-…-t` participles. The German course's word-order pedagogy mostly survives.

## 3. Core verb forms (present, Lancaster BBB)

| verb | ich | du | er/sie/es | mir | dihr | sie |
|---|---|---|---|---|---|---|
| **sei** (be) | bin | bischt | is(s) | sin | sind/sint/seid ⚠ | sin |
| **hawwe** (have) | hab | hoscht | hot | hen | hend | hen |
| **schwetze** (speak) | schwetz | schwetscht | schwetzt | schwetze | schwetzt | schwetze |
| **wolle/welle** (want) ⚠ | will | **witt** (not *willst*) | will | wolle | wollt | wolle |
| **kenne** (can/know) | kann | kannscht | kann | kenne | kennt | kenne |
| **misse** (must) | muss | musscht | muss | misse | misst | misse |
| **brauche** (need; modal + bare inf) | brauch | brauchscht | braucht | brauche | braucht | brauche |
| **browiere** (try, weak; pp *browiert*, no *ge-*) | browier | browierscht | browiert | browiere | — | browiere |

Pronouns: ich, du, er/sie/es, **mir** (we), **dihr** (you-pl), sie. **No formal *Sie*** — *du* to
everyone. ⚠ = native-checker question (see §6).

## 4. Seeds 1–10 (Fable candidate — BBB, not native-verified)

| # | English | Deitsch (BBB) | Conf. | Flag |
|---|---|---|---|---|
| 1 | I want to speak Pennsylvania Dutch with you now | **Ich will nau mit dir Deitsch schwetze.** | HIGH | *mit dir* vs *mit dich*; *nau* placement |
| 2 | I'm trying to learn | **Ich bin am browiere fer lanne.** | LOW | try-complement unresolved |
| 3 | how to speak as often as possible | **wie mer so oft wie meeglich schwetzt** | MED | impersonal *mer*; equative *wie* vs *as* |
| 4 | how to say something in Pennsylvania Dutch | **wie mer ebbes uff Deitsch saagt** | HIGH | — (*uff Deitsch saage* attested) |
| 5 | I'm going to practise speaking with someone else | **Ich zeel es Schwetze mit ebber schunscht iewe.** | LOW | *iewe* vs loan *praeckdisse*; *ebber schunscht* vs *ebber anners*; *zeel/zell* |
| 6 | I'm trying to remember a word | **Ich bin am browiere fer mich an en Watt bsinne.** | LOW | *sich bsinne* government; try-complement |
| 7 | I want to try as hard as I can today | **Ich will heit so hatt browiere wie ich kann.** | MED | *hatt browiere* idiomatic? vs *mei Bescht duh* |
| 8 | I'm going to try to explain what I mean | **Ich zeel browiere auslege was ich meen.** | LOW-MED | *auslege* register (also "lay out a corpse"); triple verb cluster |
| 9 | I speak a little Pennsylvania Dutch now | **Ich schwetz nau bissel Deitsch.** | HIGH | *bissel* vs *en bissel* |
| 10 | I'm not sure if I can remember the whole sentence | **Ich bin net sicher, eb ich mich an die ganz Sentence bsinne kann.** | LOW | "sentence" & "sure" unresolved (see trap) |

**⚠ Trap avoided:** PD **`Satz` = yeast / leaven / coffee grounds**, not "sentence." The German
calque *der ganze Satz* would teach "the whole batch of yeast." Fable used the English loan
*Sentence* pending the checker's call.

## 5. Opus-escalation guidance

Low-confidence seeds (2, 5, 6, 8, 10) contain constructions Fable could not fully attest online.
If escalating to Opus before native check: focus Opus on the **`browiere` "try to VERB" complement**
(seeds 2/6/8 — one ruling fixes three), the **progressive vs simple present** boundary, and the
**verb-cluster ordering** in seeds 8/10. Everything else is a lexical/orthographic lookup better
answered by the checker than by any model.

**Haiku shibboleth scan** (cheap defect catcher for a German-adapted build): flag any output
containing *sprechen, nicht, jetzt, wir, etwas, das* (as neuter "the"), `zu`+infinitive,
*werden*-future, *würde*, or genitive endings — all are Hochdeutsch leakage, i.e. defects, not variants.

## 6. Native-checker questions (before seed 1)

1. **`browiere` "try to VERB" complement** (top Q; seeds 2/6/8): *am browiere fer lanne*,
   *am browiere lanne*, or other? (Beam corpus hints bare infinitive: *fer browiere ausfinne*.)
2. **Future aux**: *zeel* or *zell* spelling; is *zeele* + inf your community's natural "going to"?
3. **`mit dir` or `mit dich`** (seed 1) — conservative dative vs modern dative-loss?
4. **"sentence"**: English loan (*die/es Sentence*, which gender?) or does *Satz* also cover it in
   school/church talk? (Dictionary only attests *Satz* = yeast/grounds.)
5. **"sure"**: *sicher* or loan *schur* (cf. *ferschur*)? Is *Ich bin net sicher* Hochdeutsch-flavoured?
6. **`sich bsinne` government** (6, 10): *mich an ebbes bsinne*, another preposition, or *ich kann
   mich net bsinne* + clause?
7. **"practice"**: *iewe* (reflexive obligatory? takes *es Schwetze*?) or loans *praeckdisse/braeckdisse*?
8. **"explain"**: *auslege* (odd given funeral sense?), *verklaere*, or an English loan?
9. **"someone else"**: *ebber schunscht* or *ebber anners*?
10. **Spelling `eb` vs `ob`** (seed 10).
11. **Impersonal `mer`** (3, 4): natural for "how to speak/say", or e.g. *wie's gsaat watt*?
12. **Equative particle** (3, 7): *wie* or *as*?
13. **Region/community** (Lancaster vs Midwest → *zeele*/*figgere*, *dihr* endings) — pin once, lock
    course-wide; the checker's variety **is** the course standard, not "corrected" against references.
