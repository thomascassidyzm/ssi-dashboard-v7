# Hand-audit: the 5,161 "decomposition no longer rebuilds its target" flags

**2026-08-12 · read-only. No writes, no repairs, no re-decomposition.**

Tom's challenge to the prior audit was: exact-rebuild equality is the wrong test, because a
breakdown is a *literal word-for-word gloss* of the target and legitimately differs from the
natural known-language phrase on the card — card says *I'm not sure*, target literally means
*not understand*, breakdown shows *not understand*, and that is **correct**, not drift.

## The headline: that objection cannot fire on this audit at all

I read `scripts/engforx-decompose/audit-recompose.cjs` before reading any row. The check
concatenates **`block.target`** — the target-language chunk of each block — and compares it to the
phrase's own **`target_text`**. It never touches the known side. So the literalness of the glosses
is invisible to it, and **no row can be a false positive for the reason Tom named.** Both strings
in every flag are target-side.

That does *not* make the metric clean — I found five other false-positive classes below. But the
false positives are mechanical (word order, contractions, a one-character typo, an
already-fixed leak), not the known-vs-literal split.

**Caveat on the source data**: the flag list is a snapshot taken before the `[introduce:false]`
fix landed. 54 of the 5,161 (all `eng_for_mar`) are already repaired and would not flag today.

---

## Sample A — 20 flagged `hye_for_eng` rows

Sampled evenly across the 2,658 flagged rows. Every column below is the phrase's **own Armenian**
vs what the stored breakdown blocks spell.

| # | row | target_text says | breakdown blocks say | judgment |
|---|---|---|---|---|
| 1 | `S0007L03C01` | որքան | որ**կ**ան | spelling (ք→կ) |
| 2 | `S0035L01U06` | այս**օ**ր … **օ**գնելու | այս**ո**ր … **ո**գնելու | spelling (օ→ո ×2) |
| 3 | `S0131L01B01` | գաղա**փ**արներ | գաղա**պ**արներ | spelling (փ→պ) |
| 4 | `S0132L02U02` | որ | **վ**որ | spelling (word-initial ո→վո) |
| 5 | `S0157L03U04` | որ … է | **վ**որ … **ե** | spelling (×2) |
| 6 | `S0195L02U04` | է | ե | spelling |
| 7 | `S0203L03U03` | հար**ց**նե**ի** | հար**ծ**նե**յի** | spelling (ց→ծ, +յ) |
| 8 | `S0251L02U05` | մինչ**և** | մինչ**եվ** | spelling (և ligature) |
| 9 | `S0261L01U01` | մտա**ծ**ում … կարևոր … է … որ | մտա**ձ**ում … կարեվոր**ի** … ե … **վ**որ | spelling ×4 (+ stray -ի) |
| 10 | `S0279L01U06` | որովհետև … շատ … մնացել | **վ**որովհետ**եվ** … շա**դ** … մն**տ**ացել | spelling ×3 |
| 11 | `S0048L02B02` | կարևոր չէ | կարև**ր** չ**ի ե** | spelling + չէ split into two blocks |
| 12 | `S0104L01B03` | է | ե | spelling |
| 13 | `S0034L04U04` | եր**բ** | եր**պ** | spelling (բ→պ) |
| 14 | `S0177L01U02` | է | ե | spelling |
| 15 | `S0028L01U06` | **օգտակար** … **օ**գնելու | **օժուտակ** … **ո**գնելու | spelling, one badly mangled |
| 16 | `S0085L02U07` | **ճ**անաչում … մարդկան**ց** … որ | **չ**անաչում … մարդկան**ծ** … **վ**որ | spelling ×3 |
| 17 | `S0142L03U05` | Սա … **ք**ո … որ … է | Սա**ս** … **կ**ո … **վ**որ … ե | spelling ×4 |
| 18 | `S0298L02U05` | է**ր** … որ … ոչինչ | **ե**ր … **վ**որ … **վ**ոչինչ | spelling ×3 |
| 19 | `S0073L02U03` | շնորհա**կ**ալություն | շնորհա**գ**ալություն | spelling (կ→գ) |
| 20 | `S0165L02U05` | վստա**հ** | վստա**ք** | spelling (հ→ք) |

