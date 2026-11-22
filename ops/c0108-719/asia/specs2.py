# -*- coding: utf-8 -*-
SPECS = {}
SPECS["eng_for_ben"] = dict(
 doc="""Known verb: আশা করা -> প্রত্যাশা করা. This course already prompts "wasn't expecting" with প্রত্যাশা করিনি (LEGO S0112L01) and keeps আশা for
hope (S0107L02 hoped to, S0149L01 I hope); Samsad Bengali-English: প্রত্যাশা = expectation. Using প্রত্যাশা keeps one prompt -> one English verb.
The hope LEGO S0108L01 is re-cut to expect = প্রত্যাশা করা and all its rows follow; the wake LEGO S0108L02 becomes "to wake up"
(component জেগে = wake up). "waking" rows are left as they are.""",
 nsub=[("আশা", "প্রত্যাশা")], hope=["*"],
 legos={"S0108L01": {"lego": ("প্রত্যাশা করা", "expect")},
        "S0108L02": {"lego": (None, "to wake up"), "components": [{"known": "উঠতে", "target": "to", "introduce": False}, {"known": "জেগে", "target": "wake up"}]}},
)
SPECS["eng_for_guj"] = dict(
 doc="""Known verb: આશા નહોતી રાખી -> અપેક્ષા નહોતી રાખી. The course's own seed 112 prompts "I wasn't expecting it" with મને આની અપેક્ષા નહોતી
(S0112L03) and keeps આશા for hope (S0107L02, S0149L02); Gujarati Lexicon: અપેક્ષા = expectation; અપેક્ષા રાખવી = to expect. અપેક્ષા is
feminine like આશા, so ઊઠવાની / નહોતી રાખી agree unchanged. LEGO S0108L03 re-cut (component "didn't expect to"); wake LEGO S0108L01 -> "wake up".""",
 nsub=[("આશા", "અપેક્ષા")], hope=["*"],
)
SPECS["eng_for_hin"] = dict(
 doc="""Known side KEPT. उम्मीद is the course's own prompt for "wasn't expecting it" (मुझे इसकी उम्मीद नहीं थी, S0112L02); Oxford Hindi-English
(McGregor): उम्मीद = hope, expectation. "हमने … जागने की उम्मीद नहीं की थी" already reads "we hadn't expected to wake up". Only the English
target changes: LEGO S0108L01 -> "we didn't expect" (its known string differs from S0107L01 हमने उम्मीद की थी and S0112L02, so no prompt clash),
wake LEGO S0108L02 -> "to wake up", rows follow.""",
 hope=["*"],
)
SPECS["eng_for_kan"] = dict(
 doc="""Known verb: ಆಶಿಸಿರಲಿಲ್ಲ -> ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ, the course's own prompt for "wasn't expecting" (S0112L02); ಆಶಿಸು stays for hope (S0107L03, S0149L02).
Alar / Kittel: ನಿರೀಕ್ಷಿಸು = to expect. It takes both a clause (… ಅಂತ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ) and a plain object (ಸಹಾಯ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ), which the
colloquial ಅಂದುಕೊಂಡಿರಲಿಲ್ಲ does not, so the basket's object rows stay natural. NOTE for parent: S0108L03 ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ = "didn't expect" now
shares its known with S0112L02 = "wasn't expecting" (Kannada has one form for both). Wake LEGO S0108L02 -> "to wake up".""",
 nsub=[("ಆಶಿಸಿರಲಿಲ್ಲ", "ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ")], hope=["*"],
 rows={"S0108L03U01": ("ನಾನು ಅದನ್ನ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ", "I didn't expect that"),
       "S0108L03U02": ("ನಾವು ಇನ್ನೂ ಹೆಚ್ಚು ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ", "we didn't expect more"),
       "S0108L03U04": ("ಅವಳು ಸಹಾಯ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ", "she didn't expect help"),
       "S0108L03U05": ("ನಾವು ಏನೂ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ", "we didn't expect anything")},
)
SPECS["eng_for_mar"] = dict(
 doc="""Known verb: आशा नव्हती -> अपेक्षा नव्हती, the course's own prompt for "wasn't expecting it" (मला त्याची अपेक्षा नव्हती, S0112L02); आशा stays for
hope (S0107L02, S0149L03). Molesworth: अपेक्षा = expectation. Feminine like आशा, so यायची / नव्हती agree unchanged. The whole-chunk LEGO
S0108L02 becomes जाग यायची अपेक्षा नव्हती = "we didn't expect to wake up" and its rows follow.""",
 nsub=[("आशा", "अपेक्षा")], hope=["*"],
)
SPECS["eng_for_pan"] = dict(
 doc="""Known side KEPT. ਉਮੀਦ is the course's own prompt for "wasn't expecting" (ਉਮੀਦ ਨਹੀਂ ਸੀ, S0112L02); Punjabi University Punjabi-English
Dictionary: ਉਮੀਦ = hope, expectation. Only the English target changes: LEGO S0108L02 -> "we didn't expect" (component ਉਮੀਦ = expect; its known
string differs from S0107L03 and S0112L02, so no prompt clash), wake LEGO S0108L01 -> "wake up", rows follow.""",
 hope=["*"],
)
SPECS["eng_for_sin"] = dict(
 doc="""Known verb in the seed: ආශා කළේ නෑ ("didn't desire") -> බලාපොරොත්තු වුණේ නෑ, which is also the word this seed's own LEGO S0108L01 already
carries (බලාපොරොත්තු වෙන්න). Malalasekera English-Sinhala: expect = බලාපොරොත්තු වෙනවා; it covers hope and expect alike, so the LEGO's known
stays and its English becomes "expect" (S0107L01 බලාපොරොත්තු වුණා = hoped is a different form: no prompt clash). Rows keep their Sinhala and
take expect / wake up in English; wake LEGO S0108L02 -> "wake up". The Sinhala of several rows is rough as live (D1 Sinhala is separate work).""",
 seed_native="රෑ මැද අවදි වෙනවා කියලා බලාපොරොත්තු වුණේ නෑ.",
 hope=["*"],
)
SPECS["eng_for_tam"] = dict(
 doc="""Known verb: நம்பவில்லை ("didn't believe / trust") -> எதிர்பார்க்கவில்லை, the course's own prompt for "not expecting" (S0112L02); நம்பு stays for hope
(S0107L02, S0149L04). Madras Tamil Lexicon / Cre-A: எதிர்பார் = to expect. NOTE for parent: S0108L01 எதிர்பார்க்கவில்லை = "didn't expect" now shares
its known with S0112L02 = "not expecting" (the Tamil negative has no tense). Wake LEGO S0108L02 -> "wake up"; two broken build rows in L03
are written out in full English while they are open.""",
 nsub=[("நம்பவில்லை", "எதிர்பார்க்கவில்லை")], hope=["*"],
 rows={"S0108L02U02": ("அவள் விழிக்க விரும்பவில்லை", "she didn't want to wake up"),  # live row used எழுப்ப "wake (us) up", a different verb: it cannot contain the re-cut LEGO
       "S0108L03B02": (None, "wake up in the middle of the night"),
       "S0108L03B03": ("இரவின் நடுவில் விழிக்க எதிர்பார்க்கவில்லை", "didn't expect to wake up in the middle of the night")},
)
SPECS["eng_for_tel"] = dict(
 doc="""Known verb: లేవాలని ఆశించలేదు -> లేస్తామని ఊహించలేదు. The course's own prompt for "I wasn't expecting it" is దాన్ని ఊహించలేదు (S0112L02) and ఆశించు
stays for hope (S0107L01, S0149L02); Brown's Telugu-English: ఊహించు = to guess, suppose, expect. ఊహించలేదు takes a plain future clause, so the wish
form లేవాలని ("that we should get up") becomes లేస్తామని ("that we would get up"). The whole-chunk LEGO S0108L01 is re-cut and its rows follow.""",
 nsub=[("లేవాలని", "లేస్తామని"), ("ఆశించలేద", "ఊహించలేద")], hope=["*"],
)
SPECS["eng_for_urd"] = dict(
 doc="""Known verb: امید -> توقع. The course's own prompt for "wasn't expecting" is توقع (S0112L01) and امید stays for hope (S0107L03, seed 149);
Platts: توقع tawaqquʻ = expectation. Seed known rewritten as ہمیں … جاگنے کی توقع نہیں تھی (natural Urdu; live was the calque امید نہیں رکھتے تھے), and it
now says رات کے وسط میں like its own LEGO S0108L03 (live seed said درمیان میں, which that LEGO did not tile). The hope LEGO S0108L02 is re-cut
امید ہے -> توقع ہے = expect and every row rewritten; live build rows were verb-last calques (امید ہے دیکھنا) and are put right while open.""",
 seed_native="ہمیں رات کے وسط میں جاگنے کی توقع نہیں تھی۔",
 legos={"S0108L02": {"lego": ("توقع ہے", "expect")}},
 rows={"S0108L02B01": ("دیکھنے کی توقع ہے", "expect to see"),
       "S0108L02B02": ("سیکھنے کی توقع ہے", "expect to learn"),
       "S0108L02B03": ("سننے کی توقع ہے", "expect to hear"),
       "S0108L02U01": ("مجھے توقع ہے کہ آپ تیار ہیں", "I expect that you are ready"),
       "S0108L02U02": ("ہمیں توقع نہیں کہ رات کو جاگیں گے", "we don't expect to wake up at night"),
       "S0108L02U03": ("مجھے توقع ہے کہ یہ کام کرے گا", "I expect that it will work"),
       "S0108L02U04": ("کیا آپ کو اس کی توقع ہے؟", "do you expect it?"),
       "S0108L02U05": ("مجھے توقع ہے کہ یہ زبان آسان ہے", "I expect that this language is easy"),
       "S0108L03B04": ("رات کے وسط میں توقع ہے", "expect in the middle of the night"),
       "S0108L03U01": ("ہمیں رات کے وسط میں جاگنے کی توقع نہیں تھی", "we didn't expect to wake up in the middle of the night")},
)
J = "夜中に起きるとは思っていませんでした"; JE = "we didn't expect to wake up in the middle of the night"
SPECS["eng_for_jpn"] = dict(
 doc="""Known verb: 起きることを望んでいませんでした ("did not wish to wake") -> 起きるとは思っていませんでした. 〜とは思わなかった is the everyday Japanese for
"didn't expect to…" (the sister course jpn_for_eng's seed 108 uses the same とは思ってなかった; Kenkyusha New Japanese-English, 思う: 〜とは思わなかった
= I never expected…). 予想していませんでした is this course's prompt for "I wasn't expecting it" (S0112L01) and is left to that seed.
The whole-sentence LEGO S0108L02 is re-cut and its eight rows follow. S0108L01 rows say "waking", not "wake", and are untouched.""",
 seed_native=J + "。",
 legos={"S0108L02": {"lego": (J, JE), "components": [{"known": "夜中に", "target": "in the middle of the night"}]}},
 rows={"S0108L02B01": (J, JE),
       "S0108L02B02": ("私たちは" + J, JE),
       "S0108L02B03": (J + "が、起きてしまいました", JE + " but we did"),
       "S0108L02U01": ("夜中に起きるとは思っていなかったことはわかっています", "I know that " + JE),
       "S0108L02U02": ("彼女は夜中に起きるとは思っていなかったと私に言いました", "she told me that " + JE),
       "S0108L02U03": ("夜中に起きるとは思っていなかったことを覚えています", "I remember that " + JE),
       "S0108L02U04": ("夜中に起きるとは思っていなかったと思います", "I think that " + JE),
       "S0108L02U05": ("夜中に起きるとは思っていなかったので、とても疲れています", JE + " so we're very tired")},
)
K = "깰 줄 몰랐어요"
SPECS["eng_for_kor"] = dict(
 doc="""Known verb: 깨기를 바라지 않았어요 ("did not wish to wake") -> 깰 줄 몰랐어요. -(으)ㄹ 줄 모르다 is the everyday Korean for "didn't expect / had no
idea that…" (NIKL 한국어기초사전, 줄: "-ㄹ 줄 모르다"); 예상하지 못했어요 is this course's prompt for "I wasn't expecting it" (S0112L02) and is left to
that seed, so the two prompts stay distinct. LEGO S0108L02 re-cut with components 깰 = to wake up / 줄 몰랐어요 = we didn't expect; rows follow.
U05 (live: 그냥 over "just now", a mismatch; "we just didn't expect…" would split the LEGO) is rewritten with "tonight", already in this basket.""",
 seed_native="우리는 밤 중간에 " + K,
 legos={"S0108L02": {"lego": (K, "we didn't expect to wake up"), "components": [{"known": "깰", "target": "to wake up"}, {"known": "줄 몰랐어요", "target": "we didn't expect"}]}},
 rows={"S0108L02C01": ("깰", "to wake up"),
       "S0108L02C02": ("줄 몰랐어요", "we didn't expect"),
       "S0108L02B01": (K, "we didn't expect to wake up"),
       "S0108L02B02": ("밤 중간에 " + K, "we didn't expect to wake up in the middle of the night"),
       "S0108L02B03": ("지금 " + K, "we didn't expect to wake up now"),
       "S0108L02U01": ("우리는 밤 중간에 " + K, "we didn't expect to wake up in the middle of the night"),
       "S0108L02U02": ("우리는 오늘 밤 중간에 " + K, "we didn't expect to wake up in the middle of the night tonight"),
       "S0108L02U03": ("우리는 " + K, "we didn't expect to wake up"),
       "S0108L02U04": ("그것이 우리가 깰 줄 몰랐던 이유예요", "that is why we didn't expect to wake up"),
       "S0108L02U05": ("우리는 오늘 밤 " + K, "we didn't expect to wake up tonight")},
)
Z = "没想到会"
SPECS["eng_for_zho"] = dict(
 doc="""Known verb: 不希望 / 没希望 -> 没想到会. 没想到 is the course's own prompt for "I wasn't expecting" (S0112L02); CC-CEDICT: 没想到 = didn't expect.
会 marks the unexpected outcome. The single M LEGO S0108L01 is re-cut (components 没想到会 = didn't expect to / 醒来 = wake up / 半夜 = in the middle
of the night) and every row follows; rows keep their live 在半夜 where they had it, and their live capitalisation.""",
 seed_native="我们" + Z + "半夜醒来",
 legos={"S0108L01": {"lego": (Z + "半夜醒来", "Didn't expect to wake up in the middle of the night"),
        "components": [{"known": Z, "target": "didn't expect to"}, {"known": "醒来", "target": "wake up"}, {"known": "半夜", "target": "in the middle of the night"}]}},
 rows={"S0108L01C01": (Z, "Didn't expect to"),
       "S0108L01C02": (None, "Wake up"),
       "S0108L01B01": (Z + "半夜醒来", "Didn't expect to wake up in the middle of the night"),
       "S0108L01B02": ("今天" + Z + "在半夜醒来", "Didn't expect to wake up in the middle of the night today"),
       "S0108L01B03": (Z + "再次在半夜醒来", "Didn't expect to wake up in the middle of the night again"),
       "S0108L01B04": ("现在" + Z + "在半夜醒来", "Didn't expect to wake up in the middle of the night now"),
       "S0108L01U01": ("我们" + Z + "在半夜醒来", "We didn't expect to wake up in the middle of the night"),
       "S0108L01U02": ("我" + Z + "在半夜醒来", "I didn't expect to wake up in the middle of the night"),
       "S0108L01U03": ("他们" + Z + "在半夜醒来", "They didn't expect to wake up in the middle of the night"),
       "S0108L01U04": ("你为什么觉得我们" + Z + "在半夜醒来？", "Why do you think that we didn't expect to wake up in the middle of the night?"),
       "S0108L01U05": ("他" + Z + "在半夜醒来", "He didn't expect to wake up in the middle of the night")},
)
