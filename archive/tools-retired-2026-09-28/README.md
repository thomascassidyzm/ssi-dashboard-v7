# Retired 2026-09-28 (job #678)

`tools/audio-veracity-repair.cjs` ran Whisper over every clip of a course and,
with `--apply`, re-rendered every clip Whisper flagged. Tom's ruling that day
(r-2026-09-28-no-automatic-whisper-stt-check-may): no automatic STT check may
veto or trigger re-renders of TTS audio. A flagged clip is listened to by a
person before anything is re-rendered. Nothing here carries standing.

`tools/a108/{a136-nld-noor-drop,t22-nld-render,isl-ell-est-register-render,t22-lav-swap}.cjs`
were finished one-off render passes (plate A-108, 2026-08-14 to 08-30) that picked or
refused a take on a Whisper decode. Their work is done and recorded; retired so the
pattern is not copied. The ledger/verify/ear-sample scripts that name them by
`source` string still work — they never `require`d them.
