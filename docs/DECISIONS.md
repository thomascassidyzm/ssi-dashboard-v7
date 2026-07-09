# Decisions log

Append-only. Newest at the bottom. Read the tail before deciding; append after. Doctrine:
`capture-pack/decision-doctrine.md` (search-first Better×Simpler×Cheaper). Entry template:

```markdown
## YYYY-MM-DD — <slug: the move in five words>
**Move:** what was done, one or two sentences, intention level.
**Better:** <fact>. **Simpler:** <fact>. **Cheaper (total):** <fact — build + maintain + run>.
**Searched & rejected:**
- <option> — <the leg it failed, one line>
**Search width:** visible-options | re-levelled | component-redesign | from-scratch | floor-surfaced
**Decided by:** agent | Tom <one-line context if Tom>
```

## 2026-07-09 — Synthesis Studio sampler reads Supabase directly

**Move:** the Result state's "listen to a few" playback sampler (design
`docs/leaderjourney-synthesis-design.md` §2.2 point 4) fetches its sample of freshly-written
`course_audio` rows via a new frontend-only helper (`getRecentHumanAudio` in
`src/services/supabase.js`) that queries `course_audio` directly with the dashboard's existing
anon Supabase client, then resolves each row's playback URL through the existing
`GET /api/production/:courseCode/audio/:uuid/url` signed-URL endpoint (same one ScriptViewer
already uses).

**Better:** the sampler shows real freshly-spliced audio, fulfilling the design's "reality is the
demo" requirement, with S3 signing staying server-side (no new auth surface).
**Simpler:** reuses two patterns already live in this exact file/route — `getAudioMetadata`
already reads `course_audio` columns (id, text, role, s3_key, origin, voice_id, created_at)
directly via Supabase in `src/services/supabase.js:297-316`, and the signed-URL fetch is the
verbatim pattern ScriptViewer uses (`ScriptViewer.vue:1427-1441`).
**Cheaper (total):** zero new backend routes/maintenance; a five-line Supabase `select` versus
extending `synthesis-job.cjs`'s report shape (engine code the design doc explicitly says not to
touch) or adding a new HTTP route (against the brief's "no new backend engine routes").

**Searched & rejected:**
- Extend `synthesis-job.cjs`'s job report to carry the freshly-written audio ids — rejected:
  touches the engine (`services/voice-engine/synthesis-job.cjs`), which the design and the task
  brief scope as untouched; also a real code change to test/verify, not just a read.
- Add a new backend route to list recent audio for a (course, voice) — rejected: brief is
  explicit, "no new backend engine routes," and it would duplicate the existing signed-URL
  endpoint's job.
- Reuse the deleted frankenstein endpoint's `findCourseAudio` service call — rejected: that
  function does a single hardcoded-language lookup by exact text, not "N most recent human
  rows for a voice"; wrong shape, and it's the code being deleted this same session.

**Search width:** visible-options (existing precedent already covered the whole need)
**Decided by:** agent
