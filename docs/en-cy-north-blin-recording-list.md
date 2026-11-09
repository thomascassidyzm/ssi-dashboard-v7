# en-cy-north — "angry eyes" / "llygaid blin" audio fix

**Status as of 2026-11-09** (facts re-verified against repo + S3 on this date; the work itself
paused 2026-06-17). Course: **cym_n_for_eng** (popty) / **en-cy-north** (manifest). Seeds **271–273**.

> ⚠️ **Why this doc exists:** the mapping data and mastered audio live in gitignored paths
> (`scripts/experiments/blin_*.json`, `temp/blin-insert/`) on Kai's machine **only** — they do
> not travel to other agents/checkouts. Everything a non-local agent needs to resume is embedded
> below. The uploaded S3 objects (stage) are the shared artifact that *does* persist.

---

## 1. What the fix is

North Welsh course content is **"angry eyes" / "y llygaid blin yma"** (seeds 271–273).
The original audio mistakenly said **"pretty eyes" / "y llygaid del yma"**.

- An earlier "fix" (course-configs commit `52dfeb7`) wrongly changed the **text** angry→pretty to
  match the bad recordings. **Decision reversed: content stays angry/blin.**
- Rolled back via revert commit `412ab7b` on the course-configs `author` branch. **Not pushed** —
  hold until audio is in (see §5).
- North dialect uses **blin**; South uses **crac** → **no South Welsh audio is reusable.** Only 2
  English phrases were borrowed from en-cy-south as a stopgap.

## 2. The recordings

**23 clips** re-recorded by **Aran** (WhatsApp), cleaned via ElevenLabs STS (Kai generated;
judged "90% there, learners won't notice"). Onset de-click applied to en_04/05/07; cy_03 had an
onset click cut+cleaned; en_02 STS broke and was regenerated from text.

- **12 English** (source/known, single voice) — en_01–11 phrases + en_12 = combined presentation.
- **11 Welsh** — all **target2 = Aran**. (target1 = Catrin, see blocker §4.)

All 23 mastered (−16 LUFS, iOS-safe `lame` encode) and **uploaded to S3 stage** with **new
uppercase UUIDs** (no overwrite). Key pattern: `s3://ssi-audio-stage/mastered/<NEW_UUID>.mp3`.

✅ **S3 spot-check 2026-11-09:** 3/23 confirmed present (en_01, cy_01, en_12 presentation). The
uploads survived. Local mastered files: `temp/blin-insert/mastered/<NEW_UUID>.mp3` (gitignored).

## 3. Full clip → UUID → DB mapping (embedded; source of truth now that JSONs are local-only)

