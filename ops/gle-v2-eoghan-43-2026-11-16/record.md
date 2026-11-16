# gle_v2: Eoghan's line on the 43 "no reason recorded" seeds (cs #343·AI, 16 Nov 2026)

Every batch: built by `plan.py` from a fresh Popty `GET /api/production/gle_v2_for_eng/seeds`, checked by `check.py`
(gaps, 8 syllables, phrase contains its LEGO, untaught words, duplicates, one English two Irish), dry run, then applied by
`post.py` through `POST :3470/api/production/gle_v2_for_eng/edit-batch`. `<batch>-apply.json` keeps the undo ops.

| Batch | Seeds | Ops | Event |
|---|---|---|---|
| A (probe) | 7, 36, 38, 247 | 145 | 399cead4 |
| B | 61, 69, 77, 102 | 69 | bb8739b0 |
| C | 142, 147, 148 | 112 | 638e44f9 |
| D | 159, 166, 178, 228 | 113 | b92e4690 |
| E (past 300, seed text only) | 304 … 614 (24) | 24 | 0953535d |

Total 463 ops in 5 events (39 seed texts, 15 LEGOs changed, 8 added, 9 removed with their phrases, 278 phrases reworded,
49 written or moved, 65 deleted). Word tiles recomputed on the 101 seeds those touch (`recompute.py`, 7 events
74a94a68, bd86aeb9, 614925dc, b29c833c, 94b3159e, 2b2982cd, 29ebca69; 30 phrases skipped as "parent unlocatable").
Live re-read after (`reread.py`, and #253's `verify.py`): no gaps, nothing over 8 syllables, every new LEGO practised, every
phrase under a touched LEGO contains it, no leftovers of the old wordings. Open clash "to know" (45/201) is #253's, untouched.
No LEGO in the course has an intro clip, so nothing is out of step. No audio rendered; no audio pass queued (#253 queued none).

## Taken (39): his line, with these course-wide forms kept where his clashed (L34: unify first)
- want = 'is mian': 36 ('Ní mian linn' for 'Níl fonn orainn'), 178 ('gur mhian liom' for 'go raibh mé ag iarraidh');
  after want the conditional: 304 ('go mbeadh'); tá mé / tá muid / níl mé: 102, 142, 159, 496.
- 'practise speaking' = 'labhairt a chleachtadh' (5): 228 takes his 'tosú ar … a chleachtadh' with 'labhairt'.
- 'to find' = 'a fháil': 460; 'over there' = 'thall ansin': 498; 'tapa' spelt as from 20: 77.
- 247 keeps 'sin' for 'that book' (his English and ours both say 'that book').
- Spelling slips corrected: 69 'um thráthnóna', 147 "B'an-chineálta", 148 'rófhoighneach', 'thabhairt', 423 'ríshoiléir',
  454 'anseo', 481 'fíordhóchas', 489 'de chaife', 'láithreach bonn', 492 'suimiúla', 496 'fíorthábhacht'.
- Knock-ons fixed course-wide: 'mo dhícheall' (≈80 phrases), 'cur isteach', 'thart ar sheachtain', 'cuíosach',
  'cuireann sé ionadh orm', 'arís, ach beagán níos moille', 'um thráthnóna ar fad', 'an-bhuíoch', 'as do chabhair',
  'nuair nárbh fhéidir liom', 'an t-am agam' (≈45), 'in ainneoin gur mhian liom'; 'nervous' after 147 now 'faitíos'
  (191, 202) or 'tired' where the phrase must keep its piece (222, 228, 236, 270, 300); 'very patient' after 148 now
  'very kind'; 93's 'although' → 'even though' (it keeps 'cé go', as 159/160).
- 147: LEGO S0147L02 'an-chineálta' sits inside the written "B'an-chineálta" (one token); harmless, noted.

## Stopped (4): left exactly as they were
- 70: 'where it was' is 'cá raibh sé' in about 20 sentences (135, 152, 176, 201, 213 …); unifying goes back to ours.
- 82: his line answers another English ('I will not wait for you? Why?'): 'going to' is 'chun' all through (5), and
  'Why not?' needs 'nach'. Really a "cover the English" row: on the 28-row list as an extra.
- 272: 'Ba mhaith' alone as 'yes' would clash with 'yes | Tá' (97); with the rest it is 9 syllables.
- 280: 'le déanamh agam' would be a second Irish for 'to do' ('a dhéanamh', 7); the frame 'ní raibh ach … le déanamh
  agam' has a gap, and the whole is 14 syllables.

## Not changed by this job, flagged
- 492: his line drops 'do you think' (no LEGOs past 300 yet, so nothing clashes today).
- 614 'do chlann' vs 'teaghlach' at 408 (both past 300; 408 is one of the 28).

28-row recommendation list: rows28.md, published https://watson-1.tail4968cb.ts.net:10000/d/7a83019a

Sheet rebuilt on the live course (build.py unchanged except QUIET/HAND for these rows): 206 commented / 462 blank, was 239 / 429. xlsx https://watson-1.tail4968cb.ts.net:10000/d/985d9e1a/file
