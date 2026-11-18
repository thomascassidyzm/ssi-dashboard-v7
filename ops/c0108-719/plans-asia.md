# C0108 hope → expect: plans, shard "asia" (cs #772·AI for parent #758·AI). PLANS ONLY, nothing applied.

Regenerate any plan: `python3 -I ops/c0108-719/asia/gen.py ops/c0108-719 ops/c0108-719/asia/specs1.py <x_for_eng course>` (specs2.py for eng_for_*), then `tools/mkops.py`, then **`asia/seedroman.py <course>/a.plan.py`** for tha_for_eng / zho_for_eng / kor_for_eng (their seed row carries a romanisation; mkops reads only two SEED elements, and edit-batch answers ROMAN_STALE without it. The committed a.ops.json already have it).
Rule used for the verb: each course's own word for "wasn't expecting" in its seed 112, checked against a dictionary (cited in each a.plan.py). Rows that genuinely say *hope* with a word the course teaches as hope at seed 107 were left as they are (only wake → wake up); rows that echoed the old seed were moved.

course | verb choice + source | ops | new validator issues | dry-run ok | held / flagged
---|---|---|---|---|---
ben_for_eng | target kept: আশা করিনি is the course's own "wasn't expecting" (S0112L02); Samsad | 12 | none | yes | none
hin_for_eng | target kept: उम्मीद is the course's own "wasn't expecting" (S0112L02); McGregor | 7 | none | yes | none
mar_for_eng | आशा नव्हती → अपेक्षा नव्हती (course S0112L02; Molesworth) | 7 | 3: अपेक्षा uncovered in the seed + vocab in 4 rows. Cause: seed 108 never had a hope LEGO here and अपेक्षा's LEGO is S0112L02 | yes | FLAG: needs an expect LEGO at 108 (or S0112L02 moved up); a new LEGO is outside the plan format
nep_for_eng | target kept: आशा is the course's own "wasn't expecting" (S0112L02 आशा गरेको थिइनँ); Turner | 13 | none | yes | none
tel_for_eng | ఆశించలేదు → ఊహించలేదు, and రావాలని → వస్తుందని in S0108L02 (course S0112L02; Brown) | 21 | none | yes | FLAG: S0108L03 now equals S0112L02 (ఊహించలేదు), so 112's is no longer the first introduction. Basket is placeholder-grade fragments as live; moved word-for-word, not rebuilt
kan_for_eng | seed only: ಆಸೆ ಪಡಲಿಲ್ಲ → ಎಚ್ಚರ ಆಗ್ತೀವಿ ಅಂತ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ (sister course S0112L02; Alar) | 1 | 1: "not covered by LEGOs", the course has no LEGOs at all | yes | none
ind_for_eng | seed only: tidak harap bangun → tidak menyangka akan terbangun (KBBI) | 1 | 1: same, no LEGOs exist | yes | none
tha_for_eng | ไม่ได้หวังจะ → ไม่ได้คาดว่าจะ (course S0112L02 คาดไว้; Royal Institute) | 4 | 2: คาดว่าจะ uncovered + vocab in 3 rows. Cause: no hope LEGO in seed 108, คาด is taught at 112 | yes | FLAG: needs an expect LEGO at 108
zho_for_eng | 没希望 → 没想到会 (course S0112L01; CC-CEDICT) | 5 | 2: 到会 uncovered + vocab in 1 row, same cause (没想到 is taught at 112) | yes | FLAG: needs an expect LEGO at 108
yue_for_eng | 唔希望 → 估唔到會 (course seed 112; words.hk) | 10 | none | yes | none
hak_for_eng | 無希望 → 無想到會 (course S0112L01; MOE 客語辭典) | 2 | none | yes | none
nan_for_eng | 無希望 → 想袂到會 (course S0112L01; MOE 台語辭典) | 4 | 2: 到會 uncovered + vocab in 1 row, same cause (想袂到 is taught at 112) | yes | FLAG: needs an expect LEGO at 108
kor_for_eng | live said WANT (일어나고 싶지 않았어요) → 일어날 줄 몰랐어요 (NIKL 한국어기초사전, -ㄹ 줄 모르다) | 16 | none | yes | none
eng_for_ben | known আশা করা → প্রত্যাশা করা (course S0112L01; Samsad) | 27 | none | yes | none
eng_for_guj | known આશા → અપેક્ષા નહોતી રાખી (course S0112L03; Gujarati Lexicon) | 27 | none | yes | none
eng_for_hin | known kept: उम्मीद is the course's own prompt for "wasn't expecting" (S0112L02) | 23 | none | yes | none
eng_for_kan | known ಆಶಿಸಿರಲಿಲ್ಲ → ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ (course S0112L02; Alar) | 21 | none | yes | FLAG: same known now prompts "didn't expect" (S0108L03) and "wasn't expecting" (S0112L02); Kannada has one form
eng_for_mar | known आशा → अपेक्षा नव्हती (course S0112L02; Molesworth) | 10 | none | yes | none
eng_for_pan | known kept: ਉਮੀਦ is the course's own prompt for "wasn't expecting" (S0112L02) | 23 | none | yes | none
eng_for_sin | seed known ආශා කළේ නෑ → බලාපොරොත්තු වුණේ නෑ, the word its own LEGO S0108L01 already carries (Malalasekera) | 28 | none | yes | Sinhala of several rows is rough as live; left
eng_for_tam | known நம்பவில்லை → எதிர்பார்க்கவில்லை (course S0112L02; Cre-A) | 24 | none | yes | FLAG: same known now prompts "didn't expect" (S0108L01) and "not expecting" (S0112L02); Tamil has one form. S0108L02U02 rewritten (it used எழுப்ப, could not hold "wake up")
eng_for_tel | known లేవాలని ఆశించలేదు → లేస్తామని ఊహించలేదు (course S0112L02; Brown) | 10 | none | yes | none
eng_for_urd | known امید → توقع; seed known now ہمیں رات کے وسط میں جاگنے کی توقع نہیں تھی (course S0112L01; Platts) | 18 | none | yes | seed known moved from درمیان to وسط to match its own LEGO S0108L03
eng_for_jpn | known 起きることを望んでいませんでした → 起きるとは思っていませんでした (as jpn_for_eng seed 108; Kenkyusha) | 10 | none | yes | none
eng_for_kor | known 깨기를 바라지 않았어요 → 깰 줄 몰랐어요 (NIKL 한국어기초사전) | 12 | none | yes | none
eng_for_zho | known 不希望 → 没想到会 (course S0112L02; CC-CEDICT) | 13 | none | yes | none

All target-language choices are best effort from the course's own usage and dictionaries; none has been read by a native speaker.
