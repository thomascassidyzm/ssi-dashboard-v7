# Estate-wide pod-1 per-conversation recast

**2026-08-23. Applied and verified live.**

**64 courses recast. 1,940 same-voice exchange turns (515 pairs) eliminated — every pod now measures ZERO. 5,620 lines need re-rendering, and that is a Popty phase-8 action for Tom and Kai, not something this job did.**

Of those 5,620: **4,933 were caused by this recast** and **687 were already wrong before it ran** — clips that had drifted from their own pod's stored cast. Both numbers are in the queue, tagged, so the phase-8 run does not have to guess which is which.

No audio was generated. No clip was deleted or unlinked. All 10,309 target links and 10,868 known links are exactly where they were, counted live after the write.

---

## 1. What was decided, and what this job did with it

Tom's ruling, verbatim: *"I think the talking to yourself might have happened because of the desire to cast just 2 voices. But it shouldn't have. It should be male/female every conversation."* And, on scope: *"all POD 1 courses will need to be rewritten, so we'd best do that."*

Applied as: cast **per conversation**, two voices only, zero same-voice exchanges with no soft bucket, a character voiced against apparent gender accepted as a cost, no script rewrites, nothing deleted, no TTS.

Both cast stores — `listening_pods.speakers` for TTS render and `courses.voice_config.podCast` for human recording — are keyed by canonical speaker name alone, and `canonicalSpeakerName()` strips parenthesised groups. A bracketed scene suffix therefore cannot express a scene-scoped cast. So the fix is the same one the Welsh job found: make the reused **labels** scene-unique and write one cast entry per label. **2,115 speaker rows** were relabelled across the estate, 34 per pod in every class but two.

This is safe under the content-change migration protocol because learner progress is filed under the slot id `${podId}:SC{scene}-S{sentence}` — scene and sentence number only. A speaker relabel does not move a slot, so nobody is mis-credited and no migration is owed. Sixty of the 64 pods are `live`, not `held`; that is exactly why the relabel-not-rewrite mechanism matters.

## 2. The estate is one script, and that is why this was tractable

Fingerprinting every live pod by the md5 of its speaker sequence in `global_order` collapses 65 pods into six structural classes: 142 rows × 42 courses, 231 × 17, 232 × 3, and three singletons (`hrv_for_eng`, `tha_for_eng`, `ita_for_jpn`). I then read scenes 7, 8 and 9 word-for-word across a representative of each class **and** across an `eng_for_*` course, where the same lines are the TARGET text rather than the known text. They are identical. One café, one bar, one restaurant, one adjudication.

Which means the Welsh non-exchange ruling transfers verbatim. Aran disputed the #129 audit on the ground that the customers in those three scenes never address each other — each addresses the staff — so Customer 1 followed by Customer 2 is two orders at a shared hub, not a conversation. The ten pairs are enumerated in `NON_EXCHANGE` in the tool, line by line, so the judgement stays auditable rather than implicit.

**The pilot proved the class hypothesis harder than expected.** `cym_s_for_eng:pod-0` was run first — same class as pre-recast `cym_n`, zero linked audio, zero regen burden. The solver, deriving the cast from the graph with no knowledge of job #131's answer, reproduced the hand-derived Welsh cast **character for character**: Narrator/Neighbour/Passenger/Barista/Friend/James/Cafe Customer 1-3/Bartender/Waiter/Assistant/Guest/Pharmacist/Local male, everyone else female. It dropped straight in, so the sweep went ahead.

## 3. Verification — independent of the tool

Re-derived in SQL from the live DB after the write, canonicalising speaker names the way the render path does, joining `listening_pods.speakers` for the voice:

- **640 consecutive same-voice turns across 64 pods = exactly 10 per pod**, and every single one is one of the ten adjudicated non-exchange pairs.
- **Zero same-voice exchanges. Estate-wide. No exceptions, no soft bucket.**
- **Zero forced gender mismatches**: every gendered name in the script — Sarah, Anna, James — landed on its own gender in all 64 pods. Only the neutral labels were assigned on graph grounds.
- Target/known audio links: 10,309 / 10,868, unchanged.

The honest residue, same as Welsh: three customers ordering from one bartender, with two voices, must share a voice. A learner will hear the same voice order cider and then order wine, as two different customers at the same bar. Nobody talks to themselves anywhere. Removing those ten would need a third voice, and that is the only thing in this job that would.

## 4. Per course

Baseline is measured on the **delivered** voice — what a learner actually hears — not on a stored cast, because most stored casts had drifted and 87 of 93 courses have no `podCast` at all.

