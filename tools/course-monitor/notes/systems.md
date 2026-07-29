# Systems — seed knowledge (extend as you learn)

## Course identity mapping
- new-app `course_code` = `{target[_variant]}_for_{known[_variant]}` (e.g. `spa_for_eng`, `spa_mx_for_eng`, `eng_for_ara`).
- legacy id = `{known2}-{target2}[-variant]` (e.g. `en-es`, `en-es-mx`, `ar-en`) — built by `buildCourseConfigsId()` (production-api.cjs:101); `toLegacyId()` replicates it in the monitor scripts. 2-letter codes via `language-code-service` `LEGACY_TO_STANDARD`.
- Basecamp card name = human ("Spanish (Castilian) for English") → course_code via `../basecamp-aliases.json`.

## Legacy export pipeline (how a course gets live on the legacy app)
Dashboard builds a legacy manifest → commits to the **course-configs repo** (on apidev `~/course-materials/course-configs/Courses/<legacyId>.json`) → deploy to **stage** → verify → deploy to **prod**. Files are 10-22MB.
- `services/phases/generate-legacy-manifest.cjs` builds the manifest; `services/publish-manifest-service.cjs` (`readExistingVersion`, `suggestVersion`, `writeToRepo`, `commitToGit`); stage-deploy via `services/stage-deploy.py` + production-api routes (from the dashboard export wizard `LegacyExportDialog.vue`).
- **Truth for what's deployed:** `ssh ssi@apidev 'bash -lc "cd ~/course-tool && ./compare-courses.rb"'` → per legacy id: repo_ver / stage_ver+ok / prod_ver+ok + published|beta|alpha|retired. (needs VPN; rvm ruby → `bash -lc`.)
- The DB `courses.legacy_app_status` field is NOT maintained — compare-courses + our tracker are truth.

## Encouragements / welcome (shared audio)
- Current set = Supabase **`shared_audio`** by `language`(known,3-letter)+`audio_type`: `instruction`=ordered(48), `encouragement`=pooled(50), `paywall`(101). Robo-Aran (elevenlabs). The **sample UUID is inside `s3_key`** (`mastered/<UUID>.mp3`) — that's the id the deployed config carries. `public/vfs/canonical/*_encouragements.json` is STALE — don't use it.
- Currency = deployed config's enc UUIDs vs current shared_audio set for the course's known lang. STRICT: full match only = current. `check-encouragements.cjs` computes it.
- **Welcome** = per-course `course_audio` role=`welcome` (text "Welcome to this unusual game…", in the known language). populated/not is the rule. **Variant trigger:** adding a variant → base course welcome must name the base variant (por_br added → Portuguese welcome must say "European"). 13 base courses currently have variant siblings.

## Basecamp map (account 5304789 = SaySomethingin.com)
- **Kai board 43553001** — personal to-do/update centre. To-do lists (ids): Build full versions `9927738106` · Republish w/ new encouragements `9857675870` · European dialects `9657741961` · Arabic dialects `9857764359` · x-for-Mandarin `9861089841` · English-for-x priority `9857976882` · English for Indian `9858006210` · Welsh for Yoruba `9858013340` · Legacy Manifest Export `9532150155`. Hill-charts live on these lists (Kai positions them Mon; no CLI for hills). Monthly "Update" messages exist here (headline-bullet style to emulate for weekly digests).
- **Creu Cyrsiau kanban 26277678** — Kai+Deborah legacy-production flow. Columns (ids): Triage `7038571697` · Not now `7038571698` · Content-check+audio `7038571700` · Ready for stage `7038571702` · On stage `9557920015` · Ready for live `9568174940` · Live `9557930593`. Cards carry dated content-checking notes + Deborah's fix comments.
- Company monthly all-hands "Updates" are on HQ board `26276514`.

## CLI capabilities
`basecamp todos complete|uncomplete|update|position`, `cards move|update`, `comment`, `message`, `search`, `show <id> -p <proj>` (or full URL). NO hill-chart / project-update command.