`needs_db=false` rows are manifest-only (seed-272 sentences, no `course_audio` row — Kai imports
seed audio later; popty app doesn't use seed audio). All others patch **21 `course_audio` rows**.

### English — role `source` (known), single voice

| clip | sliceKey | new UUID | dur(ms) | course_audio db_id | needs_db |
|------|----------|----------|--------:|--------------------|:--------:|
| en_01 | these angry eyes | 4A3B2B03-1DF0-4C79-BEE5-94F3611371CA | 1411 | 98290e36-04ef-49bd-9752-d977aa32c80c | ✅ |
| en_02 | nothing would make me happier than to escape from these angry eyes | 78C18B14-0FD5-4A33-991F-080E29C1DD32 | 4415 | — | manifest-only |
| en_03 | to escape from these angry eyes | E133EA7A-7E17-4BD5-AF59-226255FC5093 | 2273 | 33281908-aab7-4d86-942f-3c84dcd7defa | ✅ |
| en_04 | she doesn't want to think about these angry eyes | 0409567C-3F50-4EAA-849E-17ADE5DDFD10 | 3500 | a0a98d4b-f5d1-46c2-b811-3bcee0cf27a7 | ✅ |
| en_05 | to consider these angry eyes | D6D953E1-BC82-4595-B26A-F395F50D2DB0 | 2011 | 9450994b-4617-43f4-99a3-026a012cf845 | ✅ |
| en_06 | he says something about these angry eyes | 465D2D99-AA50-47DF-BF19-FB50BC7906EE | 3161 | e3700ac3-8c44-4d9b-a4d7-63c987570a3b | ✅ |
| en_07 | from these angry eyes | EEEF795F-08F5-439E-8DF0-B515A85E1D71 | 1698 | 5b6b3570-efbd-447c-a25d-2857f444a2df | ✅ |
| en_08 | these angry eyes are the only real hope | 551F97A7-A057-4419-A14D-9A17011F5B44 | 2847 | 6e6eff1f-9f27-4dc9-9b5e-6a3539c38791 | ✅ |
| en_09 | meant to be under these angry eyes | 236BDB87-DF71-4E89-BE55-53D85196973C | 3109 | 3c23a561-efe0-4ca6-80f0-8f306887c295 | ✅ |
| en_10 | under these angry eyes | 8EF15A9C-7680-43D5-B964-D4FB6EE4E213 | 1933 | 50c2c6f1-3bfd-4fde-ac58-cf3f638f726f | ✅ |
| en_11 | I don't want to watch these angry eyes ever again | 28FEE804-9C2E-47C6-8DC3-7F3AE447EAA9 | 3291 | e0581119-46a7-4152-8cf5-ef7403b89213 | ✅ |
| en_12 | *(combined presentation — `introductionItems[4].id`)* | D0BA506B-1D65-4200-85B2-690960B703B4 | 9822 | 5bc5bbde-6a01-4a60-ba64-644e06e32f39 | ✅ |

### Welsh — role `target2` = Aran (target1 = Catrin, PENDING)

| clip | sliceKey | new UUID | dur(ms) | course_audio db_id | needs_db |
|------|----------|----------|--------:|--------------------|:--------:|
| cy_01 | y llygaid blin yma | 13361AD6-6847-4293-8AF9-35AB98CCF45D | 2090 | c154bfbd-6cfb-4a7e-a7cd-d37963188328 | ✅ |
| cy_02 | dianc rhag y llygaid blin yma | 2F6E8443-A6B0-4807-BBB1-6F277C5396F5 | 2873 | e55aa8db-123a-46d9-b026-7eb5d02d723c | ✅ |
| cy_03 | rhag y llygaid blin yma | 5C6F3D2A-9EC1-4435-B208-93BCFA22D60D | 2247 | 3d3dc553-9a3b-4165-81a4-ff311339283d | ✅ |
| cy_04 | o dan y llygaid blin yma | 6897F144-1D60-4184-B5F8-9D6C6972D90D | 2377 | f75d87f5-a5dd-48f3-a394-c61365b850b5 | ✅ |
| cy_05 | i fod o dan y llygaid blin yma | 950EBDB4-AAA7-4FA0-AA03-623956FF4706 | 2952 | 262c78c1-a30d-49e5-814d-34763c45af5c | ✅ |
| cy_06 | i ystyried y llygaid blin yma | 621E61B5-2EB9-4BBE-A33A-A325914D80B5 | 2900 | 7ee48b19-9c44-4fc1-8662-04f033bdeec8 | ✅ |
| cy_07 | dydy hi ddim isio meddwl am y llygaid blin yma | 14AE5605-4982-4E13-85A1-47FA2A4F425E | 4075 | 19b214da-9ff8-402f-bb3d-1186eada419f | ✅ |
| cy_08 | mae o'n deud rhywbeth am y llygaid blin yma | 1B067523-0EC8-42CA-993A-BBBBC83AF3FC | 3736 | 2dc97ff8-9bf6-4ccd-b233-45ee1fafcfaf | ✅ |
| cy_09 | y llygaid blin yma ydy'r unig obaith real | 359D7E4A-C228-4C40-AC1D-DE3669E63B70 | 3605 | c5ae221c-0a66-4925-a098-3b536596d114 | ✅ |
| cy_10 | dw i ddim isio gwylio'r llygaid blin yma byth eto | 2A8D7EE8-8AB3-4574-8228-7959919115A6 | 4441 | 65b40d02-3834-4b41-87d7-98876e490c8c | ✅ |
| cy_11 | fyddai dim byd yn gwneud fi'n hapusach na dianc rhag y llygaid blin yma | DAA2E633-D2C6-4814-9B66-8F459AFD62EF | 6034 | — | manifest-only |

## 4. ⛔ BLOCKER — target1 (Catrin) Welsh not done

The 11 Welsh clips above are **all target2 (Aran)**. **target1 (Catrin) is untouched.** Kai's
decision (2026-06-17): **hold** the course-configs commit until target1 is also recorded, then
patch everything in **one pass** — manifest (target1 + target2 + EN + presentation + 2 seed
sentences) + DB (21 rows) — with a single version bump `5.3.3 → 5.3.4` (patch) and one commit.
Stage only; going live is a separate Step-4 export.

Source for Catrin's clips: Aran/Catrin re-record, or Ivan may have them in Slack.

## 5. Resume checklist

1. Obtain **Catrin (target1)** Welsh recordings for the 11 phrases in §3.
2. Master them same pipeline (−16 LUFS, `lame`), new uppercase UUIDs, upload to
   `s3://ssi-audio-stage/mastered/`. **Do NOT re-upload the 23 already there.**
3. Manifest patch — all entries in `en-cy-north.json` (EN + target1 + target2 + presentation +
   the 2 manifest-only seed-272 sentences: en_02, cy_11). Follow the
   `course-configs-manifest-audio-swap` procedure (replace UUIDs + durations + node refs).
4. DB patch — 21 `course_audio` rows (10 known + 10 target2 + 1 presentation), **plus** the new
   target1 rows. Update `text` + `s3_key` only (per `course_audio_update_payload` rule).
5. Resync durations → bump `5.3.3 → 5.3.4` → **one** commit on course-configs `author` branch.
6. **Push the `412ab7b` revert** (text angry/blin) together with the audio patch.
7. Stage publish; Step-4 export to prod is a separate, later action.

**Gap audio note:** until re-records land, the un-patched EN/Welsh keys still point at the old
*pretty/del* recordings (wrong word), left in place non-destructively. Switch to nulling the slots
if Kai prefers silent over wrong.

## 6. Local artifacts (Kai's machine, gitignored — reference only)

- `scripts/experiments/blin_mapping.json` — input mapping (clip → old ids/refs).
- `scripts/experiments/blin_results.json` — authoritative clip → new UUID → duration → db_id.
- `scripts/experiments/master_upload_blin.cjs` — master + upload driver (bucket `ssi-audio-stage`,
  `targetLUFS:-16`, via `services/audio-processor.cjs`).
- `temp/blin-insert/mastered/*.mp3` — the 23 mastered clips (UUID-named).
