// A-135 eng_for_kor: proposed Korean known_text for the 39 English-on-both-sides rows.
// known side = Korean (the learner's own language). target side = English, UNCHANGED.
// provenance: 'recovered' = the exact Korean already exists in this course for this exact English.
//             'authored'  = composed from Korean already given to the learner at or before this seed.
module.exports = [
// ---- S40 ----
{id:'eng_for_kor:S0040L01U04', ko:'영어로 말하는 것에 대해 기분이 어때요?', p:'authored', src:'legos S≤40: 영어로 / 말하는 것을 (talking) / 그것에 대해 (about it) / 기분이 어때요?', conf:'medium', why:'every piece attested by S40, but "말하는 것에 대해" is a composition the course never shows as a unit; a Korean ear may prefer 영어 말하기에 대해'},
{id:'eng_for_kor:S0040L01U05', ko:'영어를 배우는 것에 대해 기분이 어때요?', p:'authored', src:'legos S≤40: 배우고 있어요 / 배우려고 / 그것에 대해 / 기분이 어때요?', conf:'medium', why:'same composition as U04 with 배우는 것; nominaliser -는 것 attested (말하는 것을) but not with 배우다 before S40'},
// ---- S280 L03 ----
{id:'eng_for_kor:S0280L03U04', ko:'저는 가기 전에 그 일만 했어요', p:'authored', src:'S280 build 그 일만 했어요 + lego S≤40 가기 전에 (before I have to go)', conf:'high', why:'both halves are attested strings; only 저는 is added'},
{id:'eng_for_kor:S0280L03U05', ko:'그녀는 일만 했어요, 하지만 있고 싶어하지 않았어요', p:'authored', src:'S280 build 그녀는 일만 했어요 + lego 하지만 + S276 있고 싶어요 (stay) + S70 싶어하지 않았어요', conf:'medium', why:'bare 있고 싶어하지 않았어요 for "didn\'t want to stay" leans on context; the course only ever shows 여기 있을 수 있어요 / 조금 더 오래 있을 수 있어요'},
{id:'eng_for_kor:S0280L03U06', ko:'우리는 함께 일만 했어요, 그리고 저는 갈 준비가 됐어요', p:'authored', src:'lego 우리는 / 그리고; S133 함께 일하다; S280 일만 했어요; S26 갈 준비가 됐어요', conf:'medium', why:'"and then" is rendered as bare 그리고 — the course has no sequencing "then" (그런 다음/그러고 나서 absent course-wide)'},
// ---- S282 ----
{id:'eng_for_kor:S0282L01U01', ko:'아니요, 전혀 문제없어요', p:'recovered', src:'eng_for_kor:S0282L01U05-sibling already carries this exact Korean for this exact English', conf:'high', why:'exact recovery — but see DUPLICATE flag: the row becomes a byte-identical twin of an existing phrase'},
{id:'eng_for_kor:S0282L01U02', ko:'저에게 아니요, 문제없어요', p:'recovered', src:'existing S282 sibling with the identical English "no, that\'s not a problem for me"', conf:'high', why:'exact recovery. The recovered Korean is itself clumsy (저에게는 문제없어요 would be idiomatic) — recovering matches the course, it does not improve it. DUPLICATE flag applies'},
{id:'eng_for_kor:S0282L01U03', ko:'더 많은 시간이 필요하면 아니요, 문제없어요', p:'authored', src:'S282 sibling pattern 당신이 늦으면 아니요, 문제없어요 + S209 더 많은 시간을 + S45 필요 + S147 -면', conf:'high', why:'straight substitution into an attested frame with attested pieces'},
{id:'eng_for_kor:S0282L01U04', ko:'우리가 함께 일할 때 아니요, 문제없어요', p:'authored', src:'same frame + S133 함께 일하다 + attested -ㄹ 때', conf:'high', why:'attested frame, attested pieces'},
// ---- S284 ----
{id:'eng_for_kor:S0284L01U06', ko:'저는 당신이 제 여동생 친구를 만나면 좋겠어요', p:'authored', src:'S284 제 여동생 친구를 + lego 좋겠어요 (I\'d like to) + lego 만나고 + S177 -면 좋겠어요', conf:'medium', why:'the -면 좋겠어요 "I would like you to" frame is attested at S177 but only once; a native might prefer 만났으면 좋겠어요'},
// ---- S288 ----
{id:'eng_for_kor:S0288L01U01', ko:'저는 피곤할 때 텔레비전 보는 것을 좋아해요', p:'authored', src:'S288 저는 텔레비전 보는 것을 좋아해요 + S55 피곤할 때', conf:'high', why:'two attested strings concatenated in attested order'},
{id:'eng_for_kor:S0288L01U02', ko:'저는 저녁에 텔레비전 보는 것을 좋아해요', p:'authored', src:'S288 sibling + S25/S26 저녁에', conf:'high', why:'attested adverb dropped into an attested frame (sibling does exactly this with 밤에)'},
{id:'eng_for_kor:S0288L01U03', ko:'다른 사람과 텔레비전 보는 것을 좋아해요?', p:'authored', src:'S5 다른 사람과 (with someone else) + S288 텔레비전 보는 것을 좋아해요', conf:'high', why:'attested pieces; question by intonation, which the course uses throughout'},
{id:'eng_for_kor:S0288L01U04', ko:'저는 쉬고 싶을 때 텔레비전 보는 것을 좋아해요', p:'authored', src:'S110 쉬고 싶어요 + attested -ㄹ 때 + S288 frame', conf:'high', why:'attested pieces; 싶을 때 is the regular form of the attested 싶어요'},
{id:'eng_for_kor:S0288L02U05', ko:'제가 아는 대부분의 사람들은 영어로 말하는 것이 괜찮아요', p:'authored', src:'S288 제가 아는 대부분의 사람들 + S155 것이 괜찮아요 (glossed "don\'t mind") + 영어로 말하는', conf:'high', why:'"don\'t mind" has a course-canonical Korean (것이 괜찮아요) and it is used exactly this way at S155'},
// ---- S290 ----
{id:'eng_for_kor:S0290L01U05', ko:'저는 누가 답을 알고 있는지 알아야 해요', p:'authored', src:'S268/S283 누가 + S290 답을 알고 있 + S44 해야 + S45 알', conf:'medium', why:'알아야 해요 is composed from attested 알 + 해야; the course\'s own 알아야 해요 debuts at S293, three seeds LATER than this row'},
// ---- S292 ----
{id:'eng_for_kor:S0292L01U01', ko:'저는 당신과 파티에 가고 싶어요', p:'authored', src:'lego 당신과 + S292 sibling 저는 오늘 저녁 파티에 가고 싶어요', conf:'high', why:'attested frame, attested pronoun phrase'},
{id:'eng_for_kor:S0292L01U02', ko:'오늘 밤 파티에 오고 싶어요?', p:'authored', src:'S45 오늘 밤 + S271 오고 싶어요? + S292 파티에', conf:'high', why:'all three attested'},
{id:'eng_for_kor:S0292L01U03', ko:'저는 파티에 갈 수 있을지 모르겠어요', p:'authored', src:'S292 sibling 그녀가 파티에 올 수 있을지 모르겠어요, with 갈 for the first person', conf:'high', why:'sibling frame with the come/go swap the course already makes (올/갈)'},
{id:'eng_for_kor:S0292L01U04', ko:'저는 친구들과 파티에 가고 싶어요', p:'authored', src:'S51 친구들과 + S292 파티에 가고 싶어요', conf:'high', why:'both attested'},
// ---- S294 ----
{id:'eng_for_kor:S0294L01U06', ko:'죄송하지만 오늘 당신에게 전화할 시간이 충분하지 않아요', p:'authored', src:'S139 죄송하지만 + S294 sibling 저는 오늘 당신에게 전화할 시간이 충분하지 않아요', conf:'high', why:'attested opener + attested sentence minus 저는'},
{id:'eng_for_kor:S0294L01U07', ko:'저는 어젯밤에 당신에게 전화할 시간이 충분하지 않았어요', p:'authored', src:'S42/S43 어젯밤에 + S294 frame + S43 -지 않았어요 past', conf:'high', why:'past form of an attested frame, past marker attested at S43'},
{id:'eng_for_kor:S0294L01U08', ko:'그는 오늘 저녁에 당신에게 전화할 시간이 충분하지 않아요', p:'authored', src:'S294 frame + 그는 + S25 저녁에', conf:'high', why:'subject swap in an attested frame'},
// ---- S296 ----
{id:'eng_for_kor:S0296L01U01', ko:'저는 영어로 더 자주 말해야 한다고 말했어요', p:'authored', src:'S3 자주 + 더 + S147 말해야 + S211 -야 한다고 말했어요', conf:'medium', why:'"more often" = 더 자주 is composed; the course only ever glosses 자주 inside 가능한 한 자주 ("as often as possible")'},
{id:'eng_for_kor:S0296L01U02', ko:'저는 연습할 시간이 더 필요하다고 말했어요', p:'authored', src:'S66 연습할 시간을 + S296 필요하다고 말했어요', conf:'high', why:'attested lego frame with an attested noun phrase; deliberately worded to avoid colliding with the existing 저는 더 많은 시간이 필요하다고 말했어요'},
{id:'eng_for_kor:S0296L01U03', ko:'저는 답을 찾아야 한다고 말했어요', p:'authored', src:'S68 저는 답을 찾고 있어요 + S211 -야 한다고 말했어요', conf:'medium', why:'찾아야 is the regular -야 form of attested 찾-, but the course never shows 찾아야'},
{id:'eng_for_kor:S0296L01U04', ko:'저는 어제 당신과 이야기해야 한다고 말했어요', p:'authored', src:'lego 어제 + 당신과 + S51 이야기하고 싶어요 + S211 -야 한다고 말했어요', conf:'medium', why:'이야기해야 composed from attested 이야기하-; the English past ("needed to talk yesterday") is carried only by 어제, as the course frame is present-tense'},
// ---- S298 ----
{id:'eng_for_kor:S0298L01U01', ko:'저는 그것에 대해 할 말이 없다고 생각해요', p:'authored', src:'lego 그것에 대해 + S298 할 말이 없어요 + S290 -다고 생각해요', conf:'high', why:'three attested pieces in an attested order'},
{id:'eng_for_kor:S0298L01U02', ko:'그녀는 저에게 할 말이 없다고 말했어요', p:'authored', src:'S70 저에게 말해요 (tell me) + S298 그녀는 할 말이 없어요 + S236 -다고 말했어요', conf:'high', why:'all attested; "told me" has a course-canonical 저에게 …말했어요'},
{id:'eng_for_kor:S0298L01U03', ko:'죄송하지만 저는 할 말이 없어요', p:'authored', src:'S139 죄송하지만 + S298 저는 할 말이 없어요 (minus 더 이상)', conf:'high', why:'attested opener + attested sentence'},
{id:'eng_for_kor:S0298L01U04', ko:'저는 피곤할 때 할 말이 없어요', p:'authored', src:'S55 피곤할 때 + S298 할 말이 없어요', conf:'low', why:'ZUT RISK — see report. The existing sibling 피곤할 때 저는 할 말이 없어요 already means exactly this; the only difference here is 저는 word order, so the learner faces two near-identical Korean prompts wanting two different English word orders. RECOMMEND DELETING THIS ROW instead of repairing it'},
// ---- S300 L01 ----
{id:'eng_for_kor:S0300L01U01', ko:'저는 불친절하게 보이고 싶지 않아요', p:'authored', src:'S300 불친절하게 보이고 + lego 싶지 않아요 (I wouldn\'t like to)', conf:'high', why:'attested pieces; 싶지 않아요 is the first-person counterpart of the seed\'s 싶어하지 않아요, a contrast the course teaches'},
{id:'eng_for_kor:S0300L01U02', ko:'저는 그가 불친절하다고 생각했어요', p:'authored', src:'S300 그는 불친절해요 + S124/S247 -다고 생각했어요', conf:'high', why:'attested adjective + attested past-thought frame'},
{id:'eng_for_kor:S0300L01U03', ko:'그녀가 불친절해 보여서 놀랐어요', p:'recovered', src:'existing S300 sibling carries this exact Korean for this exact English', conf:'high', why:'exact recovery. DUPLICATE flag applies'},
{id:'eng_for_kor:S0300L01U04', ko:'저는 그녀가 불친절하다고 생각하지 않아요', p:'authored', src:'S300 그녀는 불친절하지 않아요 + S248/S259 -다고 생각하지 않아요', conf:'high', why:'attested negated-thought frame with an attested adjective'},
// ---- S300 L02 ----
{id:'eng_for_kor:S0300L02U01', ko:'저는 그녀가 불친절하게 보이고 싶어하지 않는다는 것을 알아요', p:'authored', src:'S300 그녀는 불친절하게 보이고 싶어하지 않아요 + S294 -다는 것을 알아요', conf:'medium', why:'the -는다는 것을 알아요 frame is attested once (S294) and the resulting sentence is long (25 syllables) for a known-side prompt'},
{id:'eng_for_kor:S0300L02U02', ko:'그는 어렵게 보이고 싶어하지 않는다고 생각해요', p:'authored', src:'S300 그는 불친절하게 보이고 싶어하지 않는다고 생각해요 with 어렵게 for 불친절하게; 어려운 attested at S280', conf:'medium', why:'어렵게 보이다 of a PERSON is not idiomatic Korean — it reads "look hard (to do)". This is the weakest adjective swap of the eight; a Korean speaker should confirm or replace'},
{id:'eng_for_kor:S0300L02U03', ko:'다른 사람들이 있을 때 그녀는 피곤하게 보이고 싶어하지 않아요', p:'authored', src:'lego S≤40 다른 사람들이 있을 때 + S300 frame + 피곤해요 → 피곤하게', conf:'high', why:'attested clause + attested frame; 피곤하게 보이다 is idiomatic'},
{id:'eng_for_kor:S0300L02U04', ko:'그녀는 말하기 전에 긴장하게 보이고 싶어하지 않아요', p:'authored', src:'S147 긴장하다 + lego 말하기 + lego 가기 전에 → 말하기 전에 + S300 frame', conf:'medium', why:'긴장하게 보이다 is understandable but a native would more likely say 긴장한 것처럼 보이다; kept parallel to the seed\'s 불친절하게 보이고 on controlled-language grounds'},
];