| course | pod | rows | before (pairs/turns) | relabels | voices seen | regen | of which this recast | of which pre-existing drift |
|---|---|---|---|---|---|---|---|---|
ERR fin_for_eng:pod-0 REFUSING to apply fin_for_eng:pod-0: target track has no resolvable female voice (voices seen: {"human_kai_fin":19}; ungendered: human_kai_fin)
| hrv_for_eng | pod-1 | 231 | 4/4 | 34 | 2 | 368 | 368 | 0 |
| spa_for_eng | pod-1 | 231 | 12/52 | 34 | 2 | 228 | 228 | 0 |
| ara_for_eng | pod-1 | 231 | 14/61 | 34 | 2 | 167 | 88 | 79 |
| spa_mx_for_eng | pod-1 | 231 | 14/61 | 34 | 2 | 167 | 88 | 79 |
| por_br_for_eng | pod-1 | 231 | 15/41 | 34 | 2 | 159 | 73 | 86 |
| por_for_eng | pod-1 | 231 | 14/38 | 34 | 2 | 159 | 72 | 87 |
| ara_sy_for_eng | pod-0 | 232 | 13/50 | 34 | 2 | 157 | 152 | 5 |
| ara_eg_for_eng | pod-1 | 231 | 10/27 | 34 | 2 | 153 | 68 | 85 |
| ita_for_eng | pod-1 | 231 | 9/20 | 34 | 2 | 152 | 134 | 18 |
| tha_for_eng | pod-0 | 142 | 2/2 | 7 | 5 | 136 | 110 | 26 |
| ita_for_jpn | pod-0 | 142 | 0/0 | 34 | 5 | 128 | 126 | 2 |
| spa_for_jpn | pod-0 | 142 | 0/0 | 34 | 5 | 127 | 124 | 3 |
| fra_ca_for_eng | pod-0 | 232 | 1/1 | 34 | 4 | 125 | 125 | 0 |
| deu_for_jpn | pod-0 | 142 | 0/0 | 34 | 6 | 123 | 123 | 0 |
| zho_for_jpn | pod-0 | 142 | 0/0 | 34 | 5 | 123 | 118 | 5 |
| fra_for_jpn | pod-0 | 142 | 0/0 | 34 | 5 | 118 | 118 | 0 |
| cat_for_spa | pod-0 | 142 | 7/33 | 34 | 3 | 115 | 112 | 3 |
| hin_for_eng | pod-0 | 142 | 0/0 | 34 | 5 | 112 | 112 | 0 |
| pol_for_eng | pod-0 | 142 | 0/0 | 34 | 6 | 111 | 61 | 50 |
| cat_for_eng | pod-0 | 142 | 8/43 | 34 | 3 | 100 | 70 | 30 |
| dan_for_eng | pod-0 | 142 | 0/0 | 34 | 5 | 100 | 100 | 0 |
| tur_for_eng | pod-0 | 142 | 0/0 | 34 | 5 | 100 | 100 | 0 |
| nld_for_eng | pod-0 | 142 | 5/6 | 34 | 5 | 98 | 98 | 0 |
| heb_for_eng | pod-0 | 142 | 16/68 | 34 | 2 | 93 | 93 | 0 |
| jpn_for_eng | pod-1 | 231 | 14/61 | 34 | 2 | 88 | 88 | 0 |
| kor_for_eng | pod-1 | 231 | 14/61 | 34 | 2 | 88 | 88 | 0 |
| swe_for_eng | pod-1 | 231 | 14/61 | 34 | 2 | 88 | 88 | 0 |
| eus_for_spa | pod-0 | 142 | 1/1 | 34 | 2 | 82 | 79 | 3 |
| nor_for_eng | pod-0 | 142 | 1/1 | 34 | 3 | 82 | 49 | 33 |
| deu_for_eng | pod-1 | 231 | 13/34 | 34 | 2 | 78 | 72 | 6 |
| deu_at_for_eng | pod-0 | 231 | 9/35 | 34 | 2 | 73 | 73 | 0 |
| zho_for_eng | pod-1 | 231 | 7/11 | 34 | 2 | 70 | 58 | 12 |
| fra_for_eng | pod-1 | 231 | 7/13 | 34 | 2 | 69 | 58 | 11 |
| ron_for_eng | pod-1 | 231 | 10/40 | 34 | 2 | 69 | 62 | 7 |
| lav_for_eng | pod-0 | 142 | 9/38 | 34 | 2 | 67 | 63 | 4 |
| lit_for_eng | pod-0 | 142 | 9/38 | 34 | 2 | 67 | 63 | 4 |
| bul_for_eng | pod-0 | 142 | 8/30 | 34 | 2 | 59 | 59 | 0 |
| ell_for_eng | pod-0 | 142 | 8/30 | 34 | 2 | 59 | 59 | 0 |
| isl_for_eng | pod-0 | 142 | 8/30 | 34 | 2 | 59 | 59 | 0 |
| ukr_for_eng | pod-0 | 142 | 8/30 | 34 | 2 | 59 | 52 | 7 |
| eus_for_eng | pod-1 | 231 | 1/1 | 34 | 2 | 58 | 58 | 0 |
| est_for_eng | pod-0 | 142 | 1/1 | 34 | 2 | 55 | 55 | 0 |
| fas_for_eng | pod-0 | 142 | 1/1 | 34 | 2 | 55 | 41 | 14 |
| gle_for_eng | pod-0 | 142 | 1/1 | 34 | 2 | 55 | 55 | 0 |
| hye_for_eng | pod-0 | 142 | 1/1 | 34 | 2 | 55 | 55 | 0 |
| nep_for_eng | pod-0 | 142 | 1/1 | 34 | 2 | 55 | 41 | 14 |
| swa_for_eng | pod-0 | 142 | 1/1 | 34 | 2 | 55 | 41 | 14 |
| eng_for_ara | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_ben | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_deu | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_fra | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_guj | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_hin | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_ita | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_jpn | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_kor | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_pan | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_por | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_sin | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_spa | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_tam | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_urd | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| eng_for_zho | pod-0 | 142 | 14/57 | 34 | 2 | 41 | 41 | 0 |
| cym_s_for_eng | pod-0 | 231 | 0/0 | 0 | 2 | 0 | 0 | 0 |

