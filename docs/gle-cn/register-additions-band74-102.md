# Register additions — band 74–102 (coordinator + workers B1–B4)

Filed under §G of the night addendum: never edit the shared register directly, file here and let the
coordinator merge. Night of 20–21 August 2026, course `gle_cn_for_eng`.

---

## 1. "to help me" — a live ZUT break repaired at seed 74

| English | Irish | authority | confidence |
|---|---|---|---|
| to help me / for helping me | `cúnamh dhom` / `as cúnamh dhom` | addendum §C2 (`cúnamh` 42 vs `cabhrú` 1 in Ó Curnáin); live at seeds 25 and 161 | confident |

Seed 74's translation read `as cabhrú liom`, which is the form §C2 explicitly forbids and which
collides with the `cúnamh dhom` already taught at seed 25. It was translation-only and not yet
decomposed, so the break had not reached a teaching unit. **Repaired before decomposition** to
`Go raibh míle maith agat as cúnamh dhom tuiscint`. Had it been decomposed as written, the course
would carry two competing teaching units for *help*, permanently.

Note the preposition travels with the word: `cúnamh` governs `do`/`dho`, never `le`.

### The sweep, run — and it is worse than one seed ⚠️

**Twelve seeds still hold `cabhrú`, and six of them are already decomposed.** The break has reached
teaching units and practice phrases; it is no longer a translation-only problem.

Live legos carrying the forbidden form:

| seed | gloss | Irish |
|---|---|---|
| 62 | help you | `cabhrú leat` |
| 63 | helping me | `cabhrú liom` |
| 168 | to come and help | `teacht agus cabhrú` |
| 171 | me to help you | `go gcabhróinn leat` |
| 226 | helping me | `cabhrú liom` |
| 249 | you to help me | `go gcabhrófá liom` |

Roughly thirty practice phrases hang off those six. Note the direct collision: **seed 63 teaches
*"helping me"* → `cabhrú liom` while seed 74 teaches *"for helping me"* → `as cúnamh dhom`.** Same
verb, same learner, two forms — and §C2 says the one with 1 corpus hit is the one that is live.

Still translation-only, so cheap to repair before anyone decomposes them: **142, 176, 203, 204, 236,
246**.

**Not repaired here.** These sit outside band 74–102, and the six decomposed ones would need the
standing content-change migration protocol rather than an in-place edit. This is a coordinator
decision and it should be made tonight, before the remaining six are decomposed and the cost
doubles.

---

## 2. "I don't know" — two Irish forms behind one English prompt ⚠️ OPEN TRIPWIRE

| English | Irish | sense | first at |
|---|---|---|---|
| I don't know (a person) | `níl aithne agam ar` | acquaintance | S85 |
| I don't know (a fact) | `níl a fhios agam` | knowledge | register, not yet a lego in this band |

Seed 85's teaching unit is glossed bare **"I don't know"** and maps to the *acquaintance* form.
The *fact* form is a different Irish string behind an identical English prompt. Seeds 87 and 88
stay clear by glossing *"that I don't know"*, but the bare gloss at 85 is a live tripwire: the
first worker to build a fact-knowing seed and gloss it "I don't know" breaks ZUT.

**Recommendation (coordinator call, not made here):** re-gloss the S85 unit to name its sense —
e.g. *"I don't know"* → *"I don't know them"* / *"I'm not acquainted with"* — or reserve the bare
gloss for the fact sense and disambiguate at 85. Either way it should be decided once, centrally,
before the fact-knowing seeds are built.

---

## 3. Forms introduced in this band, for ZUT inheritance

| English | Irish | confidence | seed |
|---|---|---|---|
| thank you very much | `go raibh míle maith agat` | confident | 74 |
| to understand (verbal noun) | `tuiscint` | confident | 74 |
| unfortunately | `faraor` | confident | 86 |
| it wasn't possible | `ní raibh sé indéanta` | best attempt — no register row for *possible*; negates cleanly on the existing `ní raibh sé` backbone | 86 |
| that would be great | `bheadh sé sin go hiontach` | best attempt — regular conditional of *bí* with fronted `sé sin`, not directly attested | 90 |
| more slowly | `níos moille` | confident — follows the register's own comparative pattern | 90 |

---

## 4. A note on `ag cheapadh`, so nobody "fixes" it again

`ag cheapadh` with the `ch-` is **not** a typo and the register already carries a boxed warning
about it (`ag cheapadh` 58 vs `ag ceapadh` 9 in running speech, six named speakers). It was flagged
as a lenition error twice tonight by people reading it fresh, including by me. **Do not correct it.**

---

