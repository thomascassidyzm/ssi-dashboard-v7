# Estate-wide pod-1 per-conversation recast — organised per language

**2026-08-23. Applied and verified live. Regen queue rebuilt per language on Tom's clarification of 18:31Z.**

**3,030 distinct clips to re-render, across 41 languages. 64 courses recast. Zero same-voice exchanges anywhere.**

Tom: *"They will be per language I think. Because POD1 is based on languages not courses."* He is right, and the correction matters: the first number I gave — 5,620 — counted **line-links**, one per course slot, so a clip serving sixteen courses was counted sixteen times. The real unit is the distinct clip, which is what phase-8 actually renders. **3,030**, of which 2,747 were caused by this recast and 283 were already wrong before it ran.

A separate 1,898 clips also disagree with their cast — the `eng_for_*` known track this job deliberately did not touch. Not this job's burden; §4 explains it.

---

## 1. Where per-language pooling is real, and where it is not — the finding

**English is genuinely pooled, and it is the whole saving.** 578 English pod clips serve **3,166 slots across 56 courses** — 5.48 links per clip. The 16 `eng_for_*` courses literally link the same `course_audio` rows as each other, and the same English pool also serves the known side of the 40 `*_for_eng` courses. Fix English once, 56 courses inherit it. That single language is 19% of the clip count and 42% of the slot count.

**Every other language shows 1.00 links per clip.** Not because the estate forgot to pool them, but because there is nothing to pool. I checked the seven languages that appear in more than one course, and their pod text genuinely diverges:

| language pair | lines compared | identical | different |
|---|---|---|---|
| `cat_for_eng` vs `cat_for_spa` | 142 | 52 | **90** |
| `deu_for_eng` vs `deu_for_jpn` | 141 | 47 | **94** |
| `fra_for_eng` vs `fra_for_jpn` | 141 | 43 | **98** |
| `ita_for_eng` vs `ita_for_jpn` | 141 | 59 | **82** |
| `spa_for_eng` vs `spa_for_jpn` | 141 | 48 | **93** |
| `zho_for_eng` vs `zho_for_jpn` | 141 | 29 | **112** |
| `eus_for_eng` vs `eus_for_spa` | 141 | 27 | **114** |

These are real translation differences, not formatting. Catalan for English speakers says *"Bona tarda. Què vols?"* where Catalan for Spanish speakers says *"Bona tarda. Què et puc oferir?"*; *"Perdona"* against *"Escolta"*; *"A què et dediques?"* against *"Què fas?"*. Each pod was authored from its own known language.

So, reporting it as a finding rather than forcing either shape: **pod 1 is language-scoped in script, structure, cast and voice pair — one decision per language, which is exactly how this is now organised — but its audio is only a shared asset for English.** For the other languages the same language's pod rows genuinely diverge per course, so a voice flip there is fixed once per *course*, not once per language. That is a fact about the content, not about this recast, and nothing in this job can or should collapse it.

## 2. The queue, per language

Clips = distinct `course_audio` rows to re-render. "Pooled" is links per clip: how many slots one re-render fixes.

