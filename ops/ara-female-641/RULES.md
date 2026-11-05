# Judging rules — Arabic speaker-gender text (job #641·AD, Kai's approval 5 Nov 2026)

Courses: ara_eg_for_eng (Egyptian; female voice Salma, male Shakir) and ara_lb_for_eng (Levantine/Lebanese; female Layla, male Rami).
Every line is spoken twice in the app: by the female voice (target1) and by the male voice (target2). The screen shows `text`.
`f` is what the FEMALE voice should say; `m` is what the MALE voice should say.

## THE RULE (Kai, binding)
The female text may change ONLY words that agree with the FIRST-PERSON SINGULAR SPEAKER (I / me): adjectives,
active participles and predicate nouns whose subject is the speaker. NOTHING ELSE changes:
- never "we" (إحنا / نحنا, plural participles عايزين/مبسوطين/محتاجين stay as they are — "we" does not inflect for gender here);
- never a third person (he/she/it/they/a thing), never the addressee "you", never an adverb;
- never drop, add or reorder any other word; never change object suffixes (ـها her, ـه/ـو him/it, ـك you) except to
  attach them correctly to the feminine participle;
- verbs do not inflect for the speaker's gender in the 1st person (حاقدر، حاروح، كنت، بحاول، قلت stay as they are).
A line needing no change has f = text exactly.
The male text m mirrors it: m = text, except where the screen text has a FEMININE form agreeing with the first-person
speaker, which m makes masculine. Everything else in m = text exactly.

## Who is the subject? Read the whole line, its English, and the seed English.
Change a word only when the line itself (Arabic and/or its English) shows the speaker is its subject:
- `أنا` + adjective/participle; English "I'm tired", "I want", "I'm sure", "I was ready".
- a participle followed by a 1st-person verb: عايز أروح "want to go (I)" → عايزة أروح; but عايز تروح "want you to go /
  do you want to go" is the addressee — unchanged.
- `كنت` is ambiguous in writing (I was / you(m) were): decide from the English.
- English "you" / "he" / "she" / "it" / "we" / "they" subject → unchanged.
- A SUBJECT-LESS FRAGMENT (bare adjective or participle with no أنا, no 1st-person verb, and English without "I"), e.g.
  تعبان "tired", حاسس تعبان "feeling tired", جاهز "ready", شجاع "brave": UNCHANGED. Nothing shows it is the speaker.
- Calibration (known bad clips, must come out unchanged): S0040L01U03 هو حاسس تعبان الصبح "he's feeling tired this
  morning" → f = text; S0040L01B03 حاسس إزاي دلوقتي "how do you feel now" → f = text.
  But S0040L01U02 أنا حاسس تعبان شوية "I'm feeling a little tired" → f = أنا حاسة تعبانة شوية (Egyptian).
- Adverbs and comparatives never inflect: كويس / منيح as "well" after a verb (أحس كويس, بحكي منيح), أحسن, أكتر, شوية.
  Where كويس/منيح is a predicate adjective of the speaker (أنا كويس "I'm fine") it inflects: أنا كويسة / أنا منيحة.
- A predicate noun that has a feminine counterpart for a person (أنا مدرس → مدرسة, أنا طالب → طالبة) inflects;
  غلط in كنت غلط "I was wrong" does NOT (غلطة = "a mistake").

## Correct feminine forms (spell them as natives write them)
Egyptian: عايز→عايزة; عايزه/عايزها (want it/her) → عايزاه / عايزاها; حاسس→حاسة; فاكر→فاكرة; متأكد→متأكدة;
مبسوط→مبسوطة; جاهز→جاهزة; تعبان→تعبانة; عارف→عارفة, عارفه (know it/him) → عارفاه; شايف→شايفة, شايفه→شايفاه;
محتاج→محتاجة; حابب→حابة; مستني→مستنية; فاهم→فاهمة, فاهمك→فاهماك; ناوي→ناوية; خايف→خايفة; قاصد→قاصدة.
Levantine (lb): بدّي/بدي "I want" does NOT inflect; حاسس→حاسة; مبسوط→مبسوطة (NEVER مبسطة, which means "simplified");
عارف→عارفة, عارفو (know him/it) → عارفتو; فاهم→فاهمة; متأكد→متأكدة; جاهز→جاهزة; تعبان→تعبانة; منيح→منيحة;
مشتاق→مشتاقة; ممنونك "grateful to you" → ممنونتك (keep the ـك); متوقعو → متوقعتو; خايف→خايفة; ناطر→ناطرة.
Never invent a non-word (حاقدرة, حابقة, حاثقة are wrong — those are verbs). Keep every other character of the line
(punctuation, spacing, ؟, .) exactly as in `text`.

## Input
Your chunk is JSONL, one object per line: `n` (index), `text` (screen text), `row` (null, or the CURRENT table row
{id, f, m} — the old rewrite, which is often WRONG: never trust it, judge afresh), `slots` (up to 3 places the line is
used: slot label, its English `en`, and `seed_en` the whole sentence it comes from), `nslots`.

## Output
Write ONE JSON array to the out path in your brief. Emit an object for EVERY line that has a `row`, AND for every line
where your f or m differs from text. Lines you do not emit are taken as f = m = text with no row.
  {"n": 12, "text": "...", "f": "...", "m": "...", "sure": true, "why": "≤12 words, e.g. 'I + participle' or 'we: unchanged'"}
`sure: false` only where you genuinely cannot tell; then choose the CONSERVATIVE answer (f = text) and say why.
