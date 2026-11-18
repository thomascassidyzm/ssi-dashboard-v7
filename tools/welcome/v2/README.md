# First-ever welcome v2 candidates (job #91, 2026-10-12)

Three candidates that open in Aran's real voice. They sit beside, and do not replace, the live `welcome/first.mp3` (#83).

- All 11 real welcome takes (cym n/s, deu, spa, fra, fin, gle, ita, kor, swe, zho) are one script with the language name as the only change. None says "SaySomethingin", so no real "Welcome to SaySomethingin" exists. "Welcome to this unusual game" is the real, language-free opener.
- `build.py` rebuilds them (needs the takes in `src/`, see ../welcome-standard/README.md for ids; Welsh ids 9431f69c-aedb-48fb-b5f6-b266fac4ad49 and 70c69604-1592-4df8-b6e1-d0420ebbd552). `first_*_map.json` are the splice maps.
- Only clone: the word "native" in candidate C (`native_clone.mp3`, Popty trial render, voice d3daa47b "Aran" 6 Oct, 6 chars).
- Files: `packages/player-vue/public/welcome/candidates/first_{A,B,C}.mp3`.

## Script for Aran to record (about 10 s), not sent to anyone

1. "Welcome to SaySomethingin, an unusual game that gets you speaking."
2. "I teach you something, you say it out loud, and you'll be speaking sooner than you think. Let's play."
