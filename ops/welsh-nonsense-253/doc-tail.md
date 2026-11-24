## How much was read, and how far to trust it

- **The classifier (Sonnet, through `claude --print`) read every practice row of every Welsh course**: 8 courses, 64,099 BUILD/USE rows (49,196 distinct English+Welsh pairs), seed 1 to the end of each. Seed sentences, LEGO debut rows and component rows were not in scope.
- **I hand-read every row it flagged (521 distinct)**. 304 of them were fine (odd but sayable, open-ended BUILD fragments, or a non-meaning issue), so the counts above are mine, not the model's.
- **Calibration**: #249's 10 known senseless rows and 3 known odd-but-fine rows, plus all of cym_s seeds 320–334. Haiku missed 6 of the 10, so I used Sonnet. In the calibration run Sonnet flagged all 10 positives and none of the 3 negatives; in the full run it flagged 9 of 10 (it missed "game is a lucky word", which is listed above). **Expect roughly 1 in 10 senseless rows to have slipped through.**
- **North is NOT clean, and is not proven clean.** It has no "breathe" row, but it has its own hand-confirmed senseless rows (e.g. "how high is the most?", "that doesn't mean some postcards", "we could mean she was right"), at a lower rate than South. A random hand-read of 60 *unflagged* North rows from seeds 250–310 found no further clear nonsense but 3 more borderline ones ("nothing would be like a challenge tonight", "there's no point for me to get left without a new bed", "instead of in a minute"). The North tail has the same BUILD-recombination shape as South, just milder.
- South's senseless rows sit almost entirely from seed ~276 on, as #249 predicted. Seeds 1–275 produced 0 CLEAR rows in South.

## Back-fill (S0328L01 only, as you asked)

After the delete, the *ta pryd* (whenever) basket in cym_s and cym_sv2 has **5 BUILD rows and 0 USE rows**. That clears the BUILD floor of 3 (P5), but it had no USE rows even before the delete (P10 wants about 2). Two of the 5 left also use *anadlu* before S0328L03 teaches it (P2): **B01** "whenever you breathe" and **B05** "it is a good idea to breathe whenever you want". Not touched.

## Other things seen in passing (not senseless, not touched)

- **Two sentences in one USE row** (P20 says one sentence): sv2/nv2 seeds 1639–1656, e.g. "excuse me, can I sit with you? I wouldn't have dared to go out". Several are listed above as BORDERLINE where the second sentence has nothing to do with the first; the rest are sayable but still two sentences.
- **English ungrammatical, Welsh fine**: "let me buy wall" (S0278), "the story will keep probably" (S0320), and #249's "…probably" endings (320–321).
- **Welsh typo for Aran**: seed 333 "mae'n pentref" where its siblings have "mae'r pentref" (#249).
- **Bare-LEGO BUILD rows** (P3): North seed 304 "the game" / "can win the game".
- **Welsh for Yoruba speakers**: several rows pair a past habit or past tense with "today", "tomorrow night" or "on my own" (e.g. *Mi oedd fy ffrind i'n arfer gweithio nos fory*). Those are the CLEAR ones there. Some BORDERLINE rows there are marked "known side only", meaning the Welsh is sound and the problem is the Yoruba prompt.
- **Anthem course**: the LEGO *collasant* is glossed "shed" (as in blood), so its BUILD rows read "shed the poets' homeland" on the known side while the Welsh ("they lost…") is sound. All 9 are known-side only.