## 5. Needs Tom

**a. `fin_for_eng` could not be cast — the one genuine gap.** Its pod is human-recording deferred: the cast entries carry `"deferred": true` with no target voice, and the only target voice in the pod is `human_kai_fin` on 19 of 232 lines. There is no female voice to cast against, and `voices` has no gender for it. The tool refused rather than guess. It needs a second recorder or your ruling; 3 pairs / 11 turns of same-voice exchange are sitting in it today.

**b. Fifteen pods were using more than two voices; I took the taste-safe default** — keep the male and the female with the most delivered lines, cast per conversation onto those two. Discarded, with line counts:

- `pol_for_eng` 6 voices → dropped 4 (17, 14, 10, 8 lines) · `deu_for_jpn` 6 → dropped 4 (17, 14, 10, 8)
- `dan_for_eng`, `fra_for_jpn`, `hin_for_eng`, `tur_for_eng`, `zho_for_jpn`, `nld_for_eng` 5 → dropped 3 each
- `ita_for_jpn`, `spa_for_jpn` 5 → dropped 3 each (25, 17, 3)
- `tha_for_eng` 5 → dropped 3 (28, 19, 18) · `fra_ca_for_eng` 4 → dropped Antoine (42) and Thierry (15)
- `cat_for_eng`, `cat_for_spa` 3 → dropped Joana (18) · `nor_for_eng` 3 → dropped Pernille (30)

One word overrules any of these.

**c. `hrv_for_eng` costs 368 re-renders — by far the most, and it is a real trade.** Croatian is the one course where the Learner speaks in scenes 1–5 *and* 15–22, so the Learner sits opposite the Narrator and the whole pod hinges on that one edge. I oriented it to keep Anna female and James male, which puts the Learner on the female voice and flips 184 lines on both tracks. The other orientation costs ~368 fewer re-renders and misgenders Anna and James. I took taste over cost and it is reversible in one run.

**d. The `eng_for_*` known track was deliberately left alone, and it disagrees with its own audio.** Those 16 courses deliver a single target-language narrator on every known line, so there are no known-side exchanges to fix. But their stored casts name a gendered pair (Arabic: Yasmin and Youssef) that the shipped audio never used (it is all Salma). Rewriting the cast from the audio would have silently reverted the 2026-08-07 `pod-recast.cjs` correction, so I carried each speaker's known entry across untouched and am flagging it instead. It is a real divergence and it is nobody's ruling yet.

**e. One gender conflict**, reported not resolved: `zho_for_jpn` voice `d18jlf6v` is female in the `voices` table and male in the stored cast. The `voices` table won; it is 8 lines.

## 6. The Popty action

Sixty-three audio-pass requests are queued — the sanctioned end step, a *request* and not a render — each tagged `pod-1 per-conversation recast 2026-08-23` with its own row count in metadata. Phase-8 `/generate` fulfils them when you approve. `cym_s_for_eng` has no request because it has no audio to replace.

**The number: 5,620 lines.** 2,669 target, 2,951 known.

---

**Tool:** `tools/pods/pod1-percall-recast.cjs` — dry-run by default, `--apply` to write, `--all` to sweep. Per-row before-state assertions on every relabel; aborts the whole pod's transaction on drift rather than writing through it; asserts `voice_config.voices` byte-identical before commit.
**Logs:** `docs/pods/pod1-percall-recast-estate-2026-08-23-dryrun-log.json` and `…-applied-log.json` — every relabel, every voice flip, every one of the 5,620 regen lines with track, scene, sentence, speaker before/after and voice before/after.

**One standing trap, not created by this job:** `tools/pod-sync.cjs` re-syncs a pod by deleting and re-inserting every sentence row from markdown, carrying neither these labels nor `target_audio_id`/`known_audio_id`. Never re-sync a recorded pod from markdown. Nothing is pending; flagging it as a trap.
