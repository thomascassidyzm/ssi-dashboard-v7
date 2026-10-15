# hin_for_eng speaker-gender forms — full read (job #718)

Kai asked (15 Oct): read every Hindi target row in full, not by rule, and say (A) which rows that agree with the speaker's gender have no female form, (B) whether the 767 stored female forms and 8 male forms are right, and (C) whether any of it reaches the learner.

**How it was read.** Every distinct Hindi target text in the course — 5729 texts carrying 7,087 rows (668 seeds, 772 LEGOs, 5,647 practice phrases incl. 369 never-played components) — was read as a sentence, with its English and its seed sentence, by one of twelve Opus readers (#721·Q–#732·Q), one verdict per text. No row was skipped or decided by pattern. A model read it, not a native speaker: see the gaps at the end.

## Totals

| | |
|---|---|
| Texts read | 5729 (verdicts: none 4851, ok 765, needs-female 99, ambiguous 8, wrong-female 6 — after one merge harmonisation, n 1012) |
| **A. Speaker-gendered texts with NO female form** | **99** — 82 on played rows, 17 on never-played components only |
| … of which the rule tool would add on a re-run (text changed after it wrote) | 26 |
| … of which the rule tool misses even after today's two fixes | 48 played + 17 components |
| … seed 127, deliberately held back for #349·Q's want/try fix | 8 |
| Texts that need a male form and have none | 0 |
| Ambiguous — one text, two subjects (Kai's call) | 8 |
| **B. Stored female forms read** | 763 on live texts: **757 right, 6 wrong** (all the same defect: थोड़ा left masculine before थकी हुई); plus 4 orphans (below), read by hand at merge: all four correct, just unused |
| Stored male forms read | 8, all right (seed 177 ×7, seed 645 ×1) |
| **C. Played slots carrying a stored reading** | 831 slots, all linked, **0 speak the stored reading** |
| Defects in the displayed Hindi noticed on the way (not gender) | 102 notes (appendix) |

## C. Wiring verdict — stored, not wired

- **The learner never reads course_gender_expansions.** The player plays whatever clip each slot's `target1_audio_id` / `target2_audio_id` points at (ssi-learning-app `CourseDataProvider.ts`). The expansion is used at exactly one moment: when phase 8 or `/api/audio/render` RENDERS a clip for that text, target1 (Aarti) is fed `expanded_f`, target2 (Kunal) `expanded_m` (`services/gender-haiku-service.cjs` loadGenderMap, `phase8-audio-v13.cjs` ~l.3385).
- **Every Aarti clip on these slots says the male Hindi.** The course had no expansion rows until 14 Oct (#356·Q), so every existing target1 clip was rendered from the written (male) text. Of the 831 played slots carrying a stored text, all are linked and none points at a clip of the stored reading.
- **Nothing will re-render them by itself.** Phase 8's needs (`/needs/hin_for_eng`, read today) reports target1 missing 0, target2 missing 0: a linked slot is never seen as stale because its stored reading changed.
- **Rendering is refused today.** A dry run of `POST /api/audio/render` for a female reading answered `VOICE_POLICY: hin (f) has only the 2026-09-04 draft casting — Tom has not chosen a voice`. The finishing step remains Tom casting Hindi, then `RENDER=1` of the #356·Q tool (make-before-break) — after the fixes below are in the table, or it will render the 6 wrong forms and leave the 99 gaps male.
- **6 readings need no render.** Seeds 176 (male-written) and 177 (female-written) are mirror texts, so a clip of each reading already exists: "पूछूँगा" (for "पूछूँगी", seed 177); "पूछूँगी" (for "पूछूँगा", seed 176); "मैं उससे पूछूँगी कि क्या यह सच है।" (for "मैं उससे पूछूँगा कि क्या यह सच है।", seed 176); "उससे पूछूँगी" (for "उससे पूछूँगा", seed 176); "उससे पूछूँगा" (for "उससे पूछूँगी", seed 177); "मैं उससे पूछूँगा कि क्या यह सच है।" (for "मैं उससे पूछूँगी कि क्या यह सच है।", seed 177). Their slots could be pointed at those clips via link-clip, once someone confirms each clip's voice (the read route returns ids, not voices).
- **Orphans:** "मैं आज जितना हो सके उतनी मेहनत से बोलना चाहता हूँ।"; "मैं हिंदी में सीखने की कोशिश कर रहा हूँ।"; "मैं हिंदी में याद कर सकता हूँ।"; "मैं जितना हो सके उतनी बार कुछ बोलना चाहता हूँ।" — stored, but no row carries that text any more (edited since).
- **44 stored rows sit only on unplayed rows** (seeds 301–668 have no LEGOs; components are never played). Harmless; they will matter when those seeds are built.
- Not traced: the pod-1 audio (231 slots) runs on its own path and was outside this audit.

## B. Wrong stored female forms (6)

| n | seed | rows | Hindi | English | stored f | fix | why |
|---|---|---|---|---|---|---|---|
| 924 | 39 | S0039L04B02 | थोड़ा थका हुआ हूँ। | a little tired | थोड़ा थकी हुई हूँ। | थोड़ी थकी हुई हूँ। | थोड़ा modifies थकी and agrees with it in natural speech: a woman says 'थोड़ी थकी हुई हूँ'; 'थोड़ा थकी हुई' is a half-converted form |
| 926 | 39 | S0039L04U02 | मैं आज थोड़ा थका हुआ हूँ। | I'm a little tired today | मैं आज थोड़ा थकी हुई हूँ। | मैं आज थोड़ी थकी हुई हूँ। | थोड़ा before the feminine adjective should agree: थोड़ी थकी हुई |
| 931 | 39 | S0039L04U05 | मैं थोड़ा थका हुआ हूँ लेकिन शुरू करना चाहता हूँ। | I'm a little tired but I want to start | मैं थोड़ा थकी हुई हूँ लेकिन शुरू करना चाहती हूँ। | मैं थोड़ी थकी हुई हूँ लेकिन शुरू करना चाहती हूँ। | थोड़ा before the feminine adjective should agree: थोड़ी थकी हुई |
| 936 | 39 | S0039, S0039L04U01 | लेकिन मैं इस सुबह थोड़ा थका हुआ हूँ। | But I'm a little tired this morning. / but I'm a little tired this morning | लेकिन मैं इस सुबह थोड़ा थकी हुई हूँ। | लेकिन मैं इस सुबह थोड़ी थकी हुई हूँ। | seed 39 itself: थोड़ा before the feminine adjective should agree — 'थोड़ी थकी हुई हूँ'; stored keeps masculine थोड़ा |
| 991 | 41 | S0041L02U02 | मैं थोड़ा थका हुआ महसूस कर रहा हूँ। | I'm feeling a little tired | मैं थोड़ा थकी हुई महसूस कर रही हूँ। | मैं थोड़ी थकी हुई महसूस कर रही हूँ। | थोड़ा before the feminine adjective should agree: थोड़ी थकी हुई |
| 1012 | 42 | S0042L03U03 | मैं थोड़ा थका हुआ महसूस करने लगा था। | I was starting to feel a little tired | मैं थोड़ा थकी हुई महसूस करने लगी थी। | मैं थोड़ी थकी हुई महसूस करने लगी थी। | stored keeps masculine थोड़ा before थकी हुई (same as the seed-39 rows); harmonised at merge — shard reader had it ok-but-less-natural |

## A. Ambiguous — one text, two subjects (8) — Kai's call

The expansion is keyed on the exact text, so one reading serves every row with that text. Options per row: re-cut/extend the fragment so the subject is explicit, or accept one reading.

| n | seed | rows | Hindi | English | stored f | fix | why |
|---|---|---|---|---|---|---|---|
| 216 | 10, 56, 225 | S0010L03C03, S0056L04C01, S0225L03, S0225L03B01 | सकता | can / could |  | सकती | one key, two subjects: components of S0010/S0056 are the speaker's 'can' (मैं … सकता हूँ → सकती), but L/B of S0225 'could' is 'he' (अगर वो कर सकता) and must stay सकता; a female reading would make Aarti say 'he' with a feminine verb |
| 301 | 15, 16, 30 | S0015L02C01, S0016L05C01, S0030L03C01 | चाहता | want / wants |  | चाहती | one key, two subjects: components of S0015 'want' and S0030 'want(ed)' are the speaker's (मैं चाहता → चाहती), but the S0016 component 'wants' is 'he' (वो … चाहता है) and must stay चाहता |
| 827 | 36 | S0036L02B03 | बाधा डालना नहीं चाहता | don't want to interrupt |  | बाधा डालना नहीं चाहती | build of seed 36 whose subject is हम (we → चाहते), but the fragment has singular masculine चाहता and no subject; if read as 'I' the female form is चाहती. Better fix the text to the seed's 'बाधा डालना नहीं चाहते', which needs no reading |
| 1730 | 77, 124 | S0077L04C02, S0124L01, S0124L01B01 | लगा | started / felt |  | लगा | Same text is the speaker's 'started' (S0077L04C02, from मैं समझने लगा हूँ → लगी) and मुझे लगा 'felt' in S0124L01/B01, which agrees with the thought, not the speaker. The played rows are S0124's, so keep लगा (no f reading); the S0077 component is never played. |
| 2908 | 140 | S0140L03, S0140L03B01 | रहा | m-prog |  | रही | LEGO 'm-prog' of seed 140 is the speaker's रहा (मैं नहीं देख पा रहा), so the female voice would say रही; but its gloss explicitly teaches the masculine progressive (seed 132 has a separate f-prog रही LEGO) — Kai's call whether this LEGO is voiced by gender |
| 2973 | 144 | S0144L02B02 | तो गया। | so went |  | तो गई। | subjectless build 'so went' in seed 144; the seed's subject is the speaker (female: गई) but the fragment itself names no subject and the course uses 'वो गया' alongside |
| 4487 | 234 | S0234L03, S0234L03B01 | मिला | met |  | मिली | LEGO/build 'met' of seed 234 where the subject is मैं (speaker), but the bare form carries no subject and the same LEGO builds 'वो मिला' (he); in seed context the speaker reading मिली is right |
| 4488 | 234 | S0234L04 | मिला। | met-sent-final |  | मिली। | sentence-final LEGO 'met' of seed 234 (subject मैं); no subject in the fragment, same verb also used for 'he met' builds |

## A. Missing female forms on played rows — the rule tool still misses these (48)

| n | seed | rows | Hindi | English | fix | why |
|---|---|---|---|---|---|---|
| 417 | 19 | S0019L04, S0019L04B01 | नहीं करना चाहता। | don't want to | नहीं करना चाहती। | LEGO of S0019 'don't want to' — the speaker (मैं … चाहता); nothing stored, so Aarti says चाहता |
| 419 | 19 | S0019L04B02 | बंद नहीं करना चाहता। | don't want to stop | बंद नहीं करना चाहती। | build of S0019 'don't want to stop' — the speaker's चाहता; nothing stored |
| 423 | 19 | S0019L04B03 | बात करना बंद नहीं करना चाहता। | don't want to stop talking | बात करना बंद नहीं करना चाहती। | build of S0019 'don't want to stop talking' — the speaker's चाहता; nothing stored |
| 685 | 30 | S0030L03B03 | आपसे कुछ पूछना चाहता था। | wanted to ask you something | आपसे कुछ पूछना चाहती थी। | build of seed 30 (मैं ... पूछना चाहता था) — the subject is the speaker; चाहता था → चाहती थी; nothing stored |
| 689 | 30 | S0030L03, S0030L03B01 | चाहता था। | wanted to | चाहती थी। | LEGO/build 'wanted to' of seed 30 whose subject is मैं (the speaker); चाहता था → चाहती थी; nothing stored |
| 692 | 30 | S0030L03B02 | पूछना चाहता था। | wanted to ask | पूछना चाहती थी। | build of seed 30, subject मैं (speaker); चाहता था → चाहती थी; nothing stored |
| 969 | 40 | S0040L03U03 | मैंने थोड़ा थका हुआ महसूस करना शुरू किया। | I started to feel a little tired | मैंने थोड़ी थकी हुई महसूस करना शुरू किया। | मैंने + शुरू किया is invariant, but थका हुआ is a predicate adjective describing the speaker (feel tired) → थकी हुई, with थोड़ा → थोड़ी; nothing stored |
| 1001 | 42 | S0042L03B03 | ठीक महसूस करने लगा था। | was starting to feel okay | ठीक महसूस करने लगी थी। | fragment of seed 42 (I was starting to feel); लगा था agrees with speaker → लगी थी |
| 1006 | 42 | S0042L03B02 | बेहतर महसूस करने लगा था। | was starting to feel better | बेहतर महसूस करने लगी थी। | seed 42 fragment, speaker is subject; लगा था → लगी थी |
| 1008 | 42 | S0042L03, S0042L03B01 | महसूस करने लगा था। | was starting to feel | महसूस करने लगी थी। | LEGO 'was starting to feel' = speaker in seed 42; लगा था → लगी थी |
| 1024 | 43 | S0043L03, S0043L03B01 | नहीं सोच रहा था कि | wasn't thinking that | नहीं सोच रही थी कि | LEGO from seed 43, speaker subject; रहा था → रही थी |
| 1025 | 43 | S0043L03B02 | नहीं सोच रहा था कि कैसे | wasn't thinking how | नहीं सोच रही थी कि कैसे | seed 43 build, speaker subject; रहा था → रही थी |
| 1026 | 43 | S0043L03B03 | नहीं सोच रहा था कि क्या | wasn't thinking what | नहीं सोच रही थी कि क्या | seed 43 build, speaker subject; रहा था → रही थी |
| 1082 | 46 | S0046L02B03 | गलतियाँ करने की चिंता नहीं करता। | don't worry about making mistakes | गलतियाँ करने की चिंता नहीं करती। | seed 46 build, implied मैं; करता → करती |
| 1083 | 46 | S0046L02B02 | गलतियाँ की चिंता नहीं करता। | don't worry about mistakes | गलतियाँ की चिंता नहीं करती। | seed 46 build, implied मैं; करता → करती |
| 1085 | 46 | S0046L02, S0046L02B01 | चिंता नहीं करता। | don't worry | चिंता नहीं करती। | LEGO 'don't worry' of seed 46, speaker; करता → करती |
| 1140 | 50 | S0050L04, S0050L04B01 | कोशिश नहीं कर रहा। | not trying | कोशिश नहीं कर रही। | LEGO of seed 50, speaker subject; रहा → रही |
| 1145 | 50 | S0050L04B02 | खत्म करने की कोशिश नहीं कर रहा। | not trying to finish | खत्म करने की कोशिश नहीं कर रही। | seed 50 build, implied मैं; रहा → रही |
| 1146 | 50 | S0050L04B03 | जितनी जल्दी हो सके कोशिश नहीं कर रहा। | not trying as quickly as possible | जितनी जल्दी हो सके कोशिश नहीं कर रही। | seed 50 build, implied मैं; रहा → रही |
| 1757 | 78 | S0078L04B03 | समझ नहीं पाया था | couldn't understand it well | समझ नहीं पाई थी | Build of S0078L04 'I couldn't' (seed 78 subject is मैं): पाया था → पाई थी, same as its sibling builds which do carry a female reading |
| 1861 | 85 | S0085L03B02 | उन लोगों को नहीं जानता। | not know those people | उन लोगों को नहीं जानती। | Build of seed 85 'I don't know those people' (subject मैं): जानता → जानती; the full seed row 1868 already carries this reading |
| 1862 | 85 | S0085L02, S0085L02B01 | जानता। | does know / know | जानती। | LEGO S0085L02 of seed 85, where the knower is मैं (I don't know); जानता → जानती. Only occurrence is the speaker's. |
| 1921 | 89 | S0089L02U03 | मैंने जो चाहता था वो किया है। | I have done what I wanted | मैंने जो चाहती थी वो किया है। | 'what I wanted': the relative clause has pro-drop मैं as subject of चाहता था → चाहती थी; मैंने…किया stays (ने-perfective) |
| 2420 | 114 | S0114L04B02 | जैसे कर रहा | as if doing | जैसे कर रही | build of seed 114 'जैसे मैं ... बुरा कर रहा हूँ' — रहा is the speaker's progressive (I'm doing); only occurrence is this seed |
| 2424 | 114 | S0114L02B03 | बुरा कर रहा | doing worse | बुरा कर रही | build of seed 114 'मैं आज कल से बुरा कर रहा हूँ' — रहा agrees with the speaker; only occurrence is this seed |
| 2497 | 118 | S0118L03, S0118L03B01 | करता | does | करती | its only rows are seed 118's LEGO, where करता is the speaker's verb in मैं … महसूस करता हूँ; female voice should say करती (the English gloss 'does' reads third-person, but in context it is 'I feel') |
| 2505 | 118 | S0118L03B02 | बेहतर महसूस करता | feel better | बेहतर महसूस करती | build of seed 118 'I feel better' — करता is the speaker's (मैं … महसूस करता हूँ); nothing stored |
| 2669 | 128 | S0128L01, S0128L01B01 | जानता | used to know | जानती | LEGO of seed 128 'used to know' = जिसे मैं पहले जानता था, the speaker's; nothing stored |
| 2897 | 140 | S0140L03B02 | नहीं देख पा रहा | can't manage to see | नहीं देख पा रही | build of seed 140 — मैं नहीं देख पा रहा, the speaker's progressive; nothing stored |
| 2966 | 144 | S0144L03B03 | आज सुबह उठ गया। | rose this morning | आज सुबह उठ गई। | build of seed 144 — मैं … उठ गया, the speaker's intransitive perfective; nothing stored |
| 2968 | 144 | S0144L03, S0144L03B01 | उठ गया। | woke up | उठ गई। | LEGO 'woke up' of seed 144 (मैं … उठ गया) — speaker's; nothing stored |
| 2969 | 144, 215 | S0144L03C02, S0144L02, S0144L02B01, S0215L03 | गया। | went / went-sent-final | गई। | in seeds 144 and 215 गया is the speaker's (मैं … उठ गया / मैं … बाहर गया); nothing stored |
| 2971 | 144 | S0144L04B02 | जितना चाहता था उससे | as much as I wanted from that | जितना चाहती थी उससे | build of seed 144 'as much as I wanted' — speaker's चाहता था; nothing stored |
| 2972 | 144 | S0144L04B03 | जितना चाहता था उससे पहले उठ गया। | earlier than I wanted | जितना चाहती थी उससे पहले उठ गई। | build of seed 144 'earlier than I wanted' — both चाहता था and उठ गया are the speaker's; nothing stored |
| 2978 | 144 | S0144L03B02 | पहले उठ गया। | rose earlier | पहले उठ गई। | build of seed 144 (मैं … पहले उठ गया) — speaker's; nothing stored |
| 3065 | 148 | S0148L03B02 | जवाब दे पाया। | give answer | जवाब दे पाई। | पाया: build of seed 148 'मैं जवाब नहीं दे पाया' — the speaker is the subject (English 'give answer' is a bare fragment of I couldn't answer) |
| 3067 | 148 | S0148L03B03 | जवाब नहीं दे पाया। | couldn't answer | जवाब नहीं दे पाई। | पाया: 'couldn't answer' is the speaker's clause from seed 148 (मैं ... दे पाया) |
| 3069 | 148 | S0148L02B02 | तो पाया। | so managed | तो पाई। | पाया: build of seed 148's 'मैं जवाब नहीं दे पाया' — the speaker's 'managed' |
| 3076 | 148 | S0148L02, S0148L02B01 | पाया। | managed | पाई। | पाया: LEGO 'managed' of seed 148, where the subject is मैं (the speaker); occurs only there |
| 3157 | 153 | S0153L03, S0153L03B01 | कहता। | would say | कहती। | कहता: LEGO "would say" of seed 153 (मैं इसे ... नहीं कहता) — the speaker is the subject |
| 3159 | 153 | S0153L03B02 | तो कहता। | so says | तो कहती। | कहता: build of seed 153's 'मैं ... नहीं कहता' (would say) — the speaker's verb, though the English 'so says' is loose |
| 3244 | 159 | S0159L01B03 | कहना चाहता | want to say | कहना चाहती | चाहता: build 'want to say' of seed 159, the speaker's chain (sibling 3245 'I want to say') |
| 3248 | 159 | S0159L02B03 | नहीं कह रहा | not saying | नहीं कह रही | कह रहा: build 'not saying' of seed 159 (जो मैं कहने की कोशिश कर रहा हूँ / not what I'm saying) — the speaker's progressive |
| 4115 | 215 | S0215L02, S0215L02B01 | गया | went | गई | LEGO S0215L02 'went' is the verb of seed 215 मैं ... बाहर गया (I went), intransitive perfective agreeing with the speaker; both occurrences are this seed's LEGO/build. Its use phrases are all वो गया (he) but those are separate texts |
| 4118 | 215 | S0215L04B02 | बाहर गया। | went out | बाहर गई। | build S0215L04B02 'went out' is the seed 215 chunk मैं ... बाहर गया (I went out); गया agrees with the speaker |
| 4574 | 241 | S0241L01B02 | देना चाहता | want to give | देना चाहती | only occurrence is a build of seed 241 'मैं इसे उसे देना नहीं चाहता' whose subject is the speaker; चाहता agrees with मैं |
| 4597 | 243 | S0243L04B02 | माँगने जा रहा | to ask for | माँगने जा रही | only occurrence is a build of seed 243 'मैं ... माँगने जा रहा हूँ' (speaker subject); रहा agrees with मैं |
| 5075 | 276 | S0276L01B02 | रह सकता | can stay | रह सकती | build of seed 276 (मैं ... रह सकता हूँ, subject = speaker); सकता agrees with the speaker; no reading stored |

## A. Missing female forms on played rows — text changed after the tool wrote (26)

Mostly "या … चाहता हूँ" practice phrases rewritten by the want/try work after the 14 Oct write. The tool would plan these on a re-run, but per Kai's rule a re-run must be read in full, not trusted.

| n | seed | rows | Hindi | English | fix | why |
|---|---|---|---|---|---|---|
| 45 | 3 | S0003L01U02 | मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रहा हूँ। | I'm trying to learn Hindi as often as possible | मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रही हूँ। | मैं … कर रहा हूँ: progressive रहा agrees with the speaker; nothing stored |
| 140 | 7 | S0007L03U05 | मैं जितना हो सके उतनी मेहनत से सीखने की कोशिश कर रहा हूँ। | I'm trying as hard as I can to learn | मैं जितना हो सके उतनी मेहनत से सीखने की कोशिश कर रही हूँ। | मैं … कर रहा हूँ: progressive रहा agrees with the speaker; nothing stored |
| 165 | 8 | S0008L04B02 | समझाने की कोशिश करने जा रहा हूँ कि | going to try to explain that | समझाने की कोशिश करने जा रही हूँ कि | build of S0008, English 'going to try to explain' = I (speaker); जा रहा हूँ agrees with the speaker |
| 166 | 8 | S0008L04B03 | समझाने की कोशिश करने जा रहा हूँ कि मेरा मतलब क्या है। | going to try to explain what I mean | समझाने की कोशिश करने जा रही हूँ कि मेरा मतलब क्या है। | build of S0008 'I'm going to try to explain what I mean'; जा रहा हूँ agrees with the speaker |
| 187 | 9 | S0009L01U04 | मैं थोड़ी हिंदी सीखने की कोशिश कर रहा हूँ। | I'm trying to learn a little Hindi | मैं थोड़ी हिंदी सीखने की कोशिश कर रही हूँ। | मैं … कर रहा हूँ: progressive agrees with the speaker; nothing stored |
| 904 | 38 | S0038L01U04 | मैं करीब एक महीने हिंदी सीखना चाहता हूँ। | I want to learn Hindi for about a month | मैं करीब एक महीने हिंदी सीखना चाहती हूँ। | मैं ... चाहता हूँ, the speaker is the subject; चाहता → चाहती; nothing stored (a sibling the tool missed) |
| 1187 | 51 | S0051L01U05 | या दोस्तों के साथ मिलना चाहता हूँ। | or I want to meet up with friends | या दोस्तों के साथ मिलना चाहती हूँ। | 'or I want to meet up', pro-drop मैं with हूँ; चाहता → चाहती (nothing stored, unlike sibling rows 1052/1058) |
| 1318 | 57 | S0057L01U03 | या ध्यान से कहना चाहता हूँ। | or I want to say it carefully | या ध्यान से कहना चाहती हूँ। | "or I want to say it carefully", pro-drop मैं with हूँ; चाहता → चाहती (nothing stored) |
| 1386 | 61 | S0061L01U03 | या थोड़ा धीरे कहना चाहता हूँ। | or I want to say it a little slowly | या थोड़ा धीरे कहना चाहती हूँ। | "or I want to say it a little slowly", pro-drop मैं with हूँ; चाहता → चाहती (nothing stored) |
| 1387 | 61 | S0061L02U03 | या दोबारा शुरू करना चाहता हूँ। | or I want to start again | या दोबारा शुरू करना चाहती हूँ। | "or I want to start again", pro-drop मैं with हूँ; चाहता → चाहती (nothing stored) |
| 1487 | 65 | S0065L05U02 | मैं खुद को परखने के लिए समय लेना चाहता हूँ। | I want to take time to test myself | मैं खुद को परखने के लिए समय लेना चाहती हूँ। | मैं subject, I want; चाहता → चाहती (nothing stored) |
| 1490 | 65 | S0065L01U03 | या खुद करना चाहता हूँ। | or I want to do it myself | या खुद करना चाहती हूँ। | or I want, pro-drop मैं with हूँ; चाहता → चाहती (nothing stored) |
| 1491 | 65 | S0065L05U05 | या खुद को परखने के लिए समय लेना चाहता हूँ। | or I want to take time to test myself | या खुद को परखने के लिए समय लेना चाहती हूँ। | or I want, pro-drop मैं with हूँ; चाहता → चाहती (nothing stored) |
| 1492 | 65 | S0065L04U03 | या थोड़ा समय लेना चाहता हूँ। | or I want to take a little time | या थोड़ा समय लेना चाहती हूँ। | or I want, pro-drop मैं with हूँ; चाहता → चाहती (nothing stored) |
| 1493 | 65 | S0065L03U03 | या ध्यान से परखना चाहता हूँ। | or I want to test it carefully | या ध्यान से परखना चाहती हूँ। | or I want, pro-drop मैं with हूँ; चाहता → चाहती (nothing stored) |
| 1520 | 66 | S0066L03U05 | या ध्यान से जवाब ढूँढना चाहता हूँ। | or I want to look for the answer carefully | या ध्यान से जवाब ढूँढना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1521 | 66 | S0066L02U03 | या ध्यान से ढूँढना चाहता हूँ। | or I want to look for it carefully | या ध्यान से ढूँढना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1535 | 67 | S0067L02U03 | या थोड़ा रुकना चाहता हूँ। | or I want to stop for a little while | या थोड़ा रुकना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1607 | 71 | S0071L03U03 | या किसी को बताना चाहता हूँ। | or I want to tell someone | या किसी को बताना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1608 | 71 | S0071L01U03 | या सच बताना चाहता हूँ। | or I want to tell the truth | या सच बताना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1609 | 71 | S0071L02U03 | या सुनने देना चाहता हूँ। | or I want to let him hear | या सुनने देना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1645 | 73 | S0073L01U03 | या शुक्रिया कहना चाहता हूँ। | or I want to say thank you | या शुक्रिया कहना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1657 | 74 | S0074L01U03 | या ध्यान से समझना चाहता हूँ। | or I want to understand it carefully | या ध्यान से समझना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 1752 | 78 | S0078L03U03 | या समझ लेना चाहता हूँ। | or I want to understand it | या समझ लेना चाहती हूँ। | English 'I want': pro-drop मैं with चाहता हूँ → चाहती हूँ |
| 3245 | 159 | S0159L01B02 | कहना चाहता हूँ | I want to say | कहना चाहती हूँ | चाहता हूँ: English 'I want to say' — first person speaker |
| 3430 | 173 | S0173L02U02 | या मैं खुद करना चाहूँगा। | or I'd like to do it myself | या मैं खुद करना चाहूँगी। | चाहूँगा: first-person future with मैं, nothing stored — its twin 3424 'मैं खुद करना चाहूँगा।' has चाहूँगी stored, this one was missed (probably because of the leading या) |

## A. Seed 127 — held for #349·Q (8)

The seed's Hindi also says the opposite of its English ("that's why I didn't want to meet you" vs "That isn't why I wanted to see you") — fix the text first, then the female forms.

| n | seed | rows | Hindi | English | fix | why |
|---|---|---|---|---|---|---|
| 2647 | 127 | S0127L02B03 | इसलिए नहीं चाहता था | that isn't why I wanted | इसलिए नहीं चाहती थी | seed 127 build 'that isn't why I wanted' — speaker's चाहता था; nothing stored |
| 2648 | 127 | S0127 | इसीलिए मैं आपसे मिलना नहीं चाहता था। | That isn't why I wanted to see you. | इसीलिए मैं आपसे मिलना नहीं चाहती थी। | speaker's चाहता था; nothing stored |
| 2650 | 127 | S0127L01U03 | तो मैं आपको देखना चाहता था। | so I wanted to see you | तो मैं आपको देखना चाहती थी। | मैं … चाहता था is the speaker's; nothing stored |
| 2652 | 127 | S0127L01B02 | देखना चाहता | want to see | देखना चाहती | build of seed 127 (speaker wanted) — चाहता is the speaker's; nothing stored |
| 2653 | 127 | S0127L01B03 | देखना चाहता था | I wanted to see | देखना चाहती थी | 'I wanted to see' — speaker's चाहता था; nothing stored |
| 2656 | 127 | S0127L02U02 | मैं आपको देखना इसलिए चाहता था। | that's why I wanted to see you | मैं आपको देखना इसलिए चाहती थी। | speaker's चाहता था; nothing stored |
| 2657 | 127 | S0127L02U01 | मैं आपको देखना इसलिए नहीं चाहता था। | that isn't why I wanted to see you | मैं आपको देखना इसलिए नहीं चाहती थी। | speaker's चाहता था; nothing stored |
| 2660 | 127 | S0127L01U04 | या मैं कुछ नया देखना चाहता था। | or I wanted to see something new | या मैं कुछ नया देखना चाहती थी। | speaker's चाहता था; nothing stored |

## A. Missing female forms on never-played components only (17)

| n | seed | rows | Hindi | English | fix | why |
|---|---|---|---|---|---|---|
| 22 | 2 | S0002L01C03 | कर रहा हूँ। | am doing | कर रही हूँ। | component of S0002 'I'm trying' (मैं … कर रहा हूँ); progressive रहा agrees with the speaker |
| 94 | 5, 29 | S0005L02C05, S0029L02C04 | रहा हूँ। | am / continuing am | रही हूँ। | component of S0005 'I'm going' and S0029 'I'm (waiting)' — both मैं … रहा हूँ, speaker's progressive |
| 162 | 8 | S0008L04C02 | रहा हूँ | am | रही हूँ | component of S0008 'I'm going' (मैं … जा रहा हूँ); speaker's progressive |
| 176 | 9 | S0009L02C01 | बोलता | speak | बोलती | component of S0009 'I speak' (मैं … बोलता हूँ); habitual agrees with the speaker |
| 226 | 11, 12 | S0011L01C01, S0012L01C02 | चाहूँगा | would like | चाहूँगी | component of S0011/S0012 'would like' — both मैं चाहूँगा, speaker's future |
| 416 | 19 | S0019L04C03 | चाहता। | want | चाहती। | component of S0019 'But I don't want to stop talking' (मैं … नहीं करना चाहता); speaker's want |
| 690 | 30, 42 | S0030L03C02, S0042L03C02 | था। | was | थी। | component 'was' of seeds 30 (मैं ... चाहता था) and 42 (मैं ... लगा था), both with the speaker as subject; था → थी; nothing stored (component, never played) |
| 913 | 38 | S0038L03C01 | सीख रहा | learning | सीख रही | component 'learning' of seed 38 (मैं ... सीख रहा हूँ) — speaker's progressive; रहा → रही; nothing stored (component, never played) |
| 920 | 39 | S0039L04C01 | थका हुआ | tired | थकी हुई | component 'tired' of seed 39 (मैं ... थका हुआ हूँ) — describes the speaker; थका हुआ → थकी हुई; nothing stored (component, never played) |
| 975 | 41 | S0041L02C01 | कर रहा | feeling | कर रही | component 'feeling' of seed 41 (मैं ठीक महसूस कर रहा हूँ) — speaker's progressive; रहा → रही; nothing stored (component, never played) |
| 1007 | 42 | S0042L03C01 | महसूस करने लगा | feeling | महसूस करने लगी | component of seed 42's speaker verb chain; लगा → लगी |
| 1022 | 43 | S0043L03C03 | था | was | थी | component 'was' of seed 43 मैं…सोच रहा था (speaker); था → थी |
| 1044 | 43 | S0043L03C02 | सोच रहा | thinking | सोच रही | component 'thinking' of seed 43 speaker verb; रहा → रही |
| 1077 | 46 | S0046L02C03 | करता। | does | करती। | component of seed 46 मैं…चिंता नहीं करता (speaker habitual); करता → करती |
| 1138 | 50 | S0050L04C02 | कर रहा। | doing | कर रही। | component of seed 50 मैं…कोशिश नहीं कर रहा (speaker); रहा → रही |
| 1741 | 78 | S0078L04C02 | पाया | managed | पाई | Component of S0078L04 'I couldn't' (मैं…नहीं पाया); only occurrence is the speaker's, so पाया → पाई. Component, never played. |
| 1801 | 82 | S0082L03C02 | करूँगा। | I will do | करूँगी। | Component 'I will do' of S0082L03 (मैं…नहीं करूँगा); 1sg future → करूँगी. Component, never played. |

## Appendix — defects in the displayed Hindi, noticed on the way (102)

Not a proofread; each was noticed while judging gender. Not checked by a native speaker.

| n | seed | Hindi | English | note |
|---|---|---|---|---|
| 149 | 8 | मेरा मतलब क्या बोलने की कोशिश कर रहा हूँ। | I'm trying to say what I mean in Hindi | Hindi is malformed for 'I'm trying to say what I mean in Hindi': हिंदी में missing and 'मेरा मतलब क्या बोलने' is not natural (expected: मैं हिंदी में बोलने की कोशिश कर रहा हूँ कि मेरा मतलब क्या है) |
| 150 | 8 | मेरा मतलब क्या याद करने की कोशिश कर रहा हूँ। | I'm trying to remember what I mean | Hindi is malformed: 'मेरा मतलब क्या याद करने की कोशिश' is not a natural clause (expected: …याद करने की कोशिश कर रहा हूँ कि मेरा मतलब क्या था/है) |
| 254 | 12 | मैं नहीं चाहूँगा कि कल हिंदी बोलता हूँ। | I wouldn't like to speak Hindi tomorrow | Hindi ungrammatical: after 'चाहूँगा कि' the verb must be subjunctive — 'कल हिंदी बोलूँ', not 'बोलता हूँ' (बोलूँ is invariant, so the female reading would then be just चाहूँगी) |
| 312 | 15 | मैं चाहता हूँ कि खत्म करने के बाद मेरे साथ हिंदी बोलता हूँ। | I want to speak Hindi with me after finishing | English and Hindi are both nonsense ('I want to speak Hindi with me'; 'चाहता हूँ कि … मेरे साथ हिंदी बोलता हूँ' needs a subjunctive and a different subject) — row should be rewritten or deleted |
| 509 | 22 | जो मिलना चाहता हूँ | who wants to meet | Hindi is first person (चाहता हूँ = I want) but English says 'who wants to meet'; the fragment is not a span of the seed — text/gloss mismatch |
| 524 | 23 | जल्द ही हिंदी बोलने जा रहा हूँ। | speak Hindi soon | English 'speak Hindi soon' omits 'I'm going to' that the Hindi carries |
| 601 | 26 | मुझे अच्छा लगता है जब लगे कि लगभग जाने के लिए जा रहा हूँ। | I like it when it feels like I'm nearly going | 'लगभग जाने के लिए जा रहा हूँ' reads as 'nearly going in order to go' — unnatural; 'लगभग जाने वाला हूँ' would carry 'nearly going' |
| 606 | 26 | मैं जाने के लिए बोलने की प्रैक्टिस करने जा रहा हूँ। | I'm going to practise in order to go | English 'practise in order to go' omits 'speaking' (बोलने की) |
| 607 | 26 | मैं जाने के लिए हिंदी बोलना शुरू करने जा रहा हूँ। | I'm going to speak Hindi in order to go | English omits 'start' (शुरू करने) |
| 610 | 26 | मैं लगभग हिंदी बहुत अच्छी बोलता हूँ। | I nearly speak Hindi well | English 'well' vs Hindi 'बहुत अच्छी' (very well) |
| 636 | 27 | मुझे बहुत समय है। | I have a lot of time | 'मुझे बहुत समय है' for 'I have a lot of time' is unidiomatic; standard is 'मेरे पास बहुत समय है' (as seed 178 uses) |
| 647 | 27 | लेकिन मुझे समय है। | but I have time | 'मुझे समय है' unidiomatic for 'I have time'; 'मेरे पास समय है' |
| 746 | 33 | आप कितने समय चाहते हैं? | how much time do you want? | 'कितने समय चाहते हैं' is ungrammatical without से; 'how much time do you want' = 'कितना समय चाहते हैं' |
| 750 | 33 | कितने समय | how much time | 'कितने समय' alone for 'how much time' should be 'कितना समय' (कितने समय only with से) |
| 757 | 34 | चुप चाहता हूँ। | want to be quiet | 'चुप चाहता हूँ' is ungrammatical for 'want to be quiet' — needs रहना: 'चुप रहना चाहता हूँ' |
| 762 | 34 | मुझे अच्छा लगता है जब यहाँ बोलता हूँ। | I like speaking Hindi here | English 'speaking Hindi here' but the Hindi has no हिंदी |
| 806 | 35 | मैं भी सीखना चाहता हूँ। | but I also want to learn | English has 'but' that the Hindi lacks |
| 820 | 36 | कहानी बोलना | tell a story | 'कहानी बोलना' is unidiomatic for 'tell a story'; natural is 'कहानी सुनाना' (same in 828, 831, 836, 837) |
| 982 | 41 | थोड़ी थकान ठीक था। | a little tiredness is okay | 'थोड़ी थकान ठीक था' is ungrammatical and wrong tense for 'is okay' — 'थोड़ी थकान ठीक है' |
| 1071 | 45 | वो सब कुछ सोचना चाहता था। | he wants to think about everything | English 'he wants' but Hindi चाहता था = 'he wanted' |
| 1133 | 49 | यह ऐसे मेरा मतलब। | it's like this | यह ऐसे मेरा मतलब। is not a grammatical Hindi phrase (no verb) |
| 1316 | 57 | मुझे लगता है कि मैं कैसे कहूँ। | I think about how I say | मुझे लगता है कि मैं कैसे कहूँ means "I think how should I say", not "I think about how I say"; awkward/mismatched |
| 1383 | 61 | मुझे लगता है कि दोबारा फायदेमंद है। | I think again is useful | adverb used as subject of फायदेमंद है — ungrammatical/unnatural Hindi |
| 1384 | 61 | मुझे लगता है कि धीरे फायदेमंद है। | I think slowly is useful | adverb used as subject of फायदेमंद है — ungrammatical/unnatural Hindi |
| 1409 | 62 | मुझे लगता है कि एक साथ फायदेमंद है। | I think together is useful | adverb used as subject of फायदेमंद है — ungrammatical/unnatural Hindi |
| 1449 | 64 | मुझे आसान की परवाह नहीं है। | I don't care if it's easy | adjective used as noun after की परवाह — ungrammatical Hindi |
| 1480 | 65 | मुझे ज़रूरी की परवाह नहीं है। | I don't care about what's important | adjective used as noun after की परवाह — ungrammatical Hindi |
| 1556 | 69 | तो कुत्ते के लिए ज़रूरी था। | so the dog needed something | Hindi 'so it was necessary for the dog' does not match English 'so the dog needed something' |
| 1574 | 69 | वो पूरी दोपहर था। | he was there all afternoon | वो पूरी दोपहर था is incomplete; 'he was there' needs वहाँ (वो पूरी दोपहर वहाँ था) |
| 1581 | 70 | तो मुझे कहाँ बताना है। | so tell me where | मुझे कहाँ बताना है = 'where do I have to tell', not 'tell me where' |
| 1622 | 71 | हम किसी को ढूँढना नहीं देना चाहते थे। | we didn't want to let anyone find | ढूँढना नहीं देना is ungrammatical; 'let find' needs the oblique ढूँढने नहीं देना |
| 1625 | 71 | हम किसी को रुकना नहीं देना चाहते थे। | we didn't want to let anyone stop | रुकना नहीं देना is ungrammatical; needs रुकने नहीं देना |
| 1626 | 71 | हम किसी को लिखना नहीं देना चाहते थे। | we didn't want to let anyone write | लिखना नहीं देना is ungrammatical; needs लिखने नहीं देना |
| 1643 | 73 | मुझे लगता है कि मुझे और सीखना है। | it's important that I have more to learn | Hindi says 'I think I have more to learn', English says 'it's important that…' |
| 1658 | 74 | वो मुझे समझने में मदद करने के लिए चाहता था। | he wanted to help me understand | …मदद करने के लिए चाहता था is ungrammatical; 'he wanted to help me understand' = वो मुझे समझने में मदद करना चाहता था |
| 1707 | 76 | वो पहले से कितना था। | he had how much already | वो पहले से कितना था is not a sentence; does not express 'he had how much already' |
| 1718 | 77 | तो वो कितनी जल्दी खत्म करना था। | he finished how quickly | वो कितनी जल्दी खत्म करना था is ungrammatical and does not mean 'he finished how quickly' |
| 1832 | 83 | मैं इस बात से सहमत हूँ जो आपने अपने दोस्त के बारे में कहा। | I agree with what you said about your friend. | Seed 83: जो refers to बात (feminine), so the verb should be कही, as in the use phrase S0083L04U01 and LEGO S0083L03; seed has कहा |
| 1855 | 84 | मैं मेरे दोस्त से सहमत नहीं हूँ। | I don't agree with my friend | मैं मेरे दोस्त से: with subject मैं the possessive should be reflexive अपने दोस्त से |
| 1866 | 85 | मुझे उन के बारे में बताना है। | tell me about those | मुझे उन के बारे में बताना है = 'I have to tell about them', not 'tell me about those' |
| 1964 | 91 | मुझे इसके बारे में सोचना है। | I want to think about this | मुझे…सोचना है = 'I have to think', English says 'I want to think' |
| 2133 | 99 | आपको सोचना चाहिए जो आपने कही। | you should think about what you said | 'जो आपने कही' is broken: should be 'आपको उसके बारे में सोचना चाहिए जो आपने कहा' (कहा, not कही; 'about' missing) |
| 2648 | 127 | इसीलिए मैं आपसे मिलना नहीं चाहता था। | That isn't why I wanted to see you. | Hindi says 'that's why I didn't want to meet you'; English is 'that isn't why I wanted to see you' (2657's word order is the faithful one) |
| 2649 | 127 | उसे देखना था। | he wanted to see it | उसे देखना था = 'he had to see it', not 'he wanted to see it' |
| 2655 | 127 | मुझे यह देखना था। | I wanted to see this | मुझे यह देखना था = 'I had to see this', not 'I wanted to see this' |
| 2760 | 133 | बहुत अच्छे से जानता है | know someone well | build is 3sg जानता है ('he knows … well') but seed 133's sentence has आप … जानते हैं; gloss 'know someone well' |
| 2826 | 137 | अक्सर बात करना। सबसे अच्छा है। | talking often is best | stray danda mid-sentence: 'अक्सर बात करना। सबसे अच्छा है।' should be one sentence (करना सबसे अच्छा है) |
| 2830 | 137 | तो काम करना। ज़रूरी है। | so working is important | stray danda mid-sentence: 'काम करना। ज़रूरी है।' should be 'काम करना ज़रूरी है।' |
| 2838 | 137 | मदद करना। ज़रूरी है। | helping is important | stray danda mid-sentence: should be 'मदद करना ज़रूरी है।' |
| 2839 | 137 | मेहनत करना। ज़रूरी है। | working hard is important | stray danda mid-sentence: should be 'मेहनत करना ज़रूरी है।' |
| 2885 | 139 | मुझे माफ करना है | I'm asking forgiveness | मुझे माफ करना है = 'I have to forgive', not 'I'm asking forgiveness' |
| 2910 | 140 | वो जल्दी कर पा सकता है। | he can manage to work fast | ungrammatical: 'कर पा सकता है' doubles पाना and सकना — should be 'वो जल्दी कर सकता है' or 'जल्दी कर पाता है' |
| 3270 | 161 | चलिए रविवार को बात करते हैं। | let's meet on Sunday | English says let's meet on Sunday; the Hindi बात करते हैं says let's talk |
| 3296 | 164 | एक किताब ज़रूरी है। | one book is enough | English one book is enough; ज़रूरी है means is needed/necessary |
| 3380 | 170 | मुझे बताएँ आप क्या सोचते हैं। | tell me what to do | English 'tell me what to do'; Hindi says tell me what you think |
| 3391 | 171 | क्या आप इसे ढूँढने में मेरी मदद करना चाहते हैं? | Do you want me to help you look for it? | Seed 171 meaning reversed: English 'Do you want me to help you look for it?' but Hindi says 'do you want to help me look for it' (मेरी मदद करना चाहते हैं); 3392 has the right sense |
| 3520 | 180 | अपनी बात अच्छी है। | my idea is good | अपनी with no subject to refer back to; standalone 'my idea is good' should be मेरी बात अच्छी है। |
| 3539 | 181 | अपनी माँ आना चाहती है। | my mother wants to come | अपनी माँ as the subject is ungrammatical (reflexive with no antecedent); 'my mother wants to come' = मेरी माँ आना चाहती हैं। |
| 3540 | 181 | अपनी माँ ज़रूरी है। | my mother is important | अपनी माँ as subject is ungrammatical; should be मेरी माँ ज़रूरी हैं। |
| 3541 | 181 | अपनी माँ डॉक्टर के पास है। | my mother is at the doctor | अपनी माँ as subject is ungrammatical; should be मेरी माँ डॉक्टर के पास हैं। |
| 3542 | 181 | अपनी माँ यहाँ है | my mother is here | अपनी माँ as subject is ungrammatical; should be मेरी माँ यहाँ हैं |
| 3543 | 181 | अपनी माँ यहाँ है। | my mother is here | अपनी माँ as subject is ungrammatical; should be मेरी माँ यहाँ हैं। |
| 3549 | 181 | तो अपनी माँ अच्छी है। | so my mother is well | अपनी माँ as subject is ungrammatical; should be तो मेरी माँ ठीक हैं। |
| 3550 | 181 | तो उसे ले जाना है। | so I need to take her | no मुझे, so it does not say 'I need to take her'; should be तो मुझे उसे ले जाना है। |
| 3556 | 181 | या अपनी माँ ठीक है। | or my mother is fine | अपनी माँ as subject is ungrammatical; should be या मेरी माँ ठीक हैं। |
| 3608 | 183 | वो उन्हें मदद करना चाहता है। | he wants to help them | मदद takes की, not a direct उन्हें: should be वो उनकी मदद करना चाहता है। |
| 3611 | 184 | थोड़ी देर पहले था | came a while ago | English 'came a while ago' but Hindi has no 'came' (था = was) |
| 3626 | 185 | उसने उन्हें दिया। | he gave it to her | English 'he gave it to her' does not match उसने उन्हें दिया (no 'it', उन्हें = them/honorific) |
| 3794 | 197 | वो मदद के रूप में काम करना चाहता है। | he wants to work as a helper | मदद के रूप में = as help, not as a helper; should be मददगार के रूप में |
| 3884 | 201 | हम जानना चाहते थे कि क्या होने वाला है। | We wanted to know what was going to happen. | seed English is past (was going to happen) but Hindi says होने वाला है; the use row 3883 has the right होने वाला था |
| 3903 | 203 | अगर मैं कुछ माँगूँ तो आप क्या कहते हैं? | if I ask for something what will you say? | English "what will you say" but Hindi has present कहते हैं; should be क्या कहेंगे |
| 3933 | 204 | वो संभालने में मदद चाहती है। | she wants to help manage | English 'she wants to help manage' but Hindi says she wants help (मदद चाहती है); should be मदद करना चाहती है |
| 4005 | 209 | मिलने में | want to meet | English 'want to meet' does not match मिलने में (= in meeting) |
| 4029 | 210 | वे सोचते हैं | he thinks | English 'he thinks' on plural वे सोचते हैं (the LEGO is 'they think'); only honorific reading fits |
| 4032 | 210 | वे सोचते हैं यह ज़रूरी है। | he thinks it's important | English 'he thinks' on वे सोचते हैं — honorific only; 'they think' would match |
| 4033 | 210 | वे सोचते हैं यह ठीक है। | she thinks it's fine | English 'she thinks' but वे सोचते हैं is masculine; she (honorific) = वे सोचती हैं, or change English to 'they think' |
| 4276 | 223 | वो आपको पूछने की कोशिश कर रही है। | she's trying to ask you | आपको पूछने — ask takes से: वो आपसे पूछने की कोशिश कर रही है |
| 4329 | 226 | मेरी बात ठीक है। | my work is fine | English "my work is fine" but मेरी बात = what I said / my point |
| 4349 | 228 | क्या उस ने अभी-अभी बताया? | did he just tell us? | उस ने should be written उसने; English "tell us" has no हमें |
| 4387 | 229 | वो औरत संभव है। | that woman is possible | वो औरत संभव है / "that woman is possible" is meaningless; replace the phrase |
| 4448 | 233 | आपकी बहन संभव है। | your sister is possible | 'your sister is possible' is nonsense in both languages |
| 4470 | 234 | आपके भाई यहाँ थे। | your brother came | English 'your brother came' but Hindi says 'your brother was here' |
| 4472 | 234 | कल रात ज़रूरी था। | last night was important | रात is feminine: कल रात ज़रूरी थी, not था |
| 4473 | 234 | कल रात ठीक था। | last night was fine | रात is feminine: कल रात ठीक थी, not था (4482 has अच्छी थी) |
| 4502 | 235 | जिसने शुरू किया है वो अच्छा है। | the one who started | English 'the one who started' lacks 'is good' that the Hindi says |
| 4504 | 235 | तो जिसने यह कहा वो यहाँ है। | so the one who said this | English 'so the one who said this' lacks 'is here' that the Hindi says |
| 4510 | 235 | या जिसने बताया वो अच्छा है। | or the one who told us | English 'or the one who told us' but Hindi = 'or the one who told is good' (no हमें) |
| 4542 | 238 | वो चाहता था कि आप पहले बताएँ। | he wanted you to tell me before | English 'tell me before' but Hindi has no मुझे |
| 4645 | 244 | या ही | or indeed | 'या ही' (or indeed) is not a usable fragment |
| 4704 | 248 | पैसा | my-cash | English 'my-cash' but Hindi is bare पैसा, and seed 248 uses अपने पैसे (plural) |
| 4772 | 253 | आप ठीक हो। | you are fine | आप takes हैं: 'आप ठीक हैं।', not हो |
| 4773 | 253 | आप हो | you be | 'आप हो' is ungrammatical with आप (हैं); and not a span of seed 253 |
| 4776 | 253 | क्या आप ठीक हो? | are you alright? | आप takes हैं: 'क्या आप ठीक हैं?' |
| 4778 | 253 | क्या आप तैयार हो? | are you ready? | आप takes हैं: 'क्या आप तैयार हैं?' |
| 5002 | 270 | आपको देर क्यों है? | why are you late? | आपको देर क्यों है? is unnatural for why are you late; आपको देर क्यों हुई? / आप देर से क्यों आए? |
| 5018 | 270 | मुझे थोड़ी देर है। | I'm a bit late | मुझे थोड़ी देर है is unnatural for I am a bit late; मुझे थोड़ी देर हो गई है |
| 5400 | 339 | नहीं मुझे लगता है उसने खुद को काफी बुरी तरह से चोट लगा ली। | No I think he's hurt himself quite badly. | खुद को ... चोट लगा ली is ungrammatical (लगना is intransitive); e.g. उसने खुद को काफी बुरी तरह से चोट पहुँचाई है / उसे काफी बुरी तरह से चोट लगी है |
| 5550 | 489 | अगर आप अभी मुझे एक कड़क कप चाय नहीं बनाते। | If you don't make me a strong cup of coffee right now. | English says coffee, Hindi says चाय (tea); same in seed 627 |
| 5641 | 580 | हमने अक्सर बच्चों को कहीं थोड़ी गर्म जगह ले जाने की कोशिश की है। | We've often wanted to take the children somewhere a little warmer. | English says wanted to take, Hindi says कोशिश की है (tried) |
| 5654 | 593 | चाहे मैंने कितना भी बहस किया मुझे फिर भी बाँटना पड़ा। | However much I argued I still had to share. | बहस is feminine: कितनी भी बहस की, not कितना भी बहस किया |
| 5688 | 627 | आपकी चाय तैयार है। | Your coffee is ready. | English says coffee, Hindi says चाय (tea) |
| 5703 | 642 | आप कैसा महसूस कर रहे हैं मैडम? | how do you feel madam? | listener is madam: कर रही हैं, as in seeds 650/651/655 |

## Gaps

- **Model judgement, not a native speaker's.** Each text was read once by one Opus reader; no second reader cross-checked the verdicts. The "right" verdicts mean "a careful model found nothing wrong", which is weaker than a native ear. Memory notes say no native speaker has read the female forms.
- The थोड़ा → थोड़ी judgement (6 rows) is natural-usage, not strict grammar; one reader called the masculine merely less natural. Worth a native's one-line ruling.
- Wiring was checked per text through Popty's read routes (by-text clip lookup, phase-8 needs, render dry run), not per clip in the database: clip voices were not read.
- Nothing was written. Proposed fixes are proposals.

Inputs, verdicts and the merge are on branch `cs/718-hin-female-forms-full-read` under `ops/hin-female-full-read-718/` (state as read 2026-10-15 13:26Z).