**Split: 0 genuine stale drift · 0 Tom-class false positives · 20/20 a third thing —
phonetic misspelling of the phrase's own Armenian.**

Every substitution is a sound-alike pair in Armenian orthography: ք/կ, փ/պ, թ/տ, ց/ծ, չ/ճ, բ/պ,
կ/գ, և/եվ, օ/ո, է/ե, and word-initial ո written as վո. This is what Armenian written *by ear*
looks like. The blocks are not glossing an older sentence; they are glossing **this** sentence,
spelled wrong.

**Mechanical corroboration across all 2,658 hye flags.** Fold the sound-alike letter classes on
both sides and re-compare:

| after sound-alike folding | rows | share |
|---|---|---|
| exactly equal | 1,224 | 46.0% |
| within 12% edit distance | 1,258 | 47.3% |
| still substantively different | 176 | 6.6% |

So ~93% of the hye flag mass is orthography, not drift. The hand-read and the mechanical fold
agree.

Two things I saw in passing and am **not** counting as recomposition failures, but which are real
and worse than the spelling: several hye glosses are junk on their own terms — `S0142L03U05` and
four others gloss the copula է as the English letter **"e"**; `S0177L01U02` hangs the whole gloss
"where she wants to go" on the single word ուր; `S0298L02U05`'s card known_text is "I, she was
surprised I love nothing". That is a content-quality problem in `hye_for_eng`, independent of this
metric.

---

## Sample B — 20 flagged rows spread across ten other courses

| # | row | target_text | breakdown recomposes to | judgment |
|---|---|---|---|---|
| 1 | `deu_for_eng:S0144L01B02` | Ich bin **früh** aufgewacht | Ich bin aufgewacht **früh** | **FALSE POSITIVE** — discontinuous German verb bracket; blocks correct, concatenation order isn't |
| 2 | `deu_for_eng:S0288L01B03` | …reden mit Leuten über meinen Freund | …**arbeiten hier** | **STALE** — glosses a different sentence |
| 3 | `eus_for_eng:S0027L03U02` | ez dut gehiegi hitz egin nahi | gehiegi hitz egin nahi ez dut | **FALSE POSITIVE** (same words, block order scrambled — display defect, not drift) |
| 4 | `eus_for_eng:S0083L04U01` | …zenuenareki**n** | …zenuenareki | **FALSE POSITIVE** — one dropped character |
| 5 | `hrv_for_eng:S0190L02U03` | …ako ti postavim | …ako ti postavim **to** | **STALE** — spurious trailing block from an older target |
| 6 | `hrv_for_eng:S0198L01U01` | mislim da je to moja **ideja** | mislim da je to moja | **STALE** — final word missing from the breakdown |
| 7 | `ita_for_eng:S0136L03U07` | penso che **sia** una mia amica… | penso che **è** una mia amica… | **STALE** — target moved to the subjunctive, blocks didn't |
| 8 | `ita_for_eng:S0468L02U04` | …accanto **al** parcheggio… | …accanto **a il** parcheggio… | **FALSE POSITIVE** — contraction; the tiling is correct |
| 9 | `spa_for_eng:S0519L03U01` | todavía no he visto **a** su bebé nuevo | todavía no he visto su bebé nuevo | **STALE (mild)** — personal *a* untiled |
| 10 | `spa_for_eng:S0536L02U05` | me temo que estar loco tiene sentido ahora mismo | estar loco **ayer** | **STALE** — "yesterday" block in a sentence with no time reference |
| 11 | `el_for_eng:S0052L02U02` | …χτες βράδυ | …χτες **το** βράδυ | **STALE** — spurious block from an older target |
| 12 | `el_for_eng:S0129L03C01` | πας | **πηγαίνεις** | **STALE** — glosses a different verb form |
| 13 | `eng_for_jpn:S0161L06U02` | …because **I want** to read it? | …because **I'd like** to read it? | **STALE** — target reworded, blocks not refreshed |
| 14 | `eng_for_jpn:S0165L02C03` | I don't understand | **I'm not sure** | **STALE** — and this is Tom's own example row: the divergence is on the **English target** side, and the block "sure" carries the known-side 確信している. It is glossing a former target, not glossing literally |
| 15 | `eng_for_mar:S0223L01B03` | he's going to **ask you** | he's going to **not sure** | **STALE** — same "not sure" contamination |
| 16 | `eng_for_mar:S0587L02C01` | eggs | eggs `[introduce:false]` | **FALSE POSITIVE (already fixed)** — the directive leak repaired after the snapshot |
| 17 | `fra_for_eng:S0239L01U07` | …**la nuit dernière**… | …**hier soir**… | **STALE** — the documented wrong-slot time-expression pattern |
| 18 | `fra_for_eng:S0535L02C01` | choisirait | **`(included)`** | **GENUINE DEFECT** — a literal placeholder string is stored where the target chunk belongs |
| 19 | `rus_for_eng:S0076L04B03` | он помог тем, что начал говорить быстрее | тем, что **я знаю** | **STALE** |
| 20 | `rus_for_eng:S0152L04B03` | Я знал ответ | знал**, что** | **STALE** |

