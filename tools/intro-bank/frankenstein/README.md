# Frankenstein intros (#755)
Ruling r-2026-10-18-frankenstein-lego-intros: split a COMPLETE recorded intro once after "The <Language> for", swap in the target language's recorded frame, keep the rest. Read-only (DB session is read-only; no TTS; nothing repointed).
`node frankenstein.mjs census --out DIR` inventory + frame gaps; `node frankenstein.mjs pilot --course ell_for_eng --out DIR` 10-LEGO audio page (current / old stitched / new). `node --test lib.test.mjs` covers the parser and split.
