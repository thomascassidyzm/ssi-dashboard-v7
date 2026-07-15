# Swiss German — course convention & orthography decision

**Status:** decided 2026-07-15 (@claude-local, delegated by Kai). This doc is the *content premise* for
building a Swiss German course. It exists because Swiss German has **no official written standard** —
so before a single seed is built we must fix (a) *which* Swiss German and (b) *how to spell it*, and then
hold every builder to it. Read this before authoring/calibrating any `deu_ch_*` seed.

---

## 1. The problem (why this doc exists)

German-speaking Switzerland is **diglossic**. *Schweizerdeutsch* (Mundart) is the genuine spoken language
at **every** register — home, work, radio, politics. *Schriftdeutsch* (Swiss Standard German) is what
Swiss people **write**. Crucially:

- There is **no official orthography** for the spoken dialects. People text in ad-hoc phonetic spelling.
- "Swiss German" is not one thing — Bern, Zürich, Basel, Wallis etc. differ in vocabulary, vowels and
  verb forms, sometimes to the point of friction.

So we cannot just "translate to Swiss German." We must choose a **dialect** and a **spelling system**.

## 2. Decision

### 2a. Dialect → **Zürich German (Züritüütsch)**
The most-spoken variety (largest canton + city), the best-resourced, and the one other Swiss understand
most readily — the same "widest-reach colloquial" logic that makes **Egyptian** the default spoken Arabic.
A learner who speaks Züritüütsch is understood everywhere in Deutschschweiz.

> If we later want Bernese or Basel variants, they are *separate courses* (`deu_ch_be_*`, `deu_ch_bs_*`), built
> as deltas off this one — never mixed into it.

### 2b. Spelling → **Dieth-based phonetic ("Dieth-lite")**
Eugen Dieth's *Schwyzertütschi Dialäktschrift* (1938) is the established scholarly convention for writing
Swiss German consistently. We use a **pragmatic subset** — phonetic, "write what you hear in Zürich",
readable by anyone who knows German letters. This suits our **audio-first** method: the native Zürich
voice is the truth; the text is a predictable reading aid, not an authority.

### 2c. Course code → **`deu_ch_for_eng`**
Follows the established variant pattern `deu_[country]` (cf. `deu_at_for_eng` Austrian). Kai's call for
consistency across the German variants. `display_name`: "Swiss German for English Speakers";
`variant_label`/`learner_display_name`: "Swiss German (Zürich)".
> Naming note: `deu_ch` reads literally as "German (CH)", which could suggest Swiss *Standard* German. It
> does **not** here — this course teaches spoken **Züritüütsch** per this doc. There is no separate Swiss
> Standard German product; if one is ever wanted, disambiguate then.

## 3. Spelling rules the builder MUST hold consistently

These are hard, mechanical, course-wide. When a rule below and "what sounds right" conflict, the rule wins.

| Rule | Do | Not |
|------|----|----|
| **No ß, ever** | `ss` (`gross`, `heisst`) | `groß` |
| **`ch` = /x/** everywhere it's heard | `ich`, `nöd`, `machä`, `Chind` (=Kind), `Chuchi` | `Kind`, `Küche` |
| **Long vowel = doubled** | `Aabig` (evening), `Schtraass`, `guet`→`guät` no; `Zíít`→`Ziit` (time) | `Abig`, `Zit` |
| **`sch` before consonant** (st/sp → scht/schp) | `Schtei` (stone), `Schpital`, `bisch`, `hesch` | `Stein`, `Spital` |
| **Open /æ/ → `ä`** (Zürich is ä-rich) | `hätt`, `Chäschtli`, `wär` | `hett`, `wer` |
| **Diphthong `ei`→ Zürich [ai]** stays `ei`; `au` stays `au`; MHG `ei`→ often `ei` | `Stei`→`Schtei`, `Baum`→`Baum` | — |
| **Diminutive** | `-li` (`Chindli`, `Hüsli`, `bitzli`) | `-chen`, `-lein` |
| **No final -en; verbs/plurals in -ä or -e** | `machä`/`mache`, `chömä` (come), `Frauä` | `machen` |

Pick **one** spelling for a word the first time it appears and **reuse it verbatim** everywhere. If you
later notice a divergent spelling of an already-used word, **normalize to the first choice** and note it.
Consistency > perfection: a predictable wrong-ish spelling beats three "right" spellings of one word.

## 4. Core function-word & verb table (Zürich)

Anchor set — use these forms, don't drift to Standard German:

- **Pronouns:** ich / i · du · er · si · es · mir · ir (you-pl) · si — **Sie** (formal) deferred, like the
  other variants.
- **sii (to be):** ich bi · du bisch · er isch · mir sind · ir sind · si sind. past = **gsi** (`ich bi gsi`).
- **haa (to have):** ich ha · du hesch · er hät · mir händ · ir händ · si händ.
- **wele / wott (to want):** ich wott · du wottsch · er wott · mir wänd · ir wänd · si wänd.
- **chöne (can):** ich cha · du chasch · er cha · mir chönd · ir chönd · si chönd.
- **negation:** **nöd** (not) · **kei** (no/none) · **nüt** (nothing) · **niemert** (nobody).
- **high-freq:** isch (is) · au (also) · jetz (now) · scho (already) · nur/nu (only) · guet (good) ·
  gäll (right?) · es git (there is) · chli / es bitzli (a bit) · viil (much) · e / en / es (a, indef).

## 5. Methodology notes specific to Swiss German (feed into the pair-contract + ZUT)

1. **No preterite. Past = perfect, always.** Swiss German has lost the simple past; "I said" = `ich ha
   gseit`, "I was" = `ich bi gsi`. This is a **ZUT determinism win**: English simple-past and present-perfect
   both map to the one Swiss perfect. Do **not** invent a preterite.
2. **No genitive.** Use `vo` + dative (`s Buech vom Vatter`), like all spoken German.
3. **Future = present** (+ adverb) by default; `wird`-future is rare in speech — defer it.
4. **Register:** Mundart is the all-purpose spoken language, informal-default. Use `du` throughout; introduce
   `Sie` later exactly as the other variants introduce their formal pronoun. Do **not** treat Swiss German as
   "casual German" — it is the *complete* language for this learner.
5. **Diglossia caveat for known-side:** the *English* known side is unaffected; this is purely a target-side
   convention. Standard German spellings must never leak into the target text.

## 6. Build path (STARTED 2026-07-15 — Kai said go, build to 300)

Kai green-lit building to 300 seeds. Sequence being run:
1. ✅ Create the `deu_ch_for_eng` course row (`target_lang: deu`, display "Swiss German for English Speakers").
   Voice_config = TBD; **audio is a later, approval-gated step**, decoupled from content. (Azure `de-CH-*`
   voices are Swiss *Standard* German, not Mundart — a true Züritüütsch voice may need a clone/xAI. Hold.)
2. ✅ Init course_seeds from canonical, then **translate pass** (seed-level target_text, this convention).
3. **Build to 300** via `team-start` (target 300) once translation has a frontier. The builder produces
   golden seeds 1–10 too (no separate hand-calibration gate — but spot-check them hard against §3/§4/§5,
   since they anchor the rest). This doc is the calibration spec; paste it into the pair-contract.
4. Later: expand 300→668 like the other variants, and gender-prep + Haiku scan on the delta.

## 7. Open questions for Kai
- Zürich as the dialect — agreed? (vs Bern, or a deliberately "neutral"/media Mundart.)
- Dieth-lite spelling acceptable, or do you have a house convention you'd rather I follow?
- Is a genuine Mundart **voice** available/affordable, or do we hold audio and ship text-first?
