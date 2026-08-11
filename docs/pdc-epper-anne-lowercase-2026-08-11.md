# pdc_for_eng — before-images: `epper Anne` → `epper anne` (2026-08-11)

Doug's instruction on his seed-6 redo: "lowercase the A in anne". Kai approved.

17 practice-phrase rows, all the same collocation, all glossed "with someone else" on the known side. No LEGO cards, no component tiles, no seed rows, no presentation rows, and no audio carry the string.

Seed 177 (`wu sie anne geh will`) is a different word and was deliberately left alone.

## Rows before the edit

| id | seed | role | status | known_text | target_text (before) |
|---|---|---|---|---|---|
| pdc_for_eng:S0011L01U02 | 11 | use | draft | I'd like to practise speaking with someone else | ich deet gleiche mit epper Anne schwetze iewe |
| pdc_for_eng:S0011L02U04 | 11 | use | draft | I'd like to be able to practise with someone else as often as possible | ich deet gleiche so oft as meeglich mit epper Anne iewe kenne |
| pdc_for_eng:S0011L03U06 | 11 | use | draft | I can practise with someone else after you finish | ich kann mit epper Anne iewe, wann du faddich bischt |
| pdc_for_eng:S0012L01U02 | 12 | use | draft | I'm going to practise speaking with someone else tomorrow | ich waer mariye mit epper Anne schwetze iewe |
| pdc_for_eng:S0012L02U03 | 12 | use | draft | I'm going to guess with someone else tomorrow | ich waer mariye mit epper Anne rode |
| pdc_for_eng:S0012L03U02 | 12 | use | draft | I wouldn't like to speak Pennsylvania Dutch with someone else tomorrow | ich deet net gleiche mariye mit epper Anne Deitsch schwetze |
| pdc_for_eng:S0013L01U03 | 13 | use | draft | you speak Pennsylvania Dutch with someone else today | du schwetzscht heit mit epper Anne Deitsch |
| pdc_for_eng:S0014L01U01 | 14 | use | draft | do you speak Pennsylvania Dutch with someone else? | schwetzscht du mit epper Anne Deitsch? |
| pdc_for_eng:S0016L01U03 | 16 | use | draft | he wants to practise speaking with someone else all day | er will der ganz Daag mit epper Anne schwetze iewe |
| pdc_for_eng:S0016L02U02 | 16 | use | draft | I'm going to practise speaking with someone else later on | ich waer schpeeder mit epper Anne schwetze iewe |
| pdc_for_eng:S0016L03U05 | 16 | use | draft | he wants to come back and practise speaking with someone else | er will zerickkumme un mit epper Anne schwetze iewe |
| pdc_for_eng:S0017L03U04 | 17 | use | draft | I want to find out what the answer is with someone else | ich will mit epper Anne ausfinne, was die Antwatt iss |
| pdc_for_eng:S0018L01U02 | 18 | use | draft | we want to practise speaking with someone else later on | mir welle schpeeder mit epper Anne schwetze iewe |
| pdc_for_eng:S0020L01U06 | 20 | use | draft | you don't want to speak Pennsylvania Dutch with someone else today | du witt heit net mit epper Anne Deitsch schwetze |
| pdc_for_eng:S0021L02U03 | 21 | use | draft | I'm learning a little Pennsylvania Dutch with someone else | ich bin mit epper Anne en bissel Deitsch am lanne |
| pdc_for_eng:S0023L01U01 | 23 | use | draft | I'm going to practise speaking with someone else soon | ich waer ball mit epper Anne schwetze iewe |
| pdc_for_eng:S0033L03U03 | 33 | use | draft | are you already learning Pennsylvania Dutch with someone else? | bischt du schunn mit epper Anne am Deitsch lanne? |

## Reversal

For each row above, set `target_text` back to the value in the last column (replace `epper anne` with `epper Anne`).

```sql
UPDATE course_practice_phrases
   SET target_text = replace(target_text, 'epper anne', 'epper Anne')
 WHERE course_code = 'pdc_for_eng'
   AND target_text LIKE '%epper anne%';
```
