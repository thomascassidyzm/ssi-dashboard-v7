# hin_for_eng female forms applied (#762) — 15 Oct

Applied through Popty edit-batch with the Kai key, event `79ed0e02`, one transaction, undo file `2026-10-15T14-16-57-042Z-79ed0e02-c37c-439e-ae6f-bd9f2442d437.json`. Only `course_gender_expansions` changed. No audio was rendered, because Hindi is still uncast (`VOICE_POLICY`, checked today). Every row was read in full against its seed. A model did the reading, not a native speaker. Live text matched the #718 read on all 113 rows. The table was re-read after the write, and all 100 rows say what is listed here.

## (b) 6 corrected: थोड़ा → थोड़ी before थकी हुई

- seed 39 `S0039`: लेकिन मैं इस सुबह थोड़ा थका हुआ हूँ। → **लेकिन मैं इस सुबह थोड़ी थकी हुई हूँ।**
- seed 39 `S0039L04B02`: थोड़ा थका हुआ हूँ। → **थोड़ी थकी हुई हूँ।**
- seed 39 `S0039L04U02`: मैं आज थोड़ा थका हुआ हूँ। → **मैं आज थोड़ी थकी हुई हूँ।**
- seed 39 `S0039L04U05`: मैं थोड़ा थका हुआ हूँ लेकिन शुरू करना चाहता हूँ। → **मैं थोड़ी थकी हुई हूँ लेकिन शुरू करना चाहती हूँ।**
- seed 41 `S0041L02U02`: मैं थोड़ा थका हुआ महसूस कर रहा हूँ। → **मैं थोड़ी थकी हुई महसूस कर रही हूँ।**
- seed 42 `S0042L03U03`: मैं थोड़ा थका हुआ महसूस करने लगा था। → **मैं थोड़ी थकी हुई महसूस करने लगी थी।**

## (c) The 8 two-subject texts: what each occurrence got

**Finding.** Expansions are keyed on the exact text: unique (course_code, original_text, text_side). `loadGenderMap` gives target1 (Aarti) `expanded_f` and target2 (Kunal) `expanded_m`. `course_audio.text` also keeps the original text, and it is the lookup key for reuse. So a reading cannot be stored per row without a schema change. The table and the clip key would both need it, and I may not run a migration. **But it doesn't matter to any learner here.** In every one of the 8 texts, the occurrences with two different subjects split along played and component rows, and component rows are never played as audio. In the player, `generateLearningScript.ts` fills `componentPhrasesByLego` and never reads it; `backendCyclesToRounds.ts` drops `component_intro` (Tom's ruling, 6 Aug). Components show only as written tiles. So text keying gives every PLAYED occurrence the right form, and no code change was needed.

- सकता → none, stays सकता. played S0225L03 + B01 'could' = **he** (अगर वो कर सकता): stays सकता. Speaker's 'can' only on components S0010L03C03, S0056L04C01 (never played).
- चाहता → none, stays चाहता. all three occurrences are components (S0015L02C01 I, S0016L05C01 he, S0030L03C01 I); none is played.
- बाधा डालना नहीं चाहता → none. build S0036L02B03: seed 36's subject is हम (we), not the speaker alone, so no female form. The text itself should read चाहते (a non-gender defect, left for Kai).
- लगा → none, stays लगा. played S0124L01 + B01 is मुझे लगा 'I felt/thought', which agrees with the thought, not the speaker. The speaker's 'started' is only on component S0077L04C02.
- रहा → none, stays रहा. S0140L03 + B01: the LEGO is glossed **m-prog** and teaches the masculine progressive; its pair is S0132L03 **f-prog** रही. A female रही would contradict the gloss. Builds of seed 140 (e.g. नहीं देख पा रहा → पा रही) did get the female form.
- तो गया। → **तो गई।**. build S0144L02B02 'so went': the only occurrence, seed 144, and the subject is the speaker.
- मिला → **मिली**. S0234L03 + B01 'met': only occurrences, seed 234 मैं … से मिला, so the speaker.
- मिला। → **मिली।**. S0234L04 'met-sent-final': only occurrence, seed 234, the speaker.

**If Kai later wants per-row readings** (for example, if components start being played): add a nullable per-row override, such as a `target_reading_f` column on the content rows, or key the expansion table by row id. The clip-reuse key would have to change to the spoken text too. That needs a migration, so it is Tom's go. It is not needed today.

## (a) 94 female forms added (91 + the 3 above)

