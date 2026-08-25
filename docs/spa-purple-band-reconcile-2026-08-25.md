# spa_for_eng Purple band — reconcile the (B) investigation against the live DB, then fix

**Date:** 2026-08-25 · **Course:** `spa_for_eng` (live code confirmed against `courses`: released, 668 seeds)
**Source (B):** read-only Purple-band investigation, 29 defects, seeds 150–279 — published at `/d/74376cd0`
**Source (A):** `docs/spa-250-300-section-a-applied-2026-08-24.md` — 19+1 phrase corrections applied to live on 2026-08-24

---

## 1. The number Kai asked for

**Of (B)'s defects, only 3 had already been closed by the earlier (A) pass. 20 were still broken. 0 never existed as described. The 250–262 overlap closed almost nothing.**

I have now fixed **19 of those 20 in the live database**, plus **2 more of the same fault that I found in-band and (B) did not list** — 21 writes in total. 1 is blocked on untaught vocabulary and is reported, not fixed.

| | count |
|---|---|
| (B) defects **enumerated** in the reachable document | **23** |
| — already fixed by pass (A) | **3** |
| — **still broken** when I read the live row today | **20** |
| — never existed as described | **0** |
| (B) defects **not** enumerated anywhere I could reach | **6** (gap, §5 — 29 claimed, 23 listed) |
| Fixed by me today | **21** (19 of the 20, + 2 of my own finds) |
| Left broken, blocked on untaught vocabulary | **1** (`S0277L01U11`) |

The 23 enumerated are: 11 singletons in the document's table, plus the family of 6 `ese hombre`, plus the family of 6 `con el que` (two of the table's 13 rows are themselves family members, which is why 13 + 6 + 6 resolves to 23 phrases and not 25).

The three already closed by (A) — verified by reading the live row, not by trusting (A)'s own log:

| phrase | (B) said | live text today | verdict |
|---|---|---|---|
| `S0267L01U11` | Spanish stops mid-sentence | `Sé que has tenido noticias de tu amigo así que no me preocupo` | **already fixed** |
| `S0263L01U14` | invents "mi amigo" | `No sé a quién te refieres pero él trabajaba en una oficina` | **already fixed** |
| `S0263L01U10` | English past, Spanish present | `…estaba intentando ayudarme` | **already fixed** (tense) |

`S0262L03U09` is the near-miss worth naming: (A) *did* touch it on 2026-08-24 and fixed its tail clause, but left the `con el que` fault untouched. It is counted as **still broken**, because the defect (B) named was still live.

**The two named mechanical families were untouched by (A). Both were still 12-for-12 broken.**

### Calibration, before any count was reported
- **Known-broken control:** `S0262L01U09` — live text read back as `No sé quién era ese hombre aquí antes` against English `I don't know who that was here before`. Method called it **still broken**. Correct.
- **Known-fixed control:** `S0267L01U11` — live text read back complete, `updated_at` 2026-08-24, `version` 19. Method called it **already fixed**. Correct.

Method is: read the current `target_text` from `course_practice_phrases` by primary key and compare against the exact Spanish (B) quoted. No doc, no cache, no assumption about the 250–262 overlap.

---

## 2. Family 1 — bare English "that" rendered as "ese hombre" (6 rows, all still broken, all fixed)

All six are in seed 262, lego 1. The English says "who **that** was" — no man, no person named. The Spanish asserted `ese hombre`.

The fix drops the invented noun and keeps the demonstrative: `ese hombre` → `ese`. Where that left a dangling modifier (Spanish does not take an attributive gerund the way English does), the taught relative `que estaba` was added — `estaba hablando` and `estaba aquí` are both already in this seed's own material.

