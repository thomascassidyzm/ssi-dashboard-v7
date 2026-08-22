# Script Viewer — LEGO regenerate auto-accept

`lego-regen-auto-accept.mjs` is the live proof for the 2026-08-08 fix: a
regenerated LEGO clip must become the clip EVERY row for that LEGO serves,
with no reload and no save step, including when the LEGO was found by search
(which is how the bug was reported — the post-regen refresh trued up the
paginated journey while the screen was rendering search results).

It drives a real browser through Tom's path: log in, search, regenerate Voice 2
with a punctuation variant, then click the Voice 2 play button on BOTH rows for
that LEGO (intro and debut) and compare the s3 object each one asks for against
what it asked for before. Both must move.

It costs real TTS — one clip per run. Do not loop it.

    npm run build
    npx vite preview --port 5197 --strictPort --host 127.0.0.1 &
    node e2e/script-viewer/lego-regen-auto-accept.mjs "what I mean" "…"

Needs the e2e admin user (`node e2e/pod-recording/seed-test-user.cjs`) and a
production-api on localhost:3470. Restore the LEGO's original pointer after a
run if you care about the course it touched — the run rebinds it for real.