## 5. Two build-time facts that are not linguistic but cost real time

Neither belongs in the shared register; both belong wherever the next builder will look, and are
now appended to `scripts/gle-cn/READ-ME-PRECHECK.md`.

- **`vocab.cjs` prints words; the gate enforces whole taught chunks.** At seed 74 the words *more*,
  *starting*, *difficult*, *yesterday*, *morning* and *said* all appear in its 215-word list and are
  all rejected as unknown glosses. The true palette — 144 chunks at that point — comes from
  `scripts/gle-cn/w-D2/chunks.cjs <seed>`, which prints every `known → target` pair introduced so
  far. Writing from the word list produces a wall of rejections.
- **Initial mutation breaks the containment gate.** A lego target `tuiscint` is not found inside
  `a thuiscint`; `daoine` is a taught chunk, `dhaoine` is not; `foghlaim` is, `a fhoghlaim` is not.
  Ordinary sentences are therefore unwritable, and the honest response is to write a plainer
  sentence rather than Irish that tiles but is wrong. This shaped seed 74 (the *to understand* unit
  is objectless throughout) and forced a real design choice at seed 88, where the unit was taught as
  `bheith ag caint le daoine` specifically so the learner can assemble the seed's own sentence.

### ⚠️ `vocab.cjs` was silently wrong on the English side, and it is now fixed

**Tom's ruling, 2026-08-21: a measure that lies is worse than no measure — fix the thing that claims
to work.** So this was fixed rather than worked around. Root cause, both symptoms, one bug:

**`demutate` is an Irish rule and it was being applied to the English side too.** Its lenition
clause (consonant + `h` → consonant) silently rewrote ordinary English words:

| written | what the tool stored |
|---|---|
| the | `te` |
| that | `tat` |
| think | `tink` |
| this | `tis` |
| thank | `tank` |
| she | `se` |
| show | `sow` |
| than | `tan` |

Two kinds of damage at once. It **filled the known list with non-words** — which is why the list
reads as larger than the gate actually allows, and why a worker could look up a word that was
plainly taught and not find it. And it **conflated distinct English words**: because *thank*
stored as `tank`, a phrase using an untaught *tank* would have passed. **A checker that lets a
breach through is worse than no checker.**

The contraction symptom is the same bug's second head: nothing expanded contractions, so *she's*
tokenised as `se's` and matched nothing, while the submit endpoint expands it to *she is* and
accepts it happily. The checkpoint and the endpoint therefore **disagreed about natural English**,
and the disagreement pushed workers into stiffer phrasing to appease a tool that was wrong — a
quality cost paid invisibly, right across the course.

**The fix, applied:** the known side no longer demutates, and it now tokenises through the submit
endpoint's **own** exported `tokenizeKnown` from `services/course-builder/lib/validation.cjs`, so
the two agree by construction rather than by coincidence. `scripts/gle-cn/vocab.cjs` gains a
`knownWords` export; `checkpoint.cjs` uses it for every known side. The Irish `words`/`demutate`
path is untouched — mutation handling on the target side was always correct and is still needed.

**Standing instruction for other bands until you have pulled this fix:** if a contraction is the
natural way to say something and the endpoint accepts it, **write the contraction** and note the
checkpoint disagreement. Do not reword to satisfy the checker.


---

## 6. `Aontaím leis` — sized, because the ruling is still open

The addendum lists *`Aontaím leat` vs `Tá an ceart agat`* as **still genuinely open, do not harden**.
Seeds 83 and 84 were already translated with `aontaím` before this band began, so they were
decomposed as translated — no worker took a vote it was not entitled to.

**Blast radius, measured rather than estimated:** 2 teaching units (`aontaím leis` at S83,
`ní aontaím leis` at S84) and **24 practice phrases** across the two seeds. Nothing else in the
course uses the word.

If the ruling lands on `Tá an ceart agat` this is **not a word swap** — the frame changes shape,
so both units and all 24 phrases are rewritten. 83 and 84 are a matched positive/negative pair and
must move together. Worth noting `aontú` scores **zero** in Ó Curnáin, though a bare zero is not
evidence and this one has not been re-run against the apostrophe and binary-file traps.

## 7. Band totals, for the record

24 seeds decomposed in this band (74–77, 83–102): **63 teaching units, 514 practice phrases**.
Including the five that were already banked (78–82), seeds 74–102 stand at 29/29 translated,
29/29 decomposed, 73 units, 594 phrases. `course_audio`: **0 rows, before and after**.
Annotated-`try` count: **14, all in seed 102**, all `tá muid ag iarraidh`, all under `<!--TRY-OPEN-->`.