| phrase | English spoken | was | now |
|---|---|---|---|
| `S0262L01U08` | Do you know who that was talking with you yesterday? | ¿Sabes quién era **ese hombre** hablando contigo ayer? | ¿Sabes quién era **ese que estaba** hablando contigo ayer? |
| `S0262L01U09` | I don't know who that was here before | No sé quién era **ese hombre** aquí antes | No sé quién era **ese que estaba** aquí antes |
| `S0262L01U10` | I don't know who that was yesterday | No sé quién era **ese hombre** ayer | No sé quién era **ese** ayer |
| `S0262L01U11` | Do you know who that was talking with me last night? | ¿Sabes quién era **ese hombre** hablando conmigo anoche? | ¿Sabes quién era **ese que estaba** hablando conmigo anoche? |
| `S0262L01U14` | He told **you** who that was, didn't he? | Dijo quién era **ese hombre**, ¿verdad? | **Te** dijo quién era **ese**, ¿verdad? |
| `S0262L01U15` | Do you know who that was here just now? | ¿Sabes quién era **ese hombre** aquí hace un rato? | ¿Sabes quién era **ese que estaba** aquí hace un rato? |

`S0262L01U14` carried a second mismatch (B) did not list: English "told **you**", Spanish had no addressee. Since the row was being rewritten anyway — and its clip was going stale either way — the clitic was restored in the same edit.

**Not touched, deliberately:** the eight rows in seeds 227/228/230/231/262 where the English genuinely says "that man" / "that elderly man". `Ese hombre` is correct there. Those are not defects and were not counted as any.

## 3. Family 2 — "con el que" for a free relative (6 rows, all still broken, all fixed)

Seed 262, lego 3. The LEGO is `who you were talking to` → `con el que estabas hablando`, which is **correct Spanish when it hangs off a noun** — `el hombre con el que estabas hablando`. It is wrong when the English has no antecedent, because the clause is then an embedded question and Spanish requires the interrogative `con quién`.

`quién` is taught in this very seed (lego 1, `quién era`), so the fix is entirely within taught vocabulary.

| phrase | English spoken | was | now |
|---|---|---|---|
| `S0262L03U02` | I can't remember who you were talking to in the office yesterday | No puedo recordar **con el que**… | No puedo recordar **con quién** estabas hablando en la oficina ayer |
| `S0262L03U03` | I know who you were talking to because my friend used to work **there** | Sé **con el que** … porque mi amigo trabajaba **en una oficina** | Sé **con quién** estabas hablando porque mi amigo trabajaba **allí** |
| `S0262L03U06` | I don't know who you were talking to but it's the same thing… | No sé **con el que**… | No sé **con quién** estabas hablando pero es lo mismo de lo que estábamos hablando antes |
| `S0262L03U09` | I knew who you were talking to because he was trying to help me | Sabía **con el que**… | Sabía **con quién** estabas hablando porque estaba intentando ayudarme |
| `S0262L03U11` | I can't remember who you were talking to but I know he was there | No puedo recordar **con el que**… | No puedo recordar **con quién** estabas hablando pero sé que estaba allí |
| `S0262L03U13` | I knew who you were talking to because he wanted to meet with my friend | Sabía **con el que**… | Sabía **con quién** estabas hablando porque quería reunirse con mi amigo |

`S0262L03U03` carried the invented "en una oficina" that (B) listed as a separate defect; both faults are closed in the one edit.

**Not touched:** the eight rows in the same seed that DO have an antecedent (`B02`, `B03`, `B04`, `U01`, `U04`, `U05`, `U08`, `U12`). `Ese hombre con el que estabas hablando ayer` is correct and stays.

**No LEGO text was changed, so no presentation clip needs repair.** `S0262L03` still reads `con el que estabas hablando`, which is what eight surviving phrases exercise. That said — **a judgement call for Kai**: the LEGO's English gloss, bare `who you were talking to`, is what invited the six wrong uses in the first place. Re-glossing it (e.g. to something that forces an antecedent) would be correct but *would* change the LEGO text and therefore require a new presentation clip. I did not do that unilaterally.

## 4. The nine singletons