**Split: 15 genuine (13 stale drift, 1 mild untiled function word, 1 placeholder string) ·
5 false positives · 0 of them Tom's known-side-literal class.**

---

## Estate-wide mechanical shape of all 5,161 flags

Classifying every flagged row by *how* the two strings differ (no LLM, pure string comparison):

| class | rows | share |
|---|---|---|
| near-miss (≤10% edit distance) | 2,668 | 51.7% |
| substantive divergence | 2,382 | 46.2% |
| same words, different order | 56 | 1.1% |
| `[introduce:false]` leak (already fixed) | 54 | 1.0% |
| spacing only | 1 | 0.02% |

Per course, the two big offenders have **opposite** shapes:

- `hye_for_eng` — 2,183 near-miss / 475 substantive → and after sound-alike folding only 176 are
  substantive. **An orthography problem.**
- `spa_for_eng` — 191 near-miss / **779 substantive** / 7 order → the divergences are real content,
  matching what I hand-read (`ayer` in a sentence with no yesterday). **A drift problem.**

`deu_for_eng` is the third shape again: 37 of its 115 are pure word-order — the German verb bracket
false-positiving, exactly sample row 1.

---

## Verdict

**Tom's specific objection does not hold on this metric** — the check compares target-side to
target-side and never sees a known-side gloss, so literal-gloss-reads-unnaturally cannot produce a
flag. The metric *is* noisy, but from word order, contractions, typos and one already-fixed leak
(5/20 in the cross-course sample; ~2% of flags estate-wide by the mechanical classes).

**`hye_for_eng` is structurally broken, but not in the way the number implied.** 20/20 hand-read
rows and ~93% of the flag mass are phonetic misspellings of the phrase's own Armenian — the
breakdown shows the learner a correctly-segmented, correctly-ordered, *misspelled* sentence.
That is a real learner-facing defect and it is course-wide, but it is a **spelling-normalisation**
problem, not a re-decomposition problem: the segmentation and ordering are fine, so nothing here
needs `decomposeAnchored` or a salient-LEGO parent. Whether it is even repairable by rule depends
on which side is wrong — if the seeds themselves are also partly written by ear, folding blocks to
match `target_text` would be papering over a deeper authoring problem. **A repair job is worth
scoping, and it should be scoped as an Armenian orthography pass, not as a re-decomposition.**
Separately, `hye_for_eng`'s glosses ("e" for է, whole-sentence glosses on single words) look bad
enough that the course deserves a content review on its own account.

**The rest of the estate is smaller but genuinely stale.** `spa_for_eng` (977 flags, 80%
substantive) and the long tail — wrong time expressions, subjunctive drift, "not sure" leaking into
unrelated phrases, and at least one `(included)` placeholder rendering to a learner — are true
drift, and 15/20 of the cross-course sample were real. That bucket, not hye, is the one that needs
re-decomposition if anything does.

**No repairs scoped, none started, nothing written.**