Seed 127's 8 were NOT written: #349·Q's hold stands. Its branch is unmerged and seed 127 still reads इसीलिए मैं आपसे मिलना नहीं चाहता था। ('that's why'), the opposite of its English.

- कर रहा हूँ। → **कर रही हूँ।** (component S0002L01C03)
- मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रहा हूँ। → **मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रही हूँ।** (use S0003L01U02)
- रहा हूँ। → **रही हूँ।** (component S0005L02C05, component S0029L02C04)
- मैं जितना हो सके उतनी मेहनत से सीखने की कोशिश कर रहा हूँ। → **मैं जितना हो सके उतनी मेहनत से सीखने की कोशिश कर रही हूँ।** (use S0007L03U05)
- रहा हूँ → **रही हूँ** (component S0008L04C02)
- समझाने की कोशिश करने जा रहा हूँ कि → **समझाने की कोशिश करने जा रही हूँ कि** (build S0008L04B02)
- समझाने की कोशिश करने जा रहा हूँ कि मेरा मतलब क्या है। → **समझाने की कोशिश करने जा रही हूँ कि मेरा मतलब क्या है।** (build S0008L04B03)
- बोलता → **बोलती** (component S0009L02C01)
- मैं थोड़ी हिंदी सीखने की कोशिश कर रहा हूँ। → **मैं थोड़ी हिंदी सीखने की कोशिश कर रही हूँ।** (use S0009L01U04)
- चाहूँगा → **चाहूँगी** (component S0011L01C01, component S0012L01C02)
- चाहता। → **चाहती।** (component S0019L04C03)
- नहीं करना चाहता। → **नहीं करना चाहती।** (lego S0019L04, build S0019L04B01)
- बंद नहीं करना चाहता। → **बंद नहीं करना चाहती।** (build S0019L04B02)
- बात करना बंद नहीं करना चाहता। → **बात करना बंद नहीं करना चाहती।** (build S0019L04B03)
- आपसे कुछ पूछना चाहता था। → **आपसे कुछ पूछना चाहती थी।** (build S0030L03B03)
- चाहता था। → **चाहती थी।** (lego S0030L03, build S0030L03B01)
- था। → **थी।** (component S0030L03C02, component S0042L03C02)
- पूछना चाहता था। → **पूछना चाहती थी।** (build S0030L03B02)
- मैं करीब एक महीने हिंदी सीखना चाहता हूँ। → **मैं करीब एक महीने हिंदी सीखना चाहती हूँ।** (use S0038L01U04)
- सीख रहा → **सीख रही** (component S0038L03C01)
- थका हुआ → **थकी हुई** (component S0039L04C01)
- मैंने थोड़ा थका हुआ महसूस करना शुरू किया। → **मैंने थोड़ी थकी हुई महसूस करना शुरू किया।** (use S0040L03U03)
- कर रहा → **कर रही** (component S0041L02C01)
- ठीक महसूस करने लगा था। → **ठीक महसूस करने लगी थी।** (build S0042L03B03)
- बेहतर महसूस करने लगा था। → **बेहतर महसूस करने लगी थी।** (build S0042L03B02)
- महसूस करने लगा → **महसूस करने लगी** (component S0042L03C01)
- महसूस करने लगा था। → **महसूस करने लगी थी।** (lego S0042L03, build S0042L03B01)
- था → **थी** (component S0043L03C03)
- नहीं सोच रहा था कि → **नहीं सोच रही थी कि** (lego S0043L03, build S0043L03B01)
- नहीं सोच रहा था कि कैसे → **नहीं सोच रही थी कि कैसे** (build S0043L03B02)
- नहीं सोच रहा था कि क्या → **नहीं सोच रही थी कि क्या** (build S0043L03B03)
- सोच रहा → **सोच रही** (component S0043L03C02)
- करता। → **करती।** (component S0046L02C03)
- गलतियाँ करने की चिंता नहीं करता। → **गलतियाँ करने की चिंता नहीं करती।** (build S0046L02B03)
- गलतियाँ की चिंता नहीं करता। → **गलतियाँ की चिंता नहीं करती।** (build S0046L02B02)
- चिंता नहीं करता। → **चिंता नहीं करती।** (lego S0046L02, build S0046L02B01)
- कर रहा। → **कर रही।** (component S0050L04C02)
- कोशिश नहीं कर रहा। → **कोशिश नहीं कर रही।** (lego S0050L04, build S0050L04B01)
- खत्म करने की कोशिश नहीं कर रहा। → **खत्म करने की कोशिश नहीं कर रही।** (build S0050L04B02)
- जितनी जल्दी हो सके कोशिश नहीं कर रहा। → **जितनी जल्दी हो सके कोशिश नहीं कर रही।** (build S0050L04B03)
- या दोस्तों के साथ मिलना चाहता हूँ। → **या दोस्तों के साथ मिलना चाहती हूँ।** (use S0051L01U05)
- या ध्यान से कहना चाहता हूँ। → **या ध्यान से कहना चाहती हूँ।** (use S0057L01U03)
- या थोड़ा धीरे कहना चाहता हूँ। → **या थोड़ा धीरे कहना चाहती हूँ।** (use S0061L01U03)
- या दोबारा शुरू करना चाहता हूँ। → **या दोबारा शुरू करना चाहती हूँ।** (use S0061L02U03)
- मैं खुद को परखने के लिए समय लेना चाहता हूँ। → **मैं खुद को परखने के लिए समय लेना चाहती हूँ।** (use S0065L05U02)
- या खुद करना चाहता हूँ। → **या खुद करना चाहती हूँ।** (use S0065L01U03)
- या खुद को परखने के लिए समय लेना चाहता हूँ। → **या खुद को परखने के लिए समय लेना चाहती हूँ।** (use S0065L05U05)
- या थोड़ा समय लेना चाहता हूँ। → **या थोड़ा समय लेना चाहती हूँ।** (use S0065L04U03)
- या ध्यान से परखना चाहता हूँ। → **या ध्यान से परखना चाहती हूँ।** (use S0065L03U03)
- या ध्यान से जवाब ढूँढना चाहता हूँ। → **या ध्यान से जवाब ढूँढना चाहती हूँ।** (use S0066L03U05)
- या ध्यान से ढूँढना चाहता हूँ। → **या ध्यान से ढूँढना चाहती हूँ।** (use S0066L02U03)
- या थोड़ा रुकना चाहता हूँ। → **या थोड़ा रुकना चाहती हूँ।** (use S0067L02U03)
- या किसी को बताना चाहता हूँ। → **या किसी को बताना चाहती हूँ।** (use S0071L03U03)
- या सच बताना चाहता हूँ। → **या सच बताना चाहती हूँ।** (use S0071L01U03)
- या सुनने देना चाहता हूँ। → **या सुनने देना चाहती हूँ।** (use S0071L02U03)
- या शुक्रिया कहना चाहता हूँ। → **या शुक्रिया कहना चाहती हूँ।** (use S0073L01U03)
- या ध्यान से समझना चाहता हूँ। → **या ध्यान से समझना चाहती हूँ।** (use S0074L01U03)
- पाया → **पाई** (component S0078L04C02)
- या समझ लेना चाहता हूँ। → **या समझ लेना चाहती हूँ।** (use S0078L03U03)
- समझ नहीं पाया था → **समझ नहीं पाई थी** (build S0078L04B03)
- करूँगा। → **करूँगी।** (component S0082L03C02)
- उन लोगों को नहीं जानता। → **उन लोगों को नहीं जानती।** (build S0085L03B02)
- जानता। → **जानती।** (lego S0085L02, build S0085L02B01)
- मैंने जो चाहता था वो किया है। → **मैंने जो चाहती थी वो किया है।** (use S0089L02U03)
- जैसे कर रहा → **जैसे कर रही** (build S0114L04B02)
- बुरा कर रहा → **बुरा कर रही** (build S0114L02B03)
- करता → **करती** (lego S0118L03, build S0118L03B01)
- बेहतर महसूस करता → **बेहतर महसूस करती** (build S0118L03B02)
- जानता → **जानती** (lego S0128L01, build S0128L01B01)
- नहीं देख पा रहा → **नहीं देख पा रही** (build S0140L03B02)
- आज सुबह उठ गया। → **आज सुबह उठ गई।** (build S0144L03B03)
- उठ गया। → **उठ गई।** (lego S0144L03, build S0144L03B01)
- गया। → **गई।** (component S0144L03C02, lego S0144L02, build S0144L02B01, lego S0215L03)
- जितना चाहता था उससे → **जितना चाहती थी उससे** (build S0144L04B02)
- जितना चाहता था उससे पहले उठ गया। → **जितना चाहती थी उससे पहले उठ गई।** (build S0144L04B03)
- तो गया। → **तो गई।** (build S0144L02B02)
- पहले उठ गया। → **पहले उठ गई।** (build S0144L03B02)
- जवाब दे पाया। → **जवाब दे पाई।** (build S0148L03B02)
- जवाब नहीं दे पाया। → **जवाब नहीं दे पाई।** (build S0148L03B03)
- तो पाया। → **तो पाई।** (build S0148L02B02)
- पाया। → **पाई।** (lego S0148L02, build S0148L02B01)
- कहता। → **कहती।** (lego S0153L03, build S0153L03B01)
- तो कहता। → **तो कहती।** (build S0153L03B02)
- कहना चाहता → **कहना चाहती** (build S0159L01B03)
- कहना चाहता हूँ → **कहना चाहती हूँ** (build S0159L01B02)
- नहीं कह रहा → **नहीं कह रही** (build S0159L02B03)
- या मैं खुद करना चाहूँगा। → **या मैं खुद करना चाहूँगी।** (use S0173L02U02)
- गया → **गई** (lego S0215L02, build S0215L02B01)
- बाहर गया। → **बाहर गई।** (build S0215L04B02)
- मिला → **मिली** (lego S0234L03, build S0234L03B01)
- मिला। → **मिली।** (lego S0234L04)
- देना चाहता → **देना चाहती** (build S0241L01B02)
- माँगने जा रहा → **माँगने जा रही** (build S0243L04B02)
- रह सकता → **रह सकती** (build S0276L01B02)

## Not touched
- The 102 non-gender Hindi notes in the #718 appendix (separate item for Kai), plus the बाधा डालना नहीं चाहता text above.
- Audio: all these slots still play the male-text Aarti clips until Tom casts Hindi and the #356·Q tool runs `RENDER=1`.