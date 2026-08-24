> Adversarial refutation of worker #880's A-135 plan. Everything below is computed from
> `adj-plan.json` against the live database, read-only, on 17 August 2026. Nothing was written
> to the database, no audio was rendered, and nothing was committed. Scripts and derived data
> are the `jrefute-*` files in this directory; per-row judgements are in `jrefute-rows.json`.

# A-135 — refutation: the plan is sound where it was looked at, and unsafe where it was not

**Overall verdict: REFUTED.**

Not because the adjudication is wrong — its ZUT work is genuinely correct and I could not break
it — but because the plan's *blast radius* was measured on the wrong surface. #880 analysed
`known_text` and told itself the rest was free. Three things it called free are not:

1. **242 currently-audible prompt slots go SILENT** the moment the plan is applied. #880's own
   framing ("430 edits sit on a row with a live clip", the lead brief's "424 free rebinds") is a
   measurement of a *naive full strip*, and it does not transfer to this plan. This plan rebinds
   only 130 of 440. That is a make-before-break violation in five live beta courses.
2. **329 presentation-clip pointers are destroyed outright** — not made stale, *deleted* — by a
   trigger clause #880 never read.
3. **A fourth learner-facing surface, `course_practice_phrases.decomposition`, carries 16,430
   annotated gloss segments and is not in the plan at all.** Applying the plan makes 9,618 of
   them *disagree with the prompt above them*.

Plus 108 rows I refute on content grounds, 95 of them rewrites.

Counts, over all 1,423 plan rows (a census, not a sample): **108 refuted, 370 change, 945 ok.**

---

## Axis 2 — the ZUT analysis. I re-derived it and #880 is right. No collision missed.

This is the one axis where I set out to break the plan and could not, so I will say so plainly.

I rebuilt the collision set from the live DB rather than auditing #880's. Served production
prompt surface = all 47,480 `course_legos` rows plus `course_practice_phrases` with
`phrase_role` in build/use (the live roles; `practice`/`eternal_eligible` do not occur in these
courses). Component-role phrase rows and `course_legos.components` tiles are excluded, and that
exclusion is correct — `bundle.ts` `BUNDLE_PHRASE_ROLES` is `build|use|practice|eternal_eligible`
and `cycles.ts:148` records that components are never introduced.

I applied the plan's 440 `known_text` edits, regrouped by (course, known_text), and looked for
any group carrying more than one distinct `target_text`:

| | collision groups | groups containing an edited row | edited rows implicated |
|---|---|---|---|
| **control: naive full strip of all 997** | 724 | **206** | **397** |
| **the actual plan** | 595 | **0** | **0** |

The control is the harness proof: a naive strip does manufacture 206 collision groups, so the
method detects them. The actual plan manufactures **zero**. #880's 169-row hold set **covers my
collision set completely — there is no collision it failed to hold.** Robust to target
normalisation (raw / case-and-punctuation-folded: 0 either way).

Two caveats I owe you:

- **My first run of this was wrong and I caught it.** `card_tile` and `component_row_latent` plan
  entries reuse the *parent lego's* `row_uuid`, so an unfiltered join applies tile edits as
  though they were prompt edits and invents 34 collision groups that do not exist. Anyone
  re-running this must filter on `surface = 'known_text'`.
- If component rows *were* a prompt surface, 18 groups / 24 edited rows would collide. They are
  not, so this is not a defect — but it is the assumption the result rests on.

**A ZUT gap #880's method cannot see, and does not claim to.** Its collision test is empirical —
"does another row in this corpus already have this known_text with a different target". That
catches manufactured collisions. It does not catch a strip that leaves a prompt *under-determined*
against a form the course has not yet used. Seven Spanish/French/German conditional strips are
exactly that shape (axis 3 below): 「あげるでしょう（dar条件法）」→`daría` becomes 「あげるでしょう」,
and でしょう is presumptive, not conditional. Nothing collides today only because `dará` is not in
the corpus at that string yet.

## Axis 1 — the 213 rewrites. 95 refuted. Census, every one checked.

Two independent defects. First the good news: **`stem_changed` = 0** — no rewrite alters Japanese
outside the parenthesis, so the risk is entirely in the marker.

### 1a. 64 rewrites use a marker that appears NOWHERE in the course

Debut = earliest seed at which the literal string occurs in a served `known_text` in that course.

| course | new marker | debuts | first used by a rewrite at | rows |
|---|---|---|---|---|
| deu_for_jpn | 「彼・彼女が」 | **never** | seed 99 | 20 |
| ita_for_jpn | 「彼・彼女が」 | **never** | seed 49 | 28 |
| spa_for_jpn | 「彼・彼女は」 | **never** | seed 99 | 16 |
| deu_for_jpn | 「彼らが」 | seed 213 | seed 200 | 2 |
| por_for_jpn | 「彼・彼女は」 | seed 197 | **seed 28** | 20 |
| spa_for_jpn | 「私が」 | seed 49 | **seed 29** | 33 |
| spa_for_jpn | 「彼らは」 | seed 34 | **seed 22** | 8 |

87 of 213 rewrites use a marker not yet given at that row's seed. **The known side is a controlled
language** — this is the rail, not a nicety. 「彼・彼女が」 is not merely early in deu and ita: it
occurs in no known_text in those courses at any seed. #880 imported Portuguese's house convention
into three courses that do not use it.

And these prompts are **spoken**. 「彼・彼女が」 has a `・` disjunction — a *written* convention. The
TTS will read it as two nouns in a list ("kare, kanojo ga"), not as a pronoun. The plate exists
because the Japanese voice says *iku — futeishi*; replacing that with *kare-kanojo-ga* is a new
spoken defect, not a fix. Every 彼・彼女 rewrite is at minimum a `change` on this ground alone.

### 1b. The person rewrites assert a human subject that many targets do not have

84 rewrites map a third-person label onto 「彼・彼女が/は」. A large share of their targets have no
he/she subject at all:

| row | rewrite | target | what is wrong |
|---|---|---|---|
| deu S0099L02 | 「うまくいく（彼・彼女が）」 | `funktioniert` | *it* works — a thing, not a person |
| deu S0122L01 | 「始まる（彼・彼女が）」 | `fängt` | *it* starts |
| deu S0146L01 | 「〜のようだ（彼・彼女が）」 | `scheint` | impersonal *es scheint* |
| deu S0272L01 | 「聞こえる（彼・彼女が）」 | `klingt` | *it* sounds |
| deu S0199L01 | 「〜た（彼・彼女が）」 | `hat` | perfect **auxiliary** — not a message at all |
| deu S0223L01, S0293L01 | 「〜するつもりです（彼・彼女が）」 | `wird` | future **auxiliary** |
| ita S0228L01 | 「練習する（彼・彼女が）」 | `esercitarsi` | an **infinitive** — no person |
| ita S0224L01 | 「〜を始めた（彼・彼女が）」 | `iniziato a` | a **past participle** — no person |
| spa S0272L01 | 「聞こえる、～のようだ（彼・彼女は）」 | `suena` | *it* sounds |
| spa S0281L01 | 「気になる（彼・彼女は）」 | `importa` | *it* matters |
| spa S0298L01, S0279L01 | 「残っている（彼・彼女は）」 | `queda`/`quedaba` | *there remains* |
| por S0272L01 | 「〜のようだ（彼・彼女は）」 | `parece` | *it* seems |

The auxiliary cases are the sharpest: 「〜た（彼・彼女が）」→`hat` fails #880's *own* producibility
test. There is no intention a learner can form that produces a bare perfect auxiliary.

Separately, in Spanish and Portuguese the third person also carries **usted / você** — the polite
"you". 「彼・彼女は」 silently deletes that reading, changing which form the prompt elicits.

**GAP, stated honestly:** I judged the marker's *debut* and the target's *animacy/finiteness*
mechanically. I did not have a Japanese speaker read the 213 resulting strings for naturalness,
and I am not qualified to referee that. #880's own recommendation — a Japanese author reads the
rewrites — stands, and nothing here replaces it.

## Axis 3 — the bucket boundary. 8 strips refuted; the two overrules mostly survive.

**The two overrules: I largely agree with #880 on 「（彼女は・私に）」 and disagree on 丁寧.**
「送ってくれた（彼女は・私に）」→`enviou-me` really is two verb arguments, and there is no grammar
half to drop — #880 is right. But 「～したいですか（君は・丁寧）」 is not the same case. #880 argues
丁寧 is "the softened request". If that were true the Japanese would carry it: 「～したいですか」 is
already polite, so 丁寧 is not adding politeness to the message — it is telling the author's future
self that the *target* is `gostarias`, the conditional-softened form. That is form, not message.
It stays in this plan, unedited, on 14 rows. See axis 4.

**8 strips I refuse as load-bearing content misread as metadata** (all `known_text`, all with a
live clip except one):

- `deu s202` 「誰も（否定・主語）」→`niemand`. Japanese 誰も means "nobody" only with a following
  negative; bare 「誰も」 reads "anyone". The strip leaves a prompt that does not determine `niemand`.
- Six **conditional** strips where the remaining Japanese does not carry the conditional:
  `spa s225` 「あげるでしょう（dar条件法）」→`daría`, `spa s229` 「手伝うでしょう（ayudar条件法）」→`ayudaría`,
  `spa s253` 「～すべき（deber条件法）」→`debería`, `spa s261` 「～できるかもしれない（poder条件法）」→`podría`,
  `deu s236` 「〜しようとするつもりだ（条件形）」→`versuchen würde`, `fra s203` 「何をするか（条件）」→`tu ferais`.
  でしょう is presumptive, つもりだ is intention, かもしれない is epistemic possibility — none of them is
  the conditional. Each leaves the prompt under-determined against the future/present form.

**Where I clear #880.** 疑問 and 否定 mostly survive scrutiny and I will not manufacture findings:
`zho s14` 「〜か（疑問）」→`吗` strips to 「〜か」, which *is* the Japanese question particle and carries
itself. `deu s282` 「問題ない（否定）」→`kein Problem` keeps ない in the stem. 比較級 strips leave もっと
in the stem. And #880 correctly *held* `deu s134` 「問題（否定）」→`kein Problem`, the one case where
negation is the whole difference — the exact trap it warned about in its own Appendix C.

Of the lead's named watchlist: 希望/状態/期待/本当/一般的に/理由 are all already **held**, not stripped,
so the "misread as metadata" worry does not apply to them — though 状態 and 強調 should have been
*edited* rather than kept (axis 4). 時間表現 (2 rows) and 比較 (6) are safe strips.

## Axis 4 — the 519 keeps. 40 should have been edits.

Of 519 keeps: 402 are `known_text`, and **129 of those have a live clip** — so the parenthetical
is printed *and spoken*. The other 273 are printed only. Those are different defects and #880
counts them together.

**The person markers are correctly kept.** 「私たちは」(63), 「私は」(55), 「あなたが」(45), 「彼らは」(24),
「私が」(21) and friends are spoken as ordinary Japanese; a learner hears 「言う（あなたが）」 and
forms an intention. No derailment. #880 is right and I am not going to invent a problem here.

**40 rows are not that.** These are metalinguistic *labels* — words about the language, not words
of the message — and #880 conceded in its own write-up that register "is metalinguistic in form"
and then declined to fold it in. That concession should have been an edit:

| tag | rows | spoken | example |
|---|---|---|---|
| 「丁寧」 | 14 | 3 | `ita s61` 「〜できますか（丁寧）」→`potresti` |
| 「強調」 | 6 | 4 | `zho s260` 「全部・全然（強調）」→`都` |
| 「状態」 | 7 | 2 | `ita s39` 「〜です（状態）」→`sono` (this is the ser/estar split named by grammar term) |
| 「口語」 | 2 | 2 | `zho s131` 「頭（口語）」→`脑子` |
| 「改まった」 | 1 | 1 | `zho s266` 「父親（改まった）」→`父亲` |
| 「期間」/「について」/「する」/「一般的に」/「とても」 | 10 | 2 | `por s116` 「できました（する）」→`podia fazer` |

The severity test: a learner hearing 「〜です、じょうたい」 or 「あたま、こうご」 gets a Japanese word they
cannot place in the sentence. That is the same defect as *iku — futeishi*, and it is exactly the
class this plate was raised to remove. Keeping them is inconsistent with #880's own rule: it sent
一人称 to rewrite because "the information is load-bearing but the wording is metalinguistic".
状態 and 丁寧 are that sentence verbatim.

One more the family census surfaced: `por` 「〜してもいいですか？（あなたは気になりますか？）」 — a whole
glossing *sentence* inside the parenthesis. That is not a marker at all.

## Axis 5 — the 36 unexamined rows. 5 refuted; all 36 need a decision, not a park.

Census, all 36 pulled live. **The 5 corrupt/wrong-language rows are a live learner-facing defect
right now, worse than the one this plate fixes, and parking them as "hold" hides them.**

First, the fact that decides severity: **the learner content API applies no `status` filter at
all.** `cycles.ts` and `bundle.ts` select on `course_code` / `phrase_role` / `seed_number` and
never on `status`. All five rows are `status='draft'` — that buys them nothing. They are served.

| row | known side | target | state |
|---|---|---|---|
| `spa s128 S0128L03` | 「知っていました（1人称」 | `conocía` | truncated mid-paren. **Live clip `bcd3be5d`, voice `azure_ja-JP-ShioriNeural`, rendered from the broken string** — the learner *hears* the unclosed text |
| `spa s201 S0201L01` | 「～するつもりだった（ir一人称」 | `iba` | same: **live clip `222fd210`**, rendered from the truncated text |
| `por s290 S0290L01` | 「知っている（彼」 | `sabe` | truncated; no clip |
| `por s283 S0283L02` + its component row | 「your (plural)」 | `teus` | **English on the known side of a Japanese-known course.** Unusable |

All three truncations cut at exactly the character after an opening 「（」, which is the signature
of an earlier automated edit, not of authoring. That is worth its own look — if something once
truncated on a paren boundary, these five may not be the only survivors.

The 31 `no gloss to fall back on` rows are correctly *held* — 「（冠詞）」→`il`, 「（定冠詞）」→`a`,
「(object marker)」→`を` have no message left after a strip. But "hold" understates them: the
learner is currently shown a bare grammar term *as the entire gloss*. They are function words,
and the method's own rule is that articles and markers are **bundled into the noun or verb LEGO,
never glossed standalone**. The fix is authoring, not parking.

## Axis 6 — the audio consequence. This is the loudest finding. 242 slots go silent.

I read the mechanism out of `pg_proc` rather than assuming it:

```
normalize_text(t)        = rtrim(lower(trim(t)), '.?!¿¡。？！')
audio_id_for_text(c,t,r) = SELECT id FROM course_audio
                            WHERE course_code=c AND role=r AND s3_key IS NOT NULL
                              AND text_normalized = normalize_text(t)
                            ORDER BY (origin='human') DESC, created_at DESC, id::text DESC LIMIT 1
```

**Control first.** Re-simulating the lead's naive full strip of all 997 `known_text` rows
reproduces **424 free rebinds and 0 voice changes** exactly. Harness trusted.

**Now the actual plan — and it is nothing like the control:**

| | edits | free rebind | **go SILENT** | of those, audible today |
|---|---|---|---|---|
| naive full strip (the number in the brief) | 997 | **424** | 573 | 199 |
| **#880's actual plan** | **440** | **130** | **310** | **242** |

The naive strip rebinds well because a plain-stripped 「行く」 usually already has a rendered clip.
A **rewrite** to 「始める（私が）」 is a string no voice has ever spoken, so it can never rebind — and
rewrites plus person-partials are the bulk of this plan. **Applying it turns 242 currently-audible
prompt slots into silent ones**, in five live beta courses, before any audio pass runs.

That is a make-before-break violation as the doctrine defines it: the link is destroyed before a
verified replacement exists. #880's own step 3 says "expect the clips to be stale until it runs" —
they will not be stale, they will be **absent**.

**On the two things the lead asked about specifically:**

- **Voice changes: zero.** All 130 rebinds stay on the same voice. I checked every one.
- **Wrong-text rebinds: 36, all benign.** `normalize_text` strips trailing `.?!。？！`, so the row
  now reading 「朝」 rebinds to a clip whose stored text is 「朝.」, 「質問」 to 「質問。」, and so on.
  I inspected all 36: **every one is a trailing full-stop or period only**. There is no case of
  「行く」 binding to 「行く？」 — no statement inherits a question clip. The collision the lead
  feared is real in the function but does not fire in this plan.

Tile and component edits fire nothing on the audio path — confirmed, `components` is jsonb and
neither trigger reads it.

## Axis 7 — presentation clips: 666 confirmed, and the plan does worse than leave them stale.

**666 confirmed exactly** — presentation clips whose spoken text contains a parenthetical, out of
5,832 in these courses: deu 241, spa 202, ita 150, zho 37, fra 36, eng 0, por 0. **327 of them sit
on a row this plan edits.**

But "stale" is the wrong worry, and this is the part #880 missed. The lego trigger does not leave
presentation alone:

```
IF NEW.known_text IS DISTINCT FROM OLD.known_text OR NEW.target_text IS DISTINCT FROM OLD.target_text THEN
  NEW.presentation_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'presentation')::text;
```

It repoints presentation from the **target_text**. A presentation clip's text is a whole Japanese
narration sentence (「ウェールズ語で「歌手たち」は：」); a `target_text` is a foreign word. I measured
it: `audio_id_for_text(target_text,'presentation')` matches for **0 of the legos in these seven
courses**. So the repoint always resolves to NULL.

**Every `known_text` edit on a `course_legos` row destroys that row's presentation-clip pointer.**
The plan makes 383 such edits, and **329 of those rows carry a pointer today**: deu 156, spa 127,
ita 30, zho 10, fra 6. The clips survive on S3; the link does not, and the trigger can never
restore it. Phrase-side rows are unaffected (57 edits, 0 pointers, and the phrase trigger
deliberately leaves presentation alone).

`audio-before-images.json` in this directory captured the before-state, so this is recoverable —
but only if whoever applies the plan knows to restore it, and nothing in `adj-buckets.md` says so.

**And the 339 annotated presentation clips *not* on an edited row are untouched by the plan
entirely** — they will go on speaking 「見る（不定詞） をドイツ語で言うと：」 after the fix ships.

### The fourth surface the plan never mentions

`course_practice_phrases.decomposition` is the English-under-target gloss the learner reads on the
card. Across these seven courses it holds **136,160 gloss segments, of which 16,430 carry a
parenthetical** — and each segment's `known` is a *copy* of the lego's `known_text` at generation
time. Sampling it finds the plate's own worst example, verbatim:

```
"known": "あなたが伝えた（decir二人称過去接続法）", "target": "dijeras"
"known": "私に（与格）",                          "target": "mir"
"known": "するつもりです（二人称未来）",             "target": "wirst"
```

Two consequences, neither addressed:

- **6,812 annotated gloss segments are left alone entirely** — 「行く（不定詞）」 (60), 「手伝う（不定詞）」
  (66), 「見た（過去分詞）」 (47), 「できる（不定形）」 (50). The defect the plate exists to remove
  survives on this surface at roughly ten times the volume of the surface being fixed.
- **9,618 segments across 7,780 phrase rows will DISAGREE with the prompt above them** once the
  plan lands: the lego says 「読む」 and the gloss under `lesen` still says 「読む（不定詞）」; the lego
  says 「〜より」 and the tile still says 「〜より（比較）」. That inconsistency is *introduced* by this
  fix. Nothing recomputes decomposition on a lego edit — there is no trigger for it.

One correction to #880 in passing: it calls the tile batch "zero audio consequence", which is true,
but `course_legos_bump_course_version` fires on `UPDATE OF ... components`, so tile edits do bump
the course version and invalidate caches. Harmless, but not nothing.

---

# Verdict: REFUTED — what must be reconsidered

**Do not apply this plan as written to a live beta course.** In priority order:

1. **Fix the audio sequencing before anything else.** 242 audible prompt slots go silent. Either
   render-and-verify first (make-before-break), or gate the whole text batch behind a fulfilled
   audio pass. The "424 free rebinds" figure does not describe this plan.
2. **Capture and restore `presentation_audio_id`** for the 329 lego rows, in the same transaction
   as the text edit — or fix `null_lego_audio_on_text_change`, whose presentation clause is
   unconditionally destructive for every course in the estate, not just these seven. That is worth
   its own plate.
3. **Withdraw all 64 「彼・彼女…」 rewrites** and the 23 other late-marker rewrites (95 rows). The
   marker does not exist in three of the courses, it is a written-only convention on a spoken
   prompt, and on auxiliaries, infinitives, participles and impersonals it asserts a subject the
   target does not have.
4. **Add `course_practice_phrases.decomposition` to the plan** — 6,812 annotated segments
   unaddressed, 9,618 about to contradict their own prompt. This surface is larger than the one
   being fixed.
5. **Escalate the 5 corrupt / wrong-language rows now, separately**, ahead of this plate. Two have
   live clips rendered from the broken text. `status='draft'` protects nothing.
6. **Reopen the 40 metalinguistic keeps** (丁寧, 強調, 状態, 口語, 改まった and friends) — by #880's
   own rule these are rewrites, not keeps.
7. **Revisit the 8 load-bearing strips** — the six conditionals plus 「誰も（否定・主語）」.

**What survives and should be kept:** the ZUT adjudication in full. I attacked it directly, from
the database, with a working control, and found nothing. The 169-row hold set is right, the person
markers in the keep set are right, and the decision to adjudicate rather than `sed` this was
correct — a naive strip would have manufactured 206 collision groups.

**Explicit gaps.** I could not judge the naturalness of the rewritten Japanese as a Japanese
speaker would; I judged marker debut and target morphology mechanically. #880's recommendation
that an author read the rewrites stands. I did not listen to any audio. I did not attempt to
re-derive #880's tile-collision analysis, having established that tiles are not a prompt surface.
And I did not check whether the estate's other non-English known sides carry the same annotation
habit — on the evidence of the decomposition column, that is worth asking.