| phrase | English spoken | was | now | status |
|---|---|---|---|---|
| `S0272L03U12` | …because that is **always** the best way | porque **pienso que** eso es lo mejor | porque eso **siempre** es lo mejor | fixed |
| `S0274L02U13` | …or if you want to **stay** a bit longer | o si quieres **esperar** un poco más | o si quieres **estar aquí** un poco más | fixed |
| `S0275L01U05` | …before he has to say what he **thinks** about everything | decir lo que **quiere** sobre todo esto | decir lo que **piensa** sobre todo esto | fixed |
| `S0275L01U06` | …before we try to speak **to others** | antes de intentar hablar | antes de intentar hablar **con otras personas** | fixed |
| `S0277L01U03` | …and **everyone** was happy with it | y que **estaba contento** con eso | y que **todos estaban contentos** con eso | fixed |
| `S0267L01B05` | **I'd like to** know if you've had news… | **Quería** saber si… | **Me gustaría** saber si… | fixed |
| `S0279L02U08` | …before the **end of the week** | antes del **fin de semana** | antes del **fin de la semana** | fixed |
| `S0244L02U04` | …before the **end of the week** | antes del **fin de semana** | antes del **fin de la semana** | fixed (my find, in band) |
| `S0252L01U07` | …before the **end of the week** | antes del **fin de semana** | antes del **fin de la semana** | fixed (my find, in band) |
| `S0277L01U11` | a **short** meeting | tener una reunión | *unchanged* | **BLOCKED** — see below |

Two notes on judgement:

- **`S0275L01U05` uses `piensa`.** `pensar` is taught at seed 37 and `piensas` at 135, but the third-person `piensa` does not otherwise appear in this course until seed 651. I take a person-inflection of a taught verb, in a course that has been drilling `quiere`/`era`/`estaba` for two hundred seeds, as taught vocabulary rather than a new LEGO — but I am flagging it rather than burying it, because it is the one fix where that call is arguable.
- **`S0277L01U11` is blocked and stays broken.** The English clip says "a **short** meeting". No Spanish word for *short* exists anywhere in this course before seed 277 — `corta`, `breve`, `rápida`, `larga`, `pequeña` are all untaught (`pequeña` first appears at 553, `largo` at 592). Kai's rule (a) forbids fixing with an untaught LEGO, so the choices are: teach an adjective here, delete the phrase (which triggers the content-change migration protocol), or re-cut the English so it stops saying "short". **That is Kai's call, not mine.** I left the row alone.

`fin de la semana` vs `fin de semana` is not pedantry: `el fin de semana` is *the weekend*, `el fin de la semana` is *the end of the week*. Both are built entirely from morphemes the course already teaches (seed 38 onward); the fix is one inserted article.

**Out of band, same fault, NOT fixed** (seed > 279, outside this job): `S0295L01U10` — English "before the week was over", Spanish `antes del fin de semana`. Worth adding to whoever takes 280–300.

---

## 5. Explicit gaps

1. **Six of (B)'s 29 defects are not enumerated in any document I can reach.** The published write-up at `/d/74376cd0` names 13 table rows plus the two families of six — **23** distinct phrases once the overlaps are resolved (one table row *is* a family-1 member; another is a family-2 member). It does not contain a full 29-row table. The only link it offers goes to the *repetition* analysis, not the defect list, and I could not find the underlying detail in either repo. **I have not reconciled those 6, and I will not pretend otherwise.** Two independent read-only sweeps of seeds 150–214 and 215–279 (jobs **#506** and **#507**, sonnet) are in flight to surface whatever they were; their reports land in the parent conversation.
2. **My reconciliation covers what the document actually states.** Where (B) quoted only a fragment of the Spanish (`…antes del fin de semana`), I matched the fragment to a live row by exact substring search across seeds 140–300 and took the row whose English matched (B)'s English exactly. Every one of the 23 resolved to exactly one row; none was ambiguous.
3. **Two of my 21 fixes are outside (B)'s list.** `S0244L02U04` and `S0252L01U07` carry the identical "end of the week → weekend" fault, in band, and (B) named only the seed-279 instance. They may well be two of the missing six; I cannot know that, so I have counted them separately as my own finds rather than claiming them against the 29.

## 6. False positives I hunted and dropped

Before reporting, I re-read every fix against the "normal Spanish is not a defect" list. Things I checked and did **not** count:

