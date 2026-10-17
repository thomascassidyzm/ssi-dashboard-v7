# Per-voice coverage

Dashboard: `/admin/voice-coverage`. GET `/api/admin/voice-coverage` reads one
saved JSON file; it performs no database work. Requires dashboard admin or
bare loopback. The Vercel rewrite keeps browser requests on popty.app.

`node tools/voice-coverage/refresh.cjs` refreshes the summary every six hours
through `ssi-voice-coverage.timer`. Install the committed service/timer in
`/etc/systemd/system`, daemon-reload, enable the timer and start the service.
The output defaults to `~/ssi-evidence/voice-coverage/summary.json` (the literal
Tom home path); `VOICE_COVERAGE_FILE` overrides it for both reader and writer.
A manual probe uses `--course spa_mx_for_eng --out <evidence-file>`.
Run this tool unchanged only after its PR is merged to main.

All database reads use `agent-db.cjs`; content and clip-index reads use bounded
keyset pages, clips join on UUID primary keys, and the agent's five-second
statement limit is never lifted. The tool sets its session read-only. It never
renders, alters content, changes pointers, or writes clip-index entries.

The production learning-script generator supplies the exact authored default
FAST-mode round items, including spaced reviews and whole-seed returns. Its
reads are served from a complete preloaded snapshot, avoiding row caps and
repeated database reads. Text matching uses the existing clipTextKey and
clipLanguageKey; varieties remain separate. A clip must have a non-pending S3
key and duration >200ms, matching voice-audit's usability rule. This checks
stored metadata, not an S3 download or a quality/listening audit.

Each language side measures its distinct needed (language,text) pairs and
rounds for every voice in that language's clip index, plus any absent cast
voices. Target1 and target2 can share the same text, so they do not double the
pair denominator. Known-side intro cycles require authored presentation text,
selected by the reuse planner's real-render-then-newest rule. Unknown/blank
text prevents a complete round and is shown explicitly. Empty denominators
are null, never 100%. First break is the earliest incomplete authored round;
later complete rounds still count. Both target cast seats are shown separately.
The best alternative excludes all cast seats and ranks complete-round count,
then held-pair count, then voice ID. This is an inventory, not a change to
voice eligibility or gameplay. Personalised pods are outside course rounds.

A full refresh atomically replaces the summary after processing every course.
Individual read failures produce explicit course gaps, never a partial count.
A global failure retains the previous file; the page warns after 12 hours.
A lock prevents overlapping refreshes of the same output. After SIGKILL or a
machine crash, inspect the PID in `<output>.lock` and remove only a dead lock
before restarting. `startedAt` and `generatedAt` bound the measurement window;
it is not a transactionally frozen estate snapshot.

Verification: `node --test tools/voice-coverage/coverage-check.cjs` and
`node --test tools/voice-coverage/one-count-check.cjs` (the one count: seed
bands, offerable at 100% of seeds 1-100 and 80% of the rest, human vs TTS,
the by-language rollup and speech-check flags). `?view=languages` and
`?course=<code>` return slices of the saved summary.

Browser rendering and phone-table check:
`node e2e/voice-coverage/browser-check.cjs`. Reads the saved summary through
the merged loopback API; browser sign-in is synthetic and all browser DB/API
calls are intercepted. Checks lazy table rendering, filtering, detail expansion
and readable columns on a 390px phone. Screenshots go to CS_SCRATCH or the
evidence store. COVERAGE_PAGE_URL/COVERAGE_API_URL override the live defaults.
