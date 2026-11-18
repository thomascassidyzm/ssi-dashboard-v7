# Item 8B findings (cs #710·AI)
## Step 1 — eng_for_hin live state (QA copy 2026-11-18T03:30Z + Popty GET voice-config)
- voice_config.voices.known.byGender: f = Kriti cartesia_5283efe8…, m = Rehan cartesia_205fc552… (both Cartesia hi-IN)
- course_gender_expansions: 3,072 text_side='known' pairs (hin), 591 target-side (eng)
- practice rows metadata.known_gender: m 1,323 / f 1,267 / unstamped 8,734
- stamped rows with a clip: m-stamped 1,317 → all male-form text (1,300) or unpaired (17), ALL Rehan; f-stamped 1,262 → all female-form (1,254) or unpaired (8), ALL Kriti. 0 cross-gender.
- neutral (unstamped) clips: Rehan 4,211 / Kriti 4,409 — hash split across both voices.
VERDICT: matches the code's rule → proceed.
## Pre-state of the three courses (QA copy)
- known voice: guj Dhwani, urd Uzma, pan Vaani (Azure, f), no byGender
- stored known pairs: guj 1,148 / urd 2,003 / pan 1,979 (July gender-prep, pre-dates the speaker-only detector)
- scan at-risk rows NOT covered by a stored pair: guj 218/472, urd 510/1,406, pan 1,124/1,982
- silent known phrase slots: guj 199, urd 0, pan 615
