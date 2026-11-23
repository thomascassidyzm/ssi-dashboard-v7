# Later-night re-run plan, settled (cs #785·AK; Kai's Watson rulings 23 Nov; neither is a Y/N for Kai)

1. Item 3 por_br, 26 held seeds incl. 647/662 "fala isso": first retry with `ops/overnight-785/kit/resume-item3.sh`. If
   GENDER_PREP_MISSING repeats on S0145L01B03 "não estou mais contente", live pre-check of row + LEGO + seed, then store
   ONE "no different form" gender entry for that exact text through Popty's edit route ("contente" is the same for a
   man or a woman), then resume. Any other refusal stops the run and is reported.
   Detail: `item3-holds-and-gender-prep.md`.
2. Item 5 por, seed 26 (S0026L02B02, S0026L02U01; "…estou quase pronto para ir"): render a correctly voiced clip
   through `POST /api/audio/render` only. Gender prep must give the male form ("pronto") for the male seat. Never link
   the library clip that says "pronta" to the male seat (Popty refused it with SPOKEN_WORDS_MISMATCH). Then live
   pre-check row + LEGO + seed, then apply the 2 held phrases (`kit/resume-apply.sh` with seed 26 no longer held).
Both are within Kai's approved budget; report them as settled.
