# lmo_for_eng orthography census — 668 seeds

Read-only census of `course_seeds` where `course_code='lmo_for_eng'` (668 rows, seed 1–668, all present — no gap). No writes made. Scratch scripts + raw wordlist: `.a108-lmo-census/` in the repo (not committed; `wordlist.json` holds the full 1,034-token frequency list).

**Tokenisation rule applied throughout:** apostrophe treated as a letter (never stripped — `l'è`, `gh'hoo`, `d'accord` are single tokens); only sentence-final `. ? !` and commas stripped. Verified this doesn't merge distinct words before running any count.

---

## 1. Variety — Western vs Eastern Lombard

| Marker | Side | Occurrences | Distinct seeds |
|---|---|---:|---:|
| `minga` (negator) | Western | 158 | 153 |
| `on`/`ona` (indef. article) | Western | 120 | 118 |
| `oeu` digraph | Western | 112 | 107 |
| `pussee` (more) | Western | 34 | 34 |
| `quajcoss` (something) | Western | 24 | 24 |
| `tucc` (all) | Western | 9 | 9 |
| `adess` (now) | Western | 7 | 7 |
| `briza` (negator) | Eastern | 0 | 0 |
| `piö`/`piu` | Eastern | 0 | 0 |
| `ergot`/`argota` | Eastern | 0 | 0 |
| `ö` or `ü` umlaut | Eastern | 0 | 0 |
| `chèl` | Eastern | 0 | 0 |
| `mia` as negator | Eastern | 0 | 0 |

**`mia` correction (flagging my own false-positive check):** `mia` (11 occurrences, 11 seeds) appears in the corpus, but every single instance is `la mia` / preceded by an article — e.g. seed 136 `l'è la mia amisa` ("she's my friend"), seed 198 `la mia fioeula` ("my daughter"). That's the possessive "my," not the Eastern negation particle. I checked all 11 by hand; none is a negator use. True Eastern-negator count is 0.

**Verdict (count, not interpretation): 100%-Western.** Every Eastern diagnostic marker scores zero across all 668 targets; every Western marker is well attested, several (`minga`, `on`/`ona`, `oeu`) at high frequency. This isn't a lopsided split — it's a clean absence of any Eastern/Bergamasque-Brescian feature. The corpus is Western Lombard (Milanese-type), not a mixed or Eastern-leaning variety.

---

## 2. Orthography — which Western convention

| Marker | Occurrences | Distinct seeds |
|---|---:|---:|
| `oeu` digraph | 112 | 107 |
| `-à` word-final ending (infinitives etc.) | 302 | 253 |
| Elision apostrophe (`l'`, `d'`, `gh'`, etc.) | 265 | 219 |
| `ö`/`ü`/`ä` umlauts | 0 | 0 |
| Circumflex (â/ê/î/ô/û) | 0 | 0 |

**Verdict: Classical Milanese (Cherubini / Circolo Filologico Milanese) orthography, not umlaut-based Ticinese/Scriver Lombard.** Zero umlauts and zero circumflexes across 668 seeds, against 112 seeds carrying the classical `oeu` digraph and 302 `-à`-final tokens (the classical infinitive/stressed-vowel marker). This is a count-supported verdict, not a guess — the umlaut-based rival convention leaves literally no trace.

Doubled-consonant short-vowel marking (also a classical-orthography hallmark, e.g. `robba`, `settimanna`, `bonna`, `macchina`) coexists with single-consonant spellings of the *same words* — see §3, that's inconsistency, not evidence of a rival system, since the doubled and undoubled forms of the same words are literally standing side by side.

---

## 3. Inconsistency — the actual spelling-drift audit

Raw pass (doubled-vs-single-consonant + accent-collapse bucketing, then a separate hand-checked vowel-substitution sweep for pairs like `resposta`/`risposta` that neither accent nor doubling explains) surfaced **82 candidate near-identical pairs**. I checked every one against its seed context — this matters because Lombard verb morphology uses exactly the same kind of surface difference (`-à` infinitive vs `-aa` past participle vs bare-stem present tense) that spelling drift does, and several monosyllables are genuinely distinct words that differ only by accent (`la` "the" vs `là` "there"; `te` "you" vs `tè` "tea"; `no` "no" vs `nò` interjection; `su` "on" vs `sù` "up"; `chi` "who" vs `chì` "here"). Collapsing those would have manufactured false findings, so I excluded anything that resolved to a real grammatical or lexical distinction in context.

**Result: 63 of 82 candidates are NOT inconsistency** (verb-form triplets like `parlà`/`parla`/`parlaa`, noun/verb homographs like `porta` "door" vs `portà` "to carry," pronoun/article homographs like `la`/`là`). **19 candidates are genuine same-word, same-meaning, same-grammatical-form spelling variants** — this is the real inconsistency inventory, sorted by total occurrence:

