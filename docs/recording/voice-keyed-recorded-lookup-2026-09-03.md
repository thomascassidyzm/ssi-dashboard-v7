# A take from one voice never satisfies another's slot

Two fixes, both landed on `main` as `21dd783a2`. One is code, one is data. The data one is already live; the code one is not, and I am deliberately not restarting to make it so — see the last section.

## 1. The eight wrong-dialect slots — fixed, live now

`cym_s_for_eng` is a **released** Southern Welsh course. Eight of its seeds were serving **Aran's Northern (`cym_n`) takes**, recorded this morning between 11:05 and 11:20 UTC and written into the Southern course by the seed linker before #378 fixed that forward.

| seed | sentence | was serving | now |
|---|---|---|---|
| 2 | dw i'n trio dysgu Cymraeg | Aran, cym_n | empty |
| 3 | dw i'n mynd i ddysgu Cymraeg | Aran, cym_n | empty |
| 4 | dw i'n mynd i drio ymarfer | Aran, cym_n | empty |
| 7 | dw i dal angen ymarfer siarad Cymraeg | Aran, cym_n | empty |
| 15 | dw i newydd ddechrau cofio | Aran, cym_n | empty |
| 17 | dw i wedi bod yn dysgu Cymraeg am fis | Aran, cym_n | empty |
| 41 | pan wnest ti ddechrau | Aran, cym_n | empty |
| 54 | diolch yn fawr, ond do'n i ddim yn gwybod | Aran, cym_n | empty |

**Why empty and not a replacement.** There is nothing to point at. None of those eight sentences has *any* `cym_s` clip in `course_audio`, in any role, under either normalisation. The slots were **empty before the linker filled them** — 128 of the course's 136 filled target2 slots hold its own `legacy_import` clips, and these eight held Aran's. NULL restores the prior state, and it is what the other 532 unfilled seeds of that course already are. Nothing learner-facing is lost that was not already absent; what stops is a Northern voice reaching a Southern learner.

**Nothing was deleted.** All eight clips are still in `course_audio` with their S3 objects, and all eight are still linked to their own `cym_n_for_eng` seeds — checked before the write and after. Aran's 225 clips are all present. His 89 `cym_n` target2 seed links are unchanged.

The tool is `tools/recording/unlink-wrong-dialect-seed-clips-2026-09-03.cjs` — dry-run by default, every row's before-state re-read and asserted at the moment of the write, the update conditioned on the exact audio id it expects.

## 2. Estate-wide: eight is the whole class

I checked every filled slot on `course_seeds`, `course_legos` and `course_practice_phrases` — 128,568 seed slots plus the lego and phrase links — against the actual voice of the clip each one points at.

**The only human voice serving a course of a different dialect, anywhere on the estate, was Aran into `cym_s_for_eng`.** Every other human link matches: Aran and Catrin in Northern courses, Sasha in `deu_at`, Kai in `fin`, Tom in the zzz fixture. `cym_nnew_for_eng` borrows heavily from `cym_n_for_eng` but is itself a *north* course and a draft, so that is same-dialect sharing, not this bug. Cross-course clip sharing on phrases and legos is otherwise all TTS voices reused across courses of the same language, which is what `link_all_audio_ids` is for.

Re-running the audit after the fix returns **zero**.

### Reported, deliberately not touched
Three `cym_anthem_for_jpn` seeds (5, 6, 7) are served by **Catrin's own `cym_anthem` clips** while that course is marked `dialect: standard` and Catrin's policy dialect is `north`. That is the course's dialect metadata disagreeing with the recordist's, not a mislink — the clips were recorded *for* that course and clearing those slots would silence three real takes. Your call, not a row fix.

## 3. The root cause: the slot is not the person

`fetchRecordedKeys` matched on `(course_code, role, origin=human)`. A slot holds whatever has ever been filed in it — imports, a previous cast, another dialect's artist — so all of it counted as *this* recordist's own work. Measured live, before and after:

| course / slot | voice | before | after | of |
|---|---|---:|---:|---:|
| cym_n_for_eng target1 | Catrin | 5,583 | **0** | 5,879 |
| cym_n_for_eng target2 | Aran | 5,667 | **89** | 5,879 |
| cym_s_for_eng target1 | none cast | 5,988 | **0** | 6,211 |
| cym_s_for_eng target2 | none cast | 5,988 | **0** | 6,211 |
| deu_at_for_eng target2 | Sasha | 225 | 225 | 11,907 |
| fin_for_eng target1 | Kai | 25 | 25 | 12,573 |

**Catrin's screen was telling her 296 lines were left when the whole 5,879-line course was ahead of her.** Her 56 stored clips are pod sentences, not course lines. The 5,583 were `legacy_import`.

The real recordists' counts do not move at all. Only imports and other people's takes stop counting.

**The fix.** The key is now `(voice, text)`, built by one function, so a lookup cannot ask "is this text recorded" without naming a voice. The voice comes from the course's own cast (`voice_config.voices[role]`) and is widened to every spelling a stored row may carry. **No cast voice prunes nothing** — that is the honest answer rather than a regression: nobody is recording that slot, so nobody has recorded any of it. Both readers of that pool are fixed, the course-order path and the coverage optimiser, and they now share one definition of whose takes these are. The API response carries `recordedVoiceId` so a screen can say whose count it is showing.

**One thing for you.** Catrin and Aran's scripts get much longer — 5,583 and 5,578 lines respectively that were previously hidden behind imports. That is honest, and #378 already framed imports as exactly what the artists are being asked to replace. But if the intent for Welsh was ever "the legacy audio is good enough, only fill the gaps", this makes that policy visible and you may want to say so out loud rather than have it arrive as a longer script.

## 4. Tests

`services/course-order-script.test.cjs`, 20 cases, all passing. The **six new ones fail on `origin/main`** and pass here — an import in the same slot, another artist's take of the same line in the same slot, an uncast slot, a synthetic cast, a variant spelling of the voice id, and an explicit override. `recording-script-items`, `autocue-script-order` and `autocue-natural-only` still green: 46 tests in all. The full suite was not run — this is a matching-and-pruning change with no reach into the app boot path, and the baseline is not green.

## 5. Deploy: landed, not restarted

`main` is at `21dd783a2`. The Production API serves from `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`, which is on `main` at **`441b58abc`** — behind, and behind #378's fix too. Neither fix is live in the running service.

**I did not restart, because the booth is in use.** A `human_tom_zzz` take landed at 23:12 UTC, four minutes before I checked, and a restart kills in-flight uploads. The data fix needed no restart and is already serving. The code fix bites on the next script load and the next take, and loses nothing by waiting.

To make it live when the booth is quiet:

```
git -C /home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod pull
systemctl --user restart popty-production-api
```
