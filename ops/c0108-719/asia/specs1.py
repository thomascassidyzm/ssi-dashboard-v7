# -*- coding: utf-8 -*-
SPECS = {}
SPECS["ben_for_eng"] = dict(
 doc="""Verb: target KEPT. আশা করিনি already serves as "didn't expect" in everyday Bengali and in this course's own seed 112
("I wasn't expecting it" = আমি এটা আশা করিনি, LEGO S0112L02); Samsad Bengali-English: আশা করা = to hope, to expect.
So English side only: the hope LEGO S0108L03 is re-glossed "we didn't expect" (component "not" -> "didn't expect") and its rows follow.
"the waking" (L02) is left: it is a gerund gloss, not the verb "wake".""",
 hope=["S0108L03"],
 legos={"S0108L03": {"lego": ("we didn't expect", None), "components": [{"known": "we", "target": "আমরা"}, {"known": "didn't expect", "target": "আশা করিনি"}]}},
 rows={"S0108L03C02": ("didn't expect", None),
       "S0108L03U05": ("we didn't expect it, that's the truth", None)},
)
SPECS["hin_for_eng"] = dict(
 doc="""Verb: target KEPT. उम्मीद is Hindi's everyday word for expectation as well as hope, and the course's own seed 112 uses it for
"I wasn't expecting it" (इसकी उम्मीद नहीं थी, S0112L02); Oxford Hindi-English (McGregor): उम्मीद = hope, expectation.
"…जागने की उम्मीद नहीं कर रहे थे" reads as "weren't expecting to wake up". English side only. Seed 108 has no hope LEGO here
(उम्मीद is taught at S0107L01); the two rows that echoed the old seed are re-glossed. Targets unchanged, so romanisation unchanged.""",
 rows={"S0108L02B03": ("expect to wake up", None),
       "S0108L02U05": ("I don't expect to wake up", None),
       "S0108L03U01": ("we didn't expect to wake up in the middle of the night", None)},
)
SPECS["mar_for_eng"] = dict(
 doc="""Verb: आशा नव्हती -> अपेक्षा नव्हती. Marathi keeps hope (आशा) and expectation (अपेक्षा) apart; the course's own seed 112 says
"मला त्याची अपेक्षा नव्हती" for "I wasn't expecting it" (LEGO S0112L02 expectation = अपेक्षा); Molesworth: अपेक्षा = expectation.
अपेक्षा is feminine like आशा, so होण्याची / नव्हती agree unchanged. Seed 108 has no hope LEGO in this course (pre-existing gap: आम्हाला and
the noun are uncovered), so only the rows that carried आशा move. NOTE for parent: अपेक्षा is now first met in seed 108's sentence, its LEGO is S0112L02.""",
 nsub=[("आशा", "अपेक्षा")],
 rows={"S0108L02B02": ("we didn't expect", "आम्हाला अपेक्षा नव्हती"),
       "S0108L02U05": ("didn't expect", "अपेक्षा नव्हती"),
       "S0108L04B02": ("midnight — we didn't expect", "मध्यरात्री आम्हाला अपेक्षा नव्हती"),
       "S0108L04U01": ("we didn't expect to wake up in the middle of the night", "मध्यरात्री जागं होण्याची आम्हाला अपेक्षा नव्हती"),
       "S0108L03U05": ("to wake up", None),
       "S0108L04U05": ("wake up at midnight", None)},
)
SPECS["nep_for_eng"] = dict(
 doc="""Verb: target KEPT. The course's own seed 112 renders "I wasn't expecting it" as मैले यसको आशा गरेको थिइनँ (LEGO S0112L02), i.e. this
course already uses आशा for expect; Turner, Nepali Dictionary: आशा = hope, expectation. English side only: the hope LEGO S0108L03 is
re-glossed "we didn't expect to" and its rows follow (component glosses are word-for-word and stay). Rows that genuinely say hope
(आशा थियो / आशा छ, with hope = आशा taught at S0107L02) are correct content and keep "hope"; they only get wake -> wake up.""",
 hope=["S0108L03"],
 legos={"S0108L03": {"lego": ("we didn't expect to", None)}},
 keep=["S0108L03C02"],
)
SPECS["tel_for_eng"] = dict(
 doc="""Verb: ఆశించలేదు -> ఊహించలేదు. The course glosses ఆశించాం as "we hoped" (S0107L01) and uses ఊహించలేదు for "didn't expect" in seed 112
(S0112L02); Brown's Telugu-English: ఊహించు = to guess, suppose, expect. ఊహించలేదు takes a plain "that it would" clause, so the
complement రావాలని ("that it should come", a wish form) is re-cut to వస్తుందని in S0108L02: "మెలకువ వస్తుందని ఊహించలేదు".
The whole seed-108 basket in this draft course is placeholder-grade fragments ("didn't hope useful"); rows are moved to the new
words fragment-for-fragment, not rebuilt (out of scope). NOTE for parent: S0108L03 now equals S0112L02 (didn't expect = ఊహించలేదు),
so S0112L02 is no longer the first introduction.""",
 seed_native="మనం అర్ధరాత్రి మెలకువ వస్తుందని ఊహించలేదు.",
 nsub=[("రావాలని", "వస్తుందని"), ("ఆశించలేదు", "ఊహించలేదు")],
 hope=["*"],
 keep=["S0108L01B01", "S0108L01B02", "S0108L01B03", "S0108L01U02", "S0108L01U03", "S0108L01U04", "S0108L01U05", "S0108L04B03"],  # noun 'wakefulness' fragments: not the verb
 legos={"S0108L02": {"lego": ("that it would come", "వస్తుందని")},
        "S0108L03": {"lego": ("didn't expect", "ఊహించలేదు")}},
 rows={"S0108L02B01": ("that it would come here", "వస్తుందని ఇక్కడ"),
       "S0108L02B02": ("but that it would come", "కానీ వస్తుందని"),
       "S0108L02B03": ("that we would wake up", "మెలకువ వస్తుందని"),
       "S0108L02U01": ("that it would come here", "వస్తుందని ఇక్కడ ఉంది"),
       "S0108L02U02": ("though that it would come", "కానీ వస్తుందని ఉంది"),
       "S0108L02U03": ("or that it would come", "లేదా వస్తుందని ఉంది"),
       "S0108L02U04": ("that we would wake up", "మెలకువ వస్తుందని ఉంది"),
       "S0108L02U05": ("that it would come, useful", "వస్తుందని ఉపయోగకరం"),
       "S0108L03B03": ("didn't expect that it would come", "వస్తుందని ఊహించలేదు"),
       "S0108L03U05": ("didn't expect to wake up", "మెలకువ వస్తుందని ఊహించలేదు"),
       "S0108L04U01": ("we didn't expect to wake up in the middle of the night", "మనం అర్ధరాత్రి మెలకువ వస్తుందని ఊహించలేదు"),
       "S0108L04U02": ("didn't expect to wake up at midnight", "అర్ధరాత్రి మెలకువ వస్తుందని ఊహించలేదు")},
)
SPECS["kan_for_eng"] = dict(
 doc="""Seed-only draft (no LEGOs). Verb: ಆಸೆ ಪಡಲಿಲ್ಲ ("didn't desire") -> ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ, the word the sister course eng_for_kan uses for
"wasn't expecting" (S0112L02); Kittel / Alar: ನಿರೀಕ್ಷಿಸು = to expect. The wish form ಎಚ್ಚರಗೊಳ್ಳಬೇಕು ("should wake") becomes the plain
ಎಚ್ಚರ ಆಗ್ತೀವಿ ಅಂತ ("that we'd wake up"), the same colloquial clause eng_for_kan carries.""",
 seed_native="ನಾವು ಮಧ್ಯರಾತ್ರಿಯಲ್ಲಿ ಎಚ್ಚರ ಆಗ್ತೀವಿ ಅಂತ ನಿರೀಕ್ಷಿಸಿರಲಿಲ್ಲ.",
)
SPECS["ind_for_eng"] = dict(
 doc="""Seed-only draft (no LEGOs). Verb: tidak harap -> tidak menyangka akan. KBBI: sangka / menyangka = menduga, mengira; "tidak menyangka"
is the everyday Indonesian "didn't expect". bangun -> terbangun (KBBI: terbangun = bangun tiba-tiba / tidak sengaja), the natural
verb for waking in the night without meaning to.""",
 seed_native="Kita tidak menyangka akan terbangun di tengah malam.",
)
SPECS["tha_for_eng"] = dict(
 doc="""Verb: ไม่ได้หวังจะ -> ไม่ได้คาดว่าจะ. The course teaches หวัง = hope (S0107L01) and คาดไว้ = "didn't expect" (S0112L02);
Royal Institute Dictionary: คาด = นึกไว้, หมายไว้ล่วงหน้า (to anticipate). Seed 108 has one LEGO (ตื่นกลางดึก), no hope LEGO, so only the
three rows that echoed the old seed move; romanisation follows the neighbours' RTGS-style scheme. U05 ("I hope I won't wake up…",
ผมหวังว่า…) genuinely says hope with a taught word and is left.""",
 seed_native="พวกเราไม่ได้คาดว่าจะตื่นกลางดึก", seed_roman="phuak rao mai dai khat wa cha tuen klang duek",
 rows={"S0108L01B02": ("expect to wake up in the middle of the night", "คาดว่าจะตื่นกลางดึก", "khat wa cha tuen klang duek"),
       "S0108L01B03": ("didn't expect to wake up in the middle of the night", "ไม่ได้คาดว่าจะตื่นกลางดึก", "mai dai khat wa cha tuen klang duek"),
       "S0108L01U01": ("we didn't expect to wake up in the middle of the night", "พวกเราไม่ได้คาดว่าจะตื่นกลางดึก", "phuak rao mai dai khat wa cha tuen klang duek")},
)
SPECS["zho_for_eng"] = dict(
 doc="""Verb: 没希望 -> 没想到会. The course's own seed 112 uses 没想到 for "wasn't expecting" (S0112L01); CC-CEDICT: 没想到 = didn't expect.
会 marks the unexpected outcome ("没想到会…"). Seed 108 has one LEGO (半夜), no hope LEGO; only the seed-echo row U09 moves, plus
wake -> wake up on the English of B04 / U04 / U07. U04 ("I originally hoped to sleep", 本来希望, as in seed 107) is a real hope row: kept.""",
 seed_native="我们没想到会半夜醒来", seed_roman="wǒmen méi xiǎngdào huì bànyè xǐng lái",
 rows={"S0108L01U09": ("we didn't expect to wake up in the middle of the night", "我们没想到会半夜醒来", "wǒmen méi xiǎngdào huì bànyè xǐng lái.")},
)
SPECS["yue_for_eng"] = dict(
 doc="""Verb: 唔希望 -> 估唔到會. The course's own seed 112 says 我估唔到 for "I wasn't expecting it"; words.hk 粵典: 估唔到 = 冇預料到 (didn't expect).
會 marks the unexpected outcome. No hope LEGO in seed 108 (希望 is S0107L01). The wake LEGO S0108L02 瞓醒 is re-glossed "to wake up"
(components unchanged) and its rows follow; U03 ("we hope not to wake up", 希望唔會) is a real hope row and keeps its verb.""",
 seed_native="我哋估唔到會半夜瞓醒。",
 legos={"S0108L02": {"lego": ("to wake up", None)}},
 rows={"S0108L02U01": ("we didn't expect to wake up in the middle of the night", "我哋估唔到會半夜瞓醒"),
       "S0108L02B02": ("I woke up", None),
       "S0108L02U05": ("everyone else woke up too", None)},
)
SPECS["hak_for_eng"] = dict(
 doc="""Verb: 無希望 -> 無想到會. The course's own seed 112 uses 無想到 for "didn't expect it" (S0112L01); MOE 臺灣客語辭典 lists 想毋著 / 無想著
for 沒想到, and the course's spelling 無想到 is kept for consistency. No hope LEGO in seed 108 (希望 is S0107L01); only the seed-echo row moves.""",
 seed_native="𠊎兜無想到會半夜睡醒。",
 rows={"S0108L02U01": ("we didn't expect to wake up in the middle of the night", "𠊎兜無想到會半夜睡醒")},
)
SPECS["nan_for_eng"] = dict(
 doc="""Verb: 無希望 -> 想袂到會. The course's own seed 112 uses 想袂到 for "wasn't expecting" (S0112L01); MOE 臺灣台語常用詞辭典: 想袂到 (siūnn-bē-kàu)
= 想不到、料想不到. No hope LEGO in seed 108 (希望 is S0107L02); the seed-echo row moves, B03 / U02 get wake -> wake up. U04 ("we hope to sleep well",
阮希望…) is a real hope row and is left.""",
 seed_native="阮想袂到會佇半暝精神。",
 rows={"S0108L01U01": ("we didn't expect to wake up in the middle of the night", "阮想袂到會佇半暝精神")},
)
K = "일어날 줄 몰랐어요"
SPECS["kor_for_eng"] = dict(
 doc="""Live seed said WANT, not hope ("we didn't want to wake up" = 일어나고 싶지 않았어요); it now has to say expect.
Verb: 일어날 줄 몰랐어요. -(으)ㄹ 줄 모르다 is the everyday Korean for "didn't expect / had no idea that…" (NIKL 한국어기초사전, 줄: "-ㄹ 줄 모르다");
the bookish alternative 예상하지 못했어요 is the course's "wasn't expecting it" at S0112L02 and is left to that seed.
The M LEGO S0108L01 is re-cut whole (didn't expect to wake up) with components 일어날 / 줄 몰랐어요; every row in it and the
seed-echo rows in L02 move. Rows keep their pro-drop duplicates as live. None of the changed rows carries romanisation live.""",
 seed_native="한밤중에 " + K, seed_roman="han-bam-jung-e i-reo-nal jul mol-la-sseo-yo",
 legos={"S0108L01": {"lego": ("didn't expect to wake up", K), "components": [{"known": "to wake up", "target": "일어날"}, {"known": "didn't expect", "target": "줄 몰랐어요"}]}},
 rows={"S0108L01C01": ("to wake up", "일어날"),
       "S0108L01C02": ("didn't expect", "줄 몰랐어요"),
       "S0108L01B01": ("didn't expect to wake up", K),
       "S0108L01B03": ("we didn't expect to wake up", K),
       "S0108L01B04": ("but we didn't expect to wake up", "하지만 " + K),
       "S0108L01U01": ("we didn't expect to wake up", K),
       "S0108L01U02": ("I didn't expect to wake up", K),
       "S0108L01U05": ("but we didn't expect to wake up", "하지만 " + K),
       "S0108L01U08": ("so we didn't expect to wake up", "그래서 " + K),
       "S0108L02B03": ("didn't expect to wake up in the middle of the night", "한밤중에 " + K),
       "S0108L02U01": ("we didn't expect to wake up in the middle of the night", "한밤중에 " + K),
       "S0108L02U02": ("I didn't expect to wake up in the middle of the night", "한밤중에 " + K),
       "S0108L02U06": ("but we didn't expect to wake up in the middle of the night", "하지만 한밤중에 " + K),
       "S0108L02U08": ("so we didn't expect to wake up in the middle of the night", "그래서 한밤중에 " + K)},
)