| # | Word (meaning) | Spelling A | Count A | Ex. seed | Spelling B | Count B | Ex. seed |
|---|---|---|---:|---:|---|---:|---:|
| 1 | need (n.) | `besogn` | 21 | 167 | `bisogn` | 14 | 44 |
| 2 | they are | `hinn` | 13 | 87 | `hin` | 2 | 572 |
| 3 | thing (n.) | `robba` | 8 | 47 | `roba` | 4 | 116 |
| 4 | before | `prima` | 6 | 25 | `primma` | 6 | 119 |
| 5 | week (n.) | `settimana` | 6 | 186 | `settimanna` | 3 | 38 |
| 6 | good (fem.) | `bonna` | 4 | 47 | `bona` | 3 | 123 |
| 7 | answer (n.) | `risposta` | 5 | 66 | `resposta` | 1 | 17 |
| 8 | as soon as | `appenna` | 5 | 28 | `appena` | 1 | 97 |
| 9 | agreed | `d'accord` | 4 | 384 | `d'acord` | 2 | 83 |
| 10 | car (n.) | `macchina` | 3 | 121 | `machina` | 3 | 447 |
| 11 | tired | `stracch` | 4 | 39 | `strach` | 1 | 455 |
| 12 | afternoon (n.) | `dopodisnà` | 3 | 35 | `dopodisnaa` | 2 | 167 |
| 13 | together | `insemma` | 3 | 262 | `insema` | 2 | 117 |
| 14 | thank you | `grazie` | 2 | 173 | `grazzie` | 2 | 73 |
| 15 | young | `gioven` | 2 | 69 | `giovin` | 2 | 230 |
| 16 | window (n.) | `fenestra` | 2 | 446 | `finestra` | 1 | 585 |
| 17 | we had | `gh'avevem` | 2 | 603 | `gh'avevom` | 1 | 521 |
| 18 | possible | `possibil` | 2 | 86 | `possibel` | 1 | 430 |
| 19 | office (n.) | `l'offizzi` | 1 | 511 | `l'uffizzi` | 1 | 184 |

The task's given example (`resposta`/`risposta`, seeds 17/66) is #7. It generalises: single-vs-doubled consonant (`robba`/`roba`, `settimanna`/`settimana`, `macchina`/`machina`, `bonna`/`bona`, `d'accord`/`d'acord`, `stracch`/`strach`, `insemma`/`insema`, `grazzie`/`grazie`), a vowel swap (`besogn`/`bisogn`, `fenestra`/`finestra`, `l'offizzi`/`l'uffizzi`, `gioven`/`giovin`, `possibil`/`possibel`), or a verb-ending variant on a noun (`dopodisnà`/`dopodisnaa` — this one being a noun, not a verb, the `-à`/`-aa` split here IS inconsistency, unlike the true verb infinitive/participle pairs excluded below), and a 1st-plural imperfect ending (`gh'avevem`/`gh'avevom`).

**63 excluded candidates, for transparency (not inconsistency — labelled as interpretation):**
- Verb paradigm splits misread as spelling drift: `dì`/`dii`/`di` (say-infinitive / said-participle / "of," three unrelated grammatical items), `fà`/`fa`/`faa`, `parlà`/`parla`/`parlaa`, `andà`/`andaa`, `provà`/`provaa`, `staa`/`stà`/`sta`, `sentii`/`senti`/`sentì`, `imparà`/`imparaa`, `lavorà`/`lavora`, `domandà`/`domanda`/`domandaa`, `spettà`/`spettaa`, `pensà`/`pensaa`/`pensa`, `finì`/`finii`, `capitaa`/`capita`/`capità`, `passà`/`passaa`, `comenzaa`/`comenzà`, `trovà`/`trovaa`, `voltà`/`voltaa`, `cambià`/`cambia`, `cominciaa`/`comincià`, `giuttà`/`giutta`, `voreva`/`vorevi`, `podaria`/`podarii`, `podeva`/`podevi`, `gh'aveva`/`gh'avevi`, `dovevi`/`doveva`, `savevi`/`saveva` — all are legitimate person/tense inflections of one verb, not two spellings of one form.
- Homographs distinguished only by accent (different words): `la`/`là`, `te`/`tè`, `me`/`mè`, `no`/`nò`, `su`/`sù`, `chi`/`chì`, `so`/`sò`, `le`/`lee`, `sì`/`sii`, `poo`/`pò`, `ma`/`maa`, `seet`/`set`.
- Noun/verb homographs: `porta` ("door") / `portà` ("to carry"); `volta` ("time/occasion") / `voltà`/`voltaa` ("turn/turned"); `domanda` ("question") / `domandi` ("I ask" — grammatical); `gh'hann`/`gh'hinn` ("have" vs "are," different auxiliary verbs).
- One case left genuinely uncertain: `lù` (4×, "he") vs `lu` (1×, seed 639, glossed "with you sir" in the known side) — could be the same word misspelled or a distinct formal-address form; I couldn't resolve it from context alone and am not counting it either way. **Interpretation, flagged not resolved.**

