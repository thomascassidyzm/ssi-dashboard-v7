# Irish draft (gle_v2): final pass APPLIED (cs #410·AI, 17 Nov)

Your 12:19Z yes, with every recommendation in the #398 report taken as written. No audio.

## Events (all undoable through Popty)
| What | Event | Ops |
|---|---|---|
| Main pass (129 left as ours, per item 4) | a00f9b68 | 1,023 (85 seed, 45 LEGO updates, 19 LEGO inserts, 15 LEGO deletes, 523 phrase updates, 150 phrase inserts, 219 phrase deletes) |
| Seed 166 ↔ 300 swap, his *orm* line in three steps | 44aae3e8 | 35 |
| Word tiles recomputed, seeds 7-300 touched | 45877fd6 14d9e8f8 cf16ac1e ce6f7e80 c4584acd 49267703 72df7770 e716109f 4e0ad243 bd95dcb2 | 367 rows rewritten, 65 skipped (parent not locatable) |
| Knock-on fixes from the whole-course check | 90cb60c7 | 15 |

**First apply refused, then fixed:** the database will not leave a new LEGO with no practice, and the dry run cannot see that rule. Two LEGOs lost their only phrase. I added two lines to each, built only from pieces already taught:
- S0098L02 "to consider": *smaoineamh ar rud éigin* and *ba chóir dom smaoineamh ar rud éigin*.
- S0221L01 "I watched": *d'fhéach mé ar rud éigin* and *… aréir*.

The plan now checks for this rule itself.

## Intro lines: 20 of 20 posted and read back word for word
These are the 15 echo lines plus 5 heads-ups (142, 147, 148, 45, 300).
- **Low confidence:** I stored them as HARD marks. A soft mark needs a database column that is not there yet; the change is `database/changes/20261111_human_authored_presentations_soft_guard.sql`, and only Tom can apply it.
- A hard mark makes any template rebuild refuse to overwrite these lines. Each one can still be re-marked, as soft once that column exists.

## Whole-course checks (seeds 1-300; 301-668 have no LEGOs yet)
| Check | Result |
|---|---|
| Over 8 syllables | **0** |
| One English → two Irish (debut LEGOs) | **2**, both echo yes/no (96 *Níl* / 280 *Ní raibh*; 97 *Tá* / 272 *Ba mhaith*). These are the echo rule; the intro lines carry the question. |
| Same English → two Irish (any row) | **13**. 11 were already there: a LEGO next to its own mutated form (*an pheil / an bpeil* and 5 more), *labhairt / a labhairt*, and 4 near-duplicate long lines. The other 2 are the echo pairs above. |
| No-gap (seed covered by its LEGOs) | **18 seeds**, 16 already there before this pass. 45 and 280 are your ruled shapes. The rest are frames around a word, in two kinds: stand-in "it" frames (45, 96, 100, 105, 207, 250, 290), and gapped frames from before 12 Nov (9 *tá … Gaeilge agam*, 13, 73 *go raibh … maith agat*, 109, 122, 133, 153, 217, 260, 273, 277, 296). The same seeds explain all 88 "phrase lacks its LEGO" rows and 22 "LEGO not word for word in seed" rows; 300's step 1 is in that 22, as ruled. |
| Taught before used | Before this pass, 16 rows had used a word the pass stopped teaching. 15 are fixed (below); 1 is left. 555 other rows trip a crude token test, down from 575 before the pass. None of those are caused by this pass, and they are **not hand-read**. |

### Fixed, event 90cb60c7
- 65, 6 lines: *gach seachtaine* → *gach seachtain*. Seed 38 now teaches *seachtain*, and *gach* takes the plain form anyway. 65L05U12 also had *ceapaim Tá sé* → *ceapaim go bhfuil sé*.
- 111L04U15 dropped: it still said *athraíonn sé*, and there is no passive wording for it.
- *buíoch* on its own is no longer taught (142 teaches *an-bhuíoch*):
  - 142L07B03 → *an-bhuíoch as do chabhair*.
  - 199L02U04 → *…go raibh sé an-bhuíoch* ("very grateful").
  - 155L02U08 dropped: it was also the wrong tense, *bhí mé* for "I would be".
- 202L01U01: *an-neamhghnách* has moved to 300, so → *neamhghnách* ("unusual"), which 121 teaches.
- *ag cleachtadh labhartha* left the course with 228:
  - 252 ×2 → *tosú ar labhairt a chleachtadh*, 228's own piece.
  - 242 and 294 → *…a chaitheamh ag caint* ("spend time speaking").

### Left for you
1. **131 "there are too many ideas"** (S0131L04): its only phrase is the whole seed. That sentence uses *ag dul timpeall* and *i mo cheann*, which the next two LEGOs teach. Until now 38 had taught *timpeall* early. It needs one new line or a reorder; I didn't guess one.
2. **S0100L06U02** sits under "agus é á dhéanamh agat" but doesn't contain it ("what was the answer you were looking for…"). It was already there, and #398 left it alone.
3. **The 12 gapped frames from before 12 Nov** listed above go against your "no gapped LEGOs" rule. Each one means rebuilding that seed's decomposition, so none is trivial.
4. **The 555 crude untaught rows.** The most common words are *sí* 88, *chuig* 31, *fós* 26, *scríobh* 20, *tástáil* 17, *madra/óg* 16. Some are false hits from the token test. They need a proper read; none came from this pass.

The files are in Popty `ops/gle-v2-final-pass-2026-11-17/`: `apply-*.json` (the undo), `fixes.py`, `wholecheck.py` and `wholecheck-final.txt` (every flagged row).
