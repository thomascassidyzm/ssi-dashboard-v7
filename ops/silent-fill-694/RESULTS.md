# Silent rows filled, per course (#694·AI, 18 Nov 2026)

This is a live readback through Popty script-view after the fill. The unit is one empty audio slot on a played row. 4,613 TTS characters were spent of the 72,000 cap. eng_for_pan and eng_for_guj were not touched (Kai hold D3). No new empty slots appeared since the first read.

| course | linked free | recorded | held: text fix pending | held by Kai (other English voice) | refused EXISTS_IN_LANGUAGE | refused VOICE_NOT_CAST |
|---|---|---|---|---|---|---|
| ara_eg_for_eng | 283 | 27 | 24 | 7 | 4 |  |
| ara_for_eng | 104 |  | 4 |  |  |  |
| ara_lb_for_eng | 256 | 35 | 21 | 8 | 13 |  |
| deu_at_for_eng | 1 |  |  |  |  |  |
| eng_for_ara | 1 |  |  |  | 1 |  |
| eng_for_deu |  |  |  |  | 2 |  |
| eng_for_hin |  | 36 |  |  |  |  |
| eng_for_mar | 3 |  | 2 |  | 4 | 452 |
| eng_for_sin | 3 |  |  |  | 3 |  |
| eng_for_spa |  |  |  |  | 2 |  |
| eng_for_tel | 3 |  | 26 |  |  | 404 |
| eng_for_urd | 1 |  |  |  | 1 |  |
| jpn_for_eng | 33 | 2 | 15 |  | 14 |  |
| por_for_eng | 50 |  | 15 |  | 2 |  |
| zho_for_jpn | 7 | 129 | 31 |  | 23 |  |
| **total** | **745** | **229** | **138** | **15** | **69** | **856** |

**Held for a text fix**, by #447 family. This counts row-level matches plus LEGO-level fixes on the row's LEGO: L26 74, DUP 28, LONG 25, QMARK 6, DUP+ZUT 2, ZUT 1, L26+LONG 1, P17 1. L26 means the LEGO says something its seed does not; LONG means a LEGO over 8 syllables; DUP means a duplicate row due for deletion.

**VOICE_NOT_CAST.** Telugu and Marathi have only the 2026-09-04 draft casting, which Tom never chose, so Popty refuses every tel and mar clip. 856 prompt slots, 32,454 characters, are waiting on Tom casting those two languages.

**EXISTS_IN_LANGUAGE.** The English already exists in other voices, so Popty refuses a fresh render, and link-clip refuses another voice's clip. That leaves two ways forward: re-record under Kai's approval token, or a voice ruling. This is the same question as Kai's Arabic hold.

**ara_eg / ara_lb.** The 17 Nov list put 575 slots "in another English voice". It compared text only. 539 of those slots have clips in the course's CURRENT cast voice (cartesia d293d509), so link-clip's voice check accepted them as free links. Only 15 are truly in another voice (VOICE_MISMATCH), and those stay held.
Listening page (UNHEARD): https://watson-1.tail4968cb.ts.net:10000/d/759150dc
