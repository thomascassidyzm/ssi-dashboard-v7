# Writes the report for Kai from sheet-rows.json + errors-445.json.  python3 -I report.py <out.md>
import json,os,sys
r={x['seed']:x for x in json.load(open('sheet-rows.json'))}; E=json.load(open('errors-445.json'))
L=lambda v:', '.join(map(str,v))
S=[7,35,147,178,408,519,552,624]
md=f"""# Irish (gle_v2): Eoghan sheet, full check against his own file

Checked 17 Nov against the live course (read through Popty). Nothing in the course was changed. Nothing was sent to Eoghan.

## The main finding: we hold his sheet in two saved states, and #445 used the unfinished one

- Eoghan's file is one sheet, but we hold it in two states. The copy uploaded on 16 Nov (the one #251, #445 and #448 built from) is the state he saved on **3 Nov**, when he had worked through **seeds 1 to 501 only**. In that copy, rows 502 to 667 just repeat our old Irish in his column.
- His **completed** sheet (502 to 667 filled in) was uploaded on 9 Nov. That upload is no longer on disk. Its wording survives in the seed list built from it on 10 Nov.
- So #445 compared rows 502 to 667 against our own old text, not his suggestions. Where live matched his real suggestion, it found the match in the 10 Nov list and called it "your later suggestion". There is no later suggestion: those rows are his one sheet, finished.
- "Your September correction" came from the same 10 Nov list. It marked rows where we had already changed our line in September (our own fixes after his first feedback), before he saw the sheet. Those were our fixes, not his corrections.

**What I used:** his own file for seeds 1 to 500 and 668. For 501 to 667, the 10 Nov copy of his column. That copy matches his own file word for word on all of 1 to 500, so I trust it, but it is a copy. **If you still have his completed file, re-upload it and I will confirm those 167 rows against it.**

## Counts (668 rows)

| | Rows |
|---|---|
| Taken (live is his line) | **179** |
| Partly taken | **185** |
| Kept ours | **142** |
| No suggestion from him | 151 |
| No suggestion, but we changed the line after he saw it | 10 |
| Can't settle (seed 501) | 1 |

Of the 179 taken: 143 are his line exactly, 23 are his line with a slip of his tidied (as you ruled for 465), 10 are his line written with tá mé / muid (as 111), and 3 are a form he gave in a bracket.

Calibration: 98, 111 and 465 all come out taken.

**On "we took most of his suggestions":** he made 507 suggestions. We took 179 in full (35%) and part of another 185 (36%). We kept ours on 142 (28%). In 61 of the partly rows only one or two words still differ. So we took something from him on about seven rows in ten, but his whole line on about one in three. In seeds 501 to 668 we kept ours more often than not (56 kept, 37 partly, 34 taken).

## Where #445 was wrong, and why

1. **"Later suggestion" (34 rows):** {L(E['later'])}. Cause: the unfinished file. 29 of these are simply taken and are now blank and white. 502 and 513 are partly taken. 196, 565 and 567 are kept ours, with the note reworded.
2. **"September correction" (14 rows):** {L(E['sept'])}. Cause: the September fixes were read as his. 550 is taken (his sráidbhaile, with the t added). The other 13 differ from what he suggested, and the notes now say so plainly.
3. **No yellow and no comment, but live differs from his suggestion (70 rows, all 503 to 668):** {L(E['white_502_667'])}. Cause: the unfinished file made these look the same as his line. This is the biggest error: Eoghan would have read them as taken.
4. **Yellow, but actually taken (3 rows):** 2, 562, 618.
5. **Comment gave a reason that does not fit his line (9 rows):** {L(E['wrong_reason'])}. For example, 519 said we kept "go fóill", but he wrote "go fóill" himself; the real difference is our "Ní fhaca mé" against his "níl … feicthe agam". Cause: for 502 to 667, the wrong column; at 9 he had made no suggestion at all.
6. **Changed after he saw it, not marked (9 rows):** {L(E['white_changed_since'])}. He passed these as they were, and we then changed them (mostly ag iarraidh to mian). They are now yellow, with one note at 204.
7. **Differs, but left white because the reason was given earlier (92 rows in 1 to 500).** The content was right, but a white row reads as taken. These are now yellow with no note, and the top note explains that.

Apart from these, rows 1 to 500 were sound: the comments there were written against his real line.

## The corrected sheet

- Yellow only where live still differs from his line: 337 rows. 217 carry a note. The other 120 share a reason given on an earlier row.
- Taken and no-suggestion rows are blank and white.
- Top note, said once: "{json.load(open('note.json'))}"
- Every quoted Irish string was checked against live, his line, or the sentence the note names.

## 8 sample comments

""" + '\n'.join(f"- **{n}** {r[n]['live']}\n  - {r[n]['comment']}" for n in S) + """

## Gaps and things for you

- **Seed 501:** live matches his 3 Nov wording ("muinín a bheith as sibh"). The 10 Nov copy of his completed sheet reads "muinín a bheith agam asaibh". I can't tell which is his final wording without the completed file. Left blank and white.
- **Seeds 502 to 667** rest on the 10 Nov copy, as above.
- **No reason on record (5 rows):** 214, 493, 505, 545, 634. I could not find why we differ, so the note only says what we have ("Went with …"). You may want to take his line on these, or give me the reason.
- **652:** his Irish there says "are you ready", which looks as if it belongs to 664. The note says so.
- **616:** we kept "bhí tú an-chróga", although we took the same pattern from him at 147 ("B'an-chineálta a bhí sí"). Your call.
- **551 to 553:** "cuma ghránna ar an séipéal" came from the September fixes. The note just says "Went with".
- **129, 408 and 624** are kept ours, as agreed, with notes.
- **His slips we tidied without a note (23 rows):** 65, 67 (an → ar mian), 69 (um thráthnóna), 104, 173, 176, 215, 220, 221, 241, 261, 287, 294, 381, 423, 454, 459, 489, 492, 510, 538, 550, 562.
"""
open(sys.argv[1],'w').write(md)