- Dropped subject pronouns throughout seed 262 (`Sabía…`, `Dijo…`) — normal, left alone.
- `estaba` vs `estuvo` in the family-1 repairs — English simple past takes either; I used the imperfect that matches the surrounding seed and did not flag any preterite/imperfect choice as a defect anywhere.
- `pienso que` as a rendering of English "I think" — correct, and untouched except at `S0272L03U12` where the English contains **no** "I think" at all.
- `decirte` / `ayudarme` / `dárselo` clitics — added clitics, normal, not counted.
- `has tenido` for English "have had" — Peninsular present perfect, correct, not counted.
- The eight correct `ese hombre` rows and the eight correct `con el que` rows (§2, §3) — these are the obvious false positives a string-matching sweep would have produced, and they are the reason the families are six each and not fourteen each.
- `no sé si` for "I am not sure if" at `S0274L02U13` — a looser rendering than `no estoy seguro de si`, but not a mismatch of meaning; left alone, only the `esperar`/`estar` fault was fixed.

**ZUT check before writing:** for each of the 21 rows, every other phrase in the course sharing the same known prompt was pulled and compared. **Zero ZUT twins, zero conflicts.** No new fix collides with an existing known → target mapping.

---

## 7. Audio — nothing was generated, and here is the bill

**No TTS was run. No clip was deleted. `queue-audio-pass.cjs spa_for_eng` was called** with the reason string naming this pass, per the standing gate.

Every affected clip in this course is **synthetic (TTS)** — there are no human recordings among them. Voices of record: known side `xai_eve` (English), target1 `es-ES-ElviraNeural`, target2 `azure_es-ES-AlvaroNeural`.

**I changed only `target_text`. No `known_text` was touched, so every English clip in this band stays valid.**

The `trg_null_phrase_audio_on_text_change` trigger did the right thing on all 21 rows: it looked for a same-voice clip already speaking the new text, found none, and **nulled the link** rather than leaving a clip that says the wrong words. So the outcome is not *stale audio* — it is **silent slots**. Confirmed in `content_audio_link_drops`: 21 × `target1_audio_id` + 21 × `target2_audio_id`, every one with reason `nulled-no-same-voice-clip-for-new-text`, zero relinked, zero known-side drops.

### Regeneration list — 42 Spanish clips, 21 phrases

| seed | phrases | target1 (Elvira) | target2 (Alvaro) |
|---|---|---|---|
| 244 | `S0244L02U04` | 1 | 1 |
| 252 | `S0252L01U07` | 1 | 1 |
| 262 | `L01U08 L01U09 L01U10 L01U11 L01U14 L01U15 L03U02 L03U03 L03U06 L03U09 L03U11 L03U13` | 12 | 12 |
| 267 | `S0267L01B05` | 1 | 1 |
| 272 | `S0272L03U12` | 1 | 1 |
| 274 | `S0274L02U13` | 1 | 1 |
| 275 | `S0275L01U05` `S0275L01U06` | 2 | 2 |
| 277 | `S0277L01U03` | 1 | 1 |
| 279 | `S0279L02U08` | 1 | 1 |
| **total** | **21 phrases** | **21** | **21** |

(`S0262L03U09`'s two slots were already silent before I started — pass (A) nulled them on 2026-08-24 and no audio has been generated since. They are inside the 42 above.)

### A backlog nobody has reported

While counting my own damage I measured the rest. **Seeds 150–300 currently hold 93 phrases with both Spanish slots silent — 186 null slots, of which only 42 are mine.** The other 144 are pre-existing: pass (A)'s 2026-08-24 edits at 256–299, plus older edits at 168–219. Course-wide, `spa_for_eng` has **840 null target slots across 16,328 phrases**.

This does not contradict (B)'s finding that "every clip matches the text it is linked to" — it is the complement of it. A slot with **no** clip linked cannot mismatch, and a clip-vs-text audit cannot see it. **Somebody should decide whether that 840 is a backlog or a deliberate hold, because it is a learner hearing nothing, not a learner hearing something wrong.**

---

## 8. Verification

- 21 of 21 writes read back **character-exact** against the intended string (raw `===`, not normalised).
- Live DB, Supabase, `course_practice_phrases.target_text` only.
- No LEGO row edited. No seed row edited. No phrase deleted. No audio generated or deleted.