Full 1,034-token frequency list with per-token seed lists: `.a108-lmo-census/wordlist.json` (not committed — scratch workspace per the job brief). Top 150 tokens:

```
1. che (255)      31. l'era (26)      61. bisogn (14)     91. gent (9)         121. doman (7)
2. de (176)       32. pensi (26)      62. chì (13)        92. idea (9)         122. emm (7)
3. la (164)       33. andà (25)       63. ghe (13)        93. lavorà (9)       123. liber (7)
4. minga (158)    34. quajcoss (24)   64. hinn (13)       94. lì (9)           124. nissun (7)
5. el (157)       35. no (22)         65. sicur (13)      95. manera (9)       125. nò (7)
6. a (146)        36. parlà (22)      66. tò (13)         96. pò (9)           126. penset (7)
7. te (128)       37. perchè (22)     67. vess (13)       97. podet (9)        127. prest (7)
8. l'è (100)      38. voreva (22)     68. ben (12)        98. problema (9)     128. quant (7)
9. quell (66)     39. besogn (21)     69. cognossi (12)   99. sentii (9)       129. regordà (7)
10. in (58)       40. del (21)        70. content (12)    100. staa (9)        130. stà (7)
11. se (57)       41. gh'hoo (21)     71. d'on (12)       101. tucc (9)        131. tard (7)
12. on (54)       42. ma (21)         72. inscì (12)      102. vedè (9)        132. tropp (7)
13. me (42)       43. pront (21)      73. via (12)        103. ven (9)         133. andaa (6)
14. ona (42)      44. tant (21)       74. anmò (11)       104. vialter (9)     134. assee (6)
15. dii (40)      45. e (20)          75. despias (11)    105. al (8)          135. donna (6)
16. per (39)      46. quand (20)      76. gh'ha (11)      106. bell (8)        136. dopo (6)
17. dree (38)     47. amis (18)       77. imparà (11)     107. cà (8)          137. fioeu (6)
18. son (38)      48. mè (18)         78. mia (11)        108. faa (8)         138. foeura (6)
19. i (36)        49. quella (18)     79. podaria (11)    109. fin (8)         139. gh'aveva (6)
20. fà (34)       50. seet (18)       80. vorevi (11)     110. interessant (8) 140. gh'hann (6)
21. hoo (34)      51. voeuret (18)    81. cont (10)       111. mej (8)         141. giò (6)
22. pussee (34)   52. voeuri (18)     82. gh'emm (10)     112. noeuv (8)       142. hann (6)
23. propi (33)    53. pias (16)       83. indove (10)     113. pensavi (8)     143. important (6)
24. l'ha (31)     54. poo (16)        84. lombard (10)    114. robba (8)       144. jer (6)
25. dì (29)       55. poss (16)       85. sit (10)        115. savè (8)        145. lee (6)
26. come (28)     56. provà (16)      86. su (10)         116. tutt (8)        146. mì (6)
27. sì (28)       57. quaj (16)       87. vegnì (10)      117. voeuren (8)     147. nagott (6)
28. temp (28)     58. saria (16)      88. vist (10)       118. voreven (8)     148. olter (6)
29. là (27)       59. voeur (16)      89. di (9)          119. adess (7)       149. par (6)
30. con (26)      60. cossa (15)      90. fa (9)          120. avaria (7)      150. podeva (6)
```

---

## 4. Capitalisation and punctuation

| | Target (Lombard) | Known (English) |
|---|---:|---:|
| Starts capitalised | 0 / 668 (0%) | 658 / 668 (98.5%) |
| Starts lowercase | 668 / 668 (100%) | 10 / 668 (1.5%) |
| Ends `.` | 0 / 668 | 539 / 668 (80.7%) |
| Ends `?` | 111 / 668 (16.6%) | 109 / 668 (16.3%) |
| Ends `,`/`;`/`:` | 0 / 668 | 0 / 668 |
| Ends with no terminal punctuation | 557 / 668 (83.4%) | 20 / 668 (3.0%) |

**Count: the target side is uniformly uncapitalised and (mostly) unpunctuated; the known side follows normal English sentence conventions.** The 10 known-side lowercase-starts are all sentence fragments continuing an implied context (seed 3 `how to speak as often as possible.`, seed 639 `with you sir`, seed 656 `with you all` — clause continuations of a build sequence, not typos). Question marks track closely between the two sides (111 target vs 109 known — 2-seed gap, not investigated further, out of scope for this census). The target side never carries a final period even when the known side does (539 known periods vs 0 target periods) — that's a deliberate, 100%-consistent convention across all 668 seeds, not drift.

---

## Gaps

None. All 668 seeds were readable via `DATABASE_URL`; no access failures encountered.

---

*No database writes made. No audio generated. Full wordlist and analysis script retained in `.a108-lmo-census/` for reproduction.*