| language | clips | caused by recast | pre-existing drift | pooled | courses | serving |
|---|---|---|---|---|---|---|
| eng | 578 | 548 | 30 | **5.48×** | 56 | ara_eg_for_eng, ara_for_eng, ara_sy_for_eng + 53 more |
| jpn | 349 | 339 | 10 | 1.00 | 7 | deu_for_jpn, eng_for_jpn, fra_for_jpn + 4 more |
| spa | 306 | 300 | 6 | 1.00 | 5 | cat_for_spa, eng_for_spa, eus_for_spa + 2 more |
| hrv | 184 | 184 | 0 | 1.00 | 1 | hrv_for_eng |
| cat | 100 | 76 | 24 | 1.00 | 2 | cat_for_eng, cat_for_spa |
| deu | 98 | 92 | 6 | 1.00 | 3 | deu_for_eng, deu_for_jpn, eng_for_deu |
| ita | 96 | 78 | 18 | 1.00 | 3 | eng_for_ita, ita_for_eng, ita_for_jpn |
| zho | 85 | 73 | 12 | 1.00 | 3 | eng_for_zho, zho_for_eng, zho_for_jpn |
| fra | 84 | 73 | 11 | 1.00 | 3 | eng_for_fra, fra_for_eng, fra_for_jpn |
| tha | 84 | 84 | 0 | 1.00 | 1 | tha_for_eng |
| fra_ca | 80 | 80 | 0 | **1.01×** | 1 | fra_ca_for_eng |
| pol | 63 | 20 | 43 | **1.02×** | 1 | pol_for_eng |
| hin | 59 | 59 | 0 | 1.00 | 2 | eng_for_hin, hin_for_eng |
| dan | 59 | 59 | 0 | 1.00 | 1 | dan_for_eng |
| tur | 59 | 59 | 0 | 1.00 | 1 | tur_for_eng |
| nld | 57 | 57 | 0 | 1.00 | 1 | nld_for_eng |
| heb | 46 | 46 | 0 | 1.00 | 1 | heb_for_eng |
| kor | 44 | 44 | 0 | 1.00 | 2 | eng_for_kor, kor_for_eng |
| ara | 44 | 44 | 0 | **1.01×** | 2 | ara_for_eng, eng_for_ara |
| spa_mx | 44 | 44 | 0 | 1.00 | 1 | spa_mx_for_eng |
| swe | 44 | 44 | 0 | 1.00 | 1 | swe_for_eng |
| nor | 41 | 8 | 33 | 1.00 | 1 | nor_for_eng |
| por | 36 | 28 | 8 | 1.00 | 2 | eng_for_por, por_for_eng |
| por_br | 36 | 29 | 7 | 1.00 | 1 | por_br_for_eng |
| ara_sy | 34 | 29 | 5 | 1.00 | 1 | ara_sy_for_eng |
| ara_eg | 30 | 24 | 6 | 1.00 | 1 | ara_eg_for_eng |
| deu_at | 29 | 29 | 0 | 1.00 | 1 | deu_at_for_eng |
| eus | 28 | 28 | 0 | 1.00 | 2 | eus_for_eng, eus_for_spa |
| lav | 26 | 22 | 4 | 1.00 | 1 | lav_for_eng |
| lit | 26 | 22 | 4 | 1.00 | 1 | lit_for_eng |
| ron | 25 | 18 | 7 | 1.00 | 1 | ron_for_eng |
| bul | 18 | 18 | 0 | 1.00 | 1 | bul_for_eng |
| ell | 18 | 18 | 0 | 1.00 | 1 | ell_for_eng |
| isl | 18 | 18 | 0 | 1.00 | 1 | isl_for_eng |
| ukr | 18 | 11 | 7 | 1.00 | 1 | ukr_for_eng |
| est | 14 | 14 | 0 | 1.00 | 1 | est_for_eng |
| fas | 14 | 0 | 14 | 1.00 | 1 | fas_for_eng |
| gle | 14 | 14 | 0 | 1.00 | 1 | gle_for_eng |
| hye | 14 | 14 | 0 | 1.00 | 1 | hye_for_eng |
| nep | 14 | 0 | 14 | 1.00 | 1 | nep_for_eng |
| swa | 14 | 0 | 14 | 1.00 | 1 | swa_for_eng |

`eng` breaks down as two voice moves: 482 clips Tom → Olivia, 96 Olivia → Tom.

## 3. Why the cast being language-scoped is what made this tractable

The recast itself was always per language in substance. Fingerprinting every live pod by the md5 of its speaker sequence collapses 65 pods into six structural classes — 142 rows × 42 courses, 231 × 17, 232 × 3, and three singletons. Scenes 7, 8 and 9 are word-for-word identical across every class *and* across the `eng_for_*` courses, where those same lines are the target text. One script, one café, one bar, one restaurant, one adjudication of Aran's non-exchange ruling, one cast shape — instantiated per language onto that language's own voice pair.

