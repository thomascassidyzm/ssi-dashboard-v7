# Welsh weekend recording pack — Aran + Catrin, 2026-07-18/19

The definitive "sit down Saturday and just read" pack for recording **all missing Welsh
pod audio** (both dialects, pod-0) plus the one remaining course sentence. Everything
below was verified directly against the database and the live S3 assets on 2026-07-17 —
not against manifests.

## What's missing, verified

| Course | Pod-0 dialogue lines | English guide lines | Already recorded | Still to record |
|---|---|---|---|---|
| `cym_n_for_eng` (North) | 142 | 142 | 28 dialogue + 26 English (Aran, 15 June) | 53 dialogue (Aran) + 61 dialogue (Catrin) + 116 English (Aran) |
| `cym_s_for_eng` (South) | 142 | 142 | 0 | 81 dialogue (Aran) + 61 dialogue (Catrin) + 142 English (Catrin) |

All 54 existing takes were HEAD-checked in S3 — every one is a real playable asset, so
the ✅ marks in the scripts are trustworthy and the recording tool will skip those lines.

**Plus one ordinary course sentence** (not a pod): North Welsh seed 172 —
*"maen nhw isio i ni dreulio llai o amser yn gweithio adre"* — the only sentence left
across BOTH Welsh courses to make every seed and practice phrase assemble from human
audio (re-verified live with `generate-recording-script.cjs --gap`: North = 1, South = 0;
detail in `../welsh-seeds-gap-list.md`). Aran records it in **Mode 1: New Course** for
`cym_n_for_eng` — it's the only item in that queue.

## The four scripts (per voice, per dialect)

Numbered in the exact order the recording tool serves them; scene headers included;
already-recorded lines struck through so on-screen and on-paper numbering match.

| Script | Who | Takes remaining | Est. time @ ~6s/take |
|---|---|---|---|
| `cym_n_for_eng-aran.md` | Aran — North dialogue + North English guide | 169 | ~17 min |
| `cym_s_for_eng-aran.md` | Aran — South dialogue | 81 | ~8 min |
| `cym_n_for_eng-catrin.md` | Catrin — North dialogue | 61 | ~6 min |
| `cym_s_for_eng-catrin.md` | Catrin — South dialogue + South English guide | 203 | ~20 min |

**Totals: Aran 250 takes (~25 min of tape), Catrin 264 takes (~26 min of tape)** — plus
the one course sentence. Real-world sitting time with breaths and the autocue's pacing
will be roughly 2-3× tape time; comfortably one sitting each per dialect.

Recording rooms (the scripts repeat these):
- Aran N: `/record/cym_n_for_eng?podVoice=human_aran_cym_n` · Aran S: `/record/cym_s_for_eng?podVoice=human_aran_cym_s`
- Catrin N: `/record/cym_n_for_eng?podVoice=human_catrinlliar_cym_n` · Catrin S: `/record/cym_s_for_eng?podVoice=human_catrinlliar_cym_s`

How-to (mic, auto-advance, live text editing, pacing): `../aran-recording-instructions.md`.

## What was set up to make this work (2026-07-17)

- **South cast created.** `cym_s_for_eng` had no pod cast at all; the North cast
  (22 characters → Aran/Catrin by gender) was mirrored with south-minted voice ids, and
  both recorders' logins now hold the South course.
- **Bilingual guide split by load** (the rule in the instructions doc — guide = whoever
  has the lighter dialogue): North guide = **Aran** (as already begun in June),
  South guide = **Catrin**. This also balances the weekend almost exactly (250 vs 264).
- **S-LEGO seams inserted** (`tools/insert-ellipsis-seams.cjs`, pod-0 ceiling C=8, the
  ruled ellipsis-test segmentation): `…` breathing marks are now in the dialogue text
  for both dialects, so this weekend's takes are sliceable to S-LEGO granularity later.
  For the readers: `…` = take a natural breath and carry on, nothing more.
- **Aran's earlier takes counted correctly**: his June recordings sit under two voice
  ids (`human_aran_cym_n` / `human_aran_cym_n_2`); the alias config merges them, so
  nothing already recorded reappears in his queue.
- English glosses are dialect-specific on 22 of 142 lines (they gloss the actual
  dialect phrasing), so each course records its own English guide track — sharing the
  120 identical lines across courses would save only ~12 min of tape and was rejected
  as not worth the cross-course linking machinery.

## Not recordable this weekend (deliberate, don't go looking)

- **Pod-1** — English canon still being decided; no Welsh translation exists.
- **Pod-0.5** — English canonical only; not seeded for any course yet.

## Founder questions (short — answer cold, or ignore and we default sensibly)

1. **Forced mid-clause breath marks.** A handful of long lines had no clean
   intention-boundary under the 8-syllable ceiling, so the seam pass placed a `…` at
   the best prosodic point and flagged it (list in `seam-flags.md`). Default: the
   readers are native speakers — they breathe where it's natural and can edit the line
   live; no pre-approval needed. Say the word only if you want the flagged lines
   reviewed BEFORE Saturday.
2. **North/South English guide voices differ** (Aran voices North's English, Catrin
   South's). Fine, or do you want one consistent English guide voice across both
   dialects? Default: as cast — it balances the weekend.

Nothing else is ambiguous: no digits, no parentheses, no ASCII `...` anywhere in the
Welsh dialogue text (swept), and pronunciation is the readers' native call.

## Regenerating this pack

```bash
node tools/build-welsh-recording-pack.cjs   # rewrites the four scripts from live DB
```
