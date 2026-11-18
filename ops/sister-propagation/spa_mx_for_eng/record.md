# spa_mx_for_eng — record (cs #695·AI, 18 Nov)

Source rows: scan slice `reports/spa.json` (families B–T and A), all re-read live through Popty on 18 Nov before
any op was written; every op carries an `expect` on the old text and sets the new clips in the same op
(make-before-break — no slot was ever empty, no clip deleted).

## Applied — 102 ops, 13 edit-batch events, 236 render asks, **8,314 chars**

| family | what | rows | events |
|---|---|---|---|
| B | disfrutar + inf → *me gusta despertarme* (seed 55 + S0055 rows, as spa seed 55) / *disfrutar + gerund* elsewhere (mx itself teaches *disfruto haciendo* at S0051L01) | seed 55 + 23 rows | 01–03 |
| D | *¿podríamos tener…?* → *pedir*; English "ask for" (mx's taught gloss of pedir, S0212L01) | seed 414 + 5 rows | 03–04 |
| E | *liderar el camino* → *liderar el proyecto*; LEGO S0416L02 "the project \| el proyecto" + new intro. Also clears a ZUT: "the way" was also *la manera en que* (S0491L02) | seed + LEGO + 10 rows | 04–05 |
| F | *para caridad* → *para una causa benéfica*; LEGO S0437L03 target | seed + LEGO + 8 rows | 05–06 |
| G | *ha sido encantador* → *ha sido lindo* (Mexican word chosen, not spa's *estupendo*: DEM/Colmex *lindo*; LEGO S0567L02 "lovely \| lindo") | seed + LEGO + 11 rows | 06–07 |
| J | *no siento como si estuviera listo* → *no me siento listo* (spa seed 115) | seed + 3 rows | 07–08 |
| K | *lo siento que* + indicative → *lo siento, pero…* (seeds 139, 140; no played rows carry it) | 2 seeds | 08 |
| L | bare *intentar* → *intentarlo* | 5 rows | 08–09 |
| M | *practicar* + inf | 2 rows | 09 |
| N | *sería … si puedes* → infinitive (pudieras untaught) | 2 rows | 09 |
| O | *cuando termino* → *si termino* | 1 row | 09–10 |
| Q | *decir de* → *decir algo de* | 3 rows | 10 |
| R | *ir aquí* → *ir allí* | 1 row | 10 |
| S | negative + *algún* → positive, keeping the row's LEGO *parar en algún sitio* | 1 row | 10 |
| T | seed English only: 138 "this is where", 419 "appreciate" | 2 seeds | 10–11 |
| H | *sentirse más fácil* → LEGO re-gloss "to get easier \| ser más fácil" (spa seed 122, Deborah 61); whole basket + seed + intro + 2 S0123 rows (these keep *pienso*: their LEGO is S0123L01 "I think \| pienso") | seed + LEGO + 12 rows | h-01, h-02 |

Events: f22ec316, 491044e5, 0066313e, b4b1a74d, ffc08289, 1b2717aa, 90c1c3a3, 6a8c4f9f, 9ce3f0fc, b6538d98,
d2b6e097, 9290de0e, bdc38e77. Undo per event: `undo-*.json` (post `undo_ops` back to edit-batch with apply).
Readback (`readback.json`, `readback-h.json`): 88/88 + 14/14 rows/seeds/LEGOs carry the new text, every changed
phrase has known + target1 + target2 clips. Intros S0416L02, S0437L03, S0567L02, S0122L01 all have audio.

Audio: 236 asks — 211 rendered, 22 library links, 3 answered `EXISTS_IN_LANGUAGE` and linked to the clip the route
named (0 chars): *sería bueno practicar más* → dd64d763 (Carlota t1) / 85a43dd2 (Luciano t2); "we want to stop
somewhere now" → 4961357a (xai_gfzdpspr5fdp, a voice already of record in spa_mx). The live render dry-run cap
(`BULK_DRY_RUN_ON_LIVE`, 100/h, shared agent id with the children) blocked dry runs, so real renders went ahead
bounded beforehand by text length (≤ 9,104 upper bound vs 8,314 spent). New clips are UNHEARD.

## Not applied — left for Kai, with cost

| family | rows | why not now | est. chars |
|---|---|---|---|
| A *pienso* → *creo* for "I think" (5 LEGOs, 24 seeds) | 284 | cap: last in the brief's order; would need LEGO changes S0123L01, S0163L01, S0318L01, S0135L01, S0210L01 + intros | ≈ 20,200 |
| C S0027 *tomar demasiado tiempo para* → *tardar demasiado en* (spa Path B), S0065, S0094L03U05 | 13 | needs a LEGO re-cut of S0027 (L02/L03) — structural on a beta course (`tom_go`); *tardar(se)* is standard in Mexico, so the rule does carry | ≈ 2,000 + intros |
| I S0147 *me vio sintiéndome* → *me vio nervioso* (Deborah 76) | 11 + seed | LEGO S0147L02 "feeling \| sintiéndome" has no place in the fixed seed: re-gloss to "she saw me \| me vio" and rewrite its 12-row basket, or delete it (structural) | ≈ 1,300 |
| P *él sabía que* + present | 16 (≈ 30 by the same rule) | NOT a defect on its own: double-access present after a past verb is grammatical when the content still holds (RAE NGLE §24.4). The real fault is the English "he knew it's…"; *él sabe* is untaught until S0290, so a fix would be "I know that \| sé que" (S0059) | ≈ 2,300 (16) |
| S0402 LEGO *parar en algún sitio* | seed + LEGO | *sitio* is the Spain word; Mexico says *algún lado / algún lugar* (mx already uses *algún lado* at S0182). LEGO + seed + basket change | ≈ 1,500 |
| U *practicar hablando* | 93 | KNOWN: same open question as spa #443 (parked by Kai as 44b) | — |
| *definitivamente* | 50 | preference, not defect: everyday Mexican usage | — |

Not done: the audio-pass queue request. `tools/course-optimization/queue-audio-pass.cjs` is refused by the DB guard
(Supabase REST client cannot point at the QA copy) and Popty has no HTTP route for it. Every changed row is already
voiced, so nothing is left silent.