Verified live in SQL after the write, canonicalising speaker names the way the render path does: **640 consecutive same-voice turns across 64 pods = exactly 10 per pod**, and every one is one of the ten adjudicated non-exchange pairs. Zero same-voice exchanges. Zero forced gender mismatches — Sarah, Anna and James landed on their own gender in all 64 pods. All 10,309 target and 10,868 known audio links unchanged: nothing deleted, nothing unlinked, no TTS generated.

## 4. Needs Tom

**a. `fin_for_eng` could not be cast — the one genuine gap.** Human-recording deferred: its cast entries carry `"deferred": true` with no target voice, and the only voice in the pod is `human_kai_fin` on 19 of 232 lines. No female voice to cast against, no gender recorded for it. The tool refused rather than guess. 3 pairs / 11 turns of same-voice exchange sit in it today. It needs a second Finnish recorder or your ruling.

**b. Fifteen pods used more than two voices; I took the taste-safe default** — keep the male and female with the most delivered lines, cast per conversation onto those two. Biggest discards: `fra_ca` loses Antoine (42 lines) and Thierry (15); `nor` loses Pernille (30); `tha` loses three voices (28/19/18); `pol` and `deu_for_jpn` each drop four. One word overrules any of them.

**c. `hrv` costs 184 clips — the most of any single-course language, and it is a real trade.** Croatian is the one course where the Learner speaks in scenes 1–5 *and* 15–22, so the whole pod hinges on the Learner–Narrator edge. I oriented it to keep Anna female and James male, which puts the Learner on the female voice. The other orientation is ~184 clips cheaper and misgenders Anna and James. I took taste over cost; reversible in one run.

**d. The `eng_for_*` known track — 1,898 clips that disagree with their own cast, deliberately untouched.** Those 16 courses deliver a single target-language narrator on every known line, so there are no known-side exchanges to fix. But their stored casts name a gendered pair — Arabic Yasmin and Youssef, and the equivalent in Japanese, Spanish, German, Italian, Chinese, Hindi, Korean, French, Portuguese, Bengali, Gujarati, Punjabi, Tamil, Urdu, Sinhala — that the shipped audio never used; it is a single voice throughout. Rewriting the cast from the audio would have silently reverted the 2026-08-07 `pod-recast.cjs` correction, so I carried each entry across untouched. It is a real divergence, it predates this job, and nobody has ruled on which side is right.

**e. One gender conflict**, reported not resolved: `zho_for_jpn` voice `d18jlf6v` is female in the `voices` table and male in the stored cast. The table won; 8 lines.

## 5. The Popty action

63 audio-pass requests are queued — the sanctioned end step, a *request* and not a render. Each now carries its languages, the per-language clip count, and the shared-across-N marker in both its reason and its metadata. `audio_pass_requests` is keyed by course and cannot hold a language-scoped row, so the language grouping lives in the queue file, which every request points at:

`docs/pods/pod1-recast-regen-queue-by-language-2026-08-23.json` — one entry per language, each listing the courses it serves, the voice moves, and every clip with its id, text, speaker, voice before/after, and the slots it fills.

**Do English first.** 578 clips, 56 courses, one pass.

---

**Tools:** `tools/pods/pod1-percall-recast.cjs` (the recast — dry-run by default, `--apply`, `--all`) and `tools/pods/pod1-regen-queue-by-language.cjs` (the per-language queue — reads the live estate, writes nothing).
**Logs:** `docs/pods/pod1-percall-recast-estate-2026-08-23-{dryrun,applied}-log.json`.

**One standing trap, not created by this job:** `tools/pod-sync.cjs` re-syncs a pod by deleting and re-inserting every sentence row from markdown, carrying neither these labels nor `target_audio_id`/`known_audio_id`. Never re-sync a recorded pod from markdown. Nothing is pending; flagging it as a trap.
