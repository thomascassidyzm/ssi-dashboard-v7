# Pod 1 scene 4, coffee invitation (Tom Y, 3 Nov 2026; job #794). Minimal clause swaps per course:
# each entry is (old substring -> new substring), asserted present in the live line, so nothing else moves.
# Reads a snapshot of every course's scene-4 rows (GET /api/pods/<course>/pod-1) and writes drafts.json.
import json, sys

EN2 = ("Can we talk tomorrow?", "Shall we go for a coffee tomorrow?")
EN3 = ("let's talk on Saturday", "let's go on Saturday")
JA_A2 = ("明日話せますか？", "明日コーヒーでも飲みに行きませんか？")   # deu/fra/ita/eng _jpn wording
JA_A3 = ("でも土曜日に話しましょう。", "でも土曜日に行きましょう。")
SPA_T2 = ("¿Podemos hablar mañana?", "¿Vamos a tomar un café mañana?")

T = {  # target side: course -> {line: (old, new)}
 'ara_eg_for_eng': {2: ("نتكلم بكرة؟", "نروح نشرب قهوة بكرة؟"), 3: ("بس نتكلم السبت.", "بس نروح السبت.")},
 'ara_for_eng': {2: ("ممكن نتكلم بكرة؟", "ممكن نروح نشرب قهوة بكرة؟"), 3: ("بس نتكلم السبت.", "بس نروح السبت.")},
 'ara_sy_for_eng': {2: ("فيّنا نحكي بكرا؟", "منروح نشرب قهوة بكرا؟"), 3: ("خلينا نحكي يوم السبت", "خلينا نروح يوم السبت")},
 'bul_for_eng': {2: ("Можем ли да поговорим утре?", "Да отидем ли на кафе утре?"), 3: ("нека поговорим в събота", "нека отидем в събота")},
 'cat_for_eng': {2: ("Podem parlar demà?", "Anem a fer un cafè demà?"), 3: ("Però parlem dissabte.", "Però anem-hi dissabte.")},
 'cat_for_spa': {2: ("Podem parlar demà?", "Anem a fer un cafè demà?"), 3: ("Però parlem el dissabte.", "Però anem-hi el dissabte.")},
 'cym_n_for_eng': {2: ("Fedrwn ni siarad fory?", "Awn ni am goffi fory?"), 3: ("Ond gawn ni siarad ddydd Sadwrn.", "Ond gawn ni fynd ddydd Sadwrn.")},
 'cym_s_for_eng': {2: ("Allwn ni siarad fory?", "Awn ni am goffi fory?"), 3: ("Ond gad i ni siarad… ddydd Sadwrn.", "Ond gad i ni fynd… ddydd Sadwrn.")},
 'dan_for_eng': {2: ("Kan vi tale i morgen?", "Skal vi tage en kop kaffe i morgen?"), 3: ("Men lad os tale på lørdag.", "Men lad os gøre det på lørdag.")},
 'deu_at_for_eng': {2: ("Kennan wir morgen reden?", "Gemma morgen auf an Kaffee?"), 3: ("Oba reden wir am Samstag.", "Oba gemma am Samstag.")},
 'deu_for_eng': {2: ("Können wir uns morgen unterhalten?", "Wollen wir morgen einen Kaffee trinken gehen?"), 3: ("Aber lass uns am Samstag reden.", "Aber lass uns am Samstag gehen.")},
 'ell_for_eng': {2: ("Μπορούμε να μιλήσουμε αύριο;", "Πάμε για καφέ αύριο;"), 3: ("ας μιλήσουμε το Σάββατο", "ας πάμε το Σάββατο")},
 'est_for_eng': {2: ("Kas me saame homme rääkida?", "Kas lähme homme kohvile?"), 3: ("Aga räägime laupäeval.", "Aga lähme laupäeval.")},
 'eus_for_eng': {2: ("Bihar hitz egin dezakegu?", "Bihar kafe bat hartzera joango gara?"), 3: ("Baina hitz egin dezagun larunbatean.", "Baina goazen larunbatean.")},
 'eus_for_spa': {2: ("Bihar hitz egin dezakegu?", "Bihar kafe bat hartzera joango gara?"), 3: ("Baina larunbatean hitz egiten dugu.", "Baina larunbatean joango gara.")},
 'fas_for_eng': {2: ("می‌تونیم فردا حرف بزنیم؟", "فردا بریم قهوه بخوریم؟"), 3: ("ولی بیا شنبه حرف بزنیم.", "ولی بیا شنبه بریم.")},
 'fin_for_eng': {2: ("Voitaisiinko jutella huomenna?", "Käydäänkö huomenna kahvilla?"), 3: ("Mutta puhutaan lauantaina.", "Mutta mennään lauantaina.")},
 'fra_ca_for_eng': {2: ("On peut se parler demain?", "On va prendre un café demain?"), 3: ("Mais on va se parler samedi.", "Mais on va y aller samedi.")},
 'fra_for_eng': {2: ("On peut se parler demain ?", "On va prendre un café demain ?"), 3: ("Mais on se parle samedi.", "Mais on y va samedi.")},
 'gle_for_eng': {2: ("An féidir linn labhairt amárach?", "An rachaimid amach le haghaidh caife amárach?"), 3: ("Ach labhraímis Dé Sathairn.", "Ach téimis Dé Sathairn.")},
 'heb_for_eng': {2: ("אנחנו יכולים לדבר מחר?", "נלך לשתות קפה מחר?"), 3: ("אבל בוא נדבר ביום שבת.", "אבל בוא נלך ביום שבת.")},
 'hin_for_eng': {2: ("क्या हम कल बात कर सकते हैं?", "क्या हम कल कॉफ़ी पीने चलें?"), 3: ("लेकिन शनिवार को बात करते हैं।", "लेकिन शनिवार को चलते हैं।")},
 'hrv_for_eng': {2: ("Možemo li razgovarati sutra?", "Hoćemo li sutra na kavu?"), 3: ("Ali razgovarajmo… u subotu.", "Ali idemo… u subotu.")},
 'hye_for_eng': {2: ("Կարո՞ղ ենք վաղը խոսել։", "Վաղը սուրճ խմելու գնա՞նք։"), 3: ("Բայց եկեք շաբաթ օրը խոսենք։", "Բայց եկեք շաբաթ օրը գնանք։")},
 'isl_for_eng': {2: ("Getum við talað á morgun?", "Eigum við að fara í kaffi á morgun?"), 3: ("En tölum saman á laugardaginn.", "En förum á laugardaginn.")},
 'ita_for_eng': {2: ("Possiamo parlare domani?", "Andiamo a prendere un caffè domani?"), 3: ("Ma parliamo sabato.", "Ma andiamo sabato.")},
 'jpn_for_eng': {2: JA_A2, 3: JA_A3},
 'kor_for_eng': {2: ("내일 얘기할 수 있을까요?", "내일 커피 마시러 갈까요?"), 3: ("그런데 토요일에 얘기해요.", "그런데 토요일에 가요.")},
 'lav_for_eng': {2: ("Vai mēs varētu runāt rīt?", "Vai rīt aiziesim uz kafiju?"), 3: ("Bet parunāsim sestdien.", "Bet aiziesim sestdien.")},
 'lit_for_eng': {2: ("Ar galime pasikalbėti rytoj?", "Ar rytoj einam išgerti kavos?"), 3: ("Bet pasikalbėkime šeštadienį.", "Bet eikime šeštadienį.")},
 'nep_for_eng': {2: ("के हामी भोलि कुरा गर्न सक्छौं?", "के हामी भोलि कफी पिउन जाऔं?"), 3: ("तर शनिबार कुरा गरौं।", "तर शनिबार जाऔं।")},
 'nld_for_eng': {2: ("Kunnen we morgen praten?", "Zullen we morgen koffie gaan drinken?"), 3: ("Maar laten we zaterdag praten.", "Maar laten we zaterdag gaan.")},
 'nor_for_eng': {2: ("Kan vi snakke i morgen?", "Skal vi ta en kaffe i morgen?"), 3: ("Men la oss snakke på lørdag.", "Men la oss gjøre det på lørdag.")},
 'pol_for_eng': {2: ("Czy możemy porozmawiać jutro?", "Pójdziemy jutro na kawę?"), 3: ("Ale porozmawiajmy w sobotę.", "Ale chodźmy w sobotę.")},
 'por_br_for_eng': {2: ("A gente pode falar amanhã?", "Vamos tomar um café amanhã?"), 3: ("Mas a gente fala no sábado.", "Mas a gente vai no sábado.")},
 'por_for_eng': {2: ("Podemos falar amanhã?", "Vamos tomar um café amanhã?"), 3: ("Mas falamos no sábado.", "Mas vamos no sábado.")},
 'ron_for_eng': {2: ("Putem vorbi mâine?", "Mergem mâine la o cafea?"), 3: ("Dar hai să vorbim sâmbătă.", "Dar hai să mergem sâmbătă.")},
 'spa_for_eng': {2: SPA_T2, 3: ("Pero hablamos el sábado.", "Pero vamos el sábado.")},
 'spa_for_jpn': {2: SPA_T2, 3: ("Pero hablemos el sábado.", "Pero vamos el sábado.")},
 'spa_mx_for_eng': {2: ("¿Podemos hablar mañana?", "¿Vamos por un café mañana?"), 3: ("Pero hablemos el sábado.", "Pero vamos el sábado.")},
 'swa_for_eng': {2: ("Tunaweza kuzungumza kesho?", "Twende kunywa kahawa kesho?"), 3: ("Lakini tuzungumze Jumamosi.", "Lakini twende Jumamosi.")},
 'swe_for_eng': {2: ("Kan vi prata imorgon?", "Ska vi gå och ta en kaffe imorgon?"), 3: ("Men vi pratar på lördag.", "Men vi går på lördag.")},
 'tha_for_eng': {2: ("คุยกันพรุ่งนี้ได้ไหมคะ", "พรุ่งนี้ไปกินกาแฟกันไหมคะ"), 3: ("แต่เจอกันวันเสาร์แล้วคุยกันค่ะ", "แต่ไปกันวันเสาร์นะคะ")},
 'tur_for_eng': {2: ("Yarın konuşabilir miyiz?", "Yarın kahve içmeye gidelim mi?"), 3: ("Ama cumartesi konuşalım.", "Ama cumartesi gidelim.")},
 'ukr_for_eng': {2: ("Можемо поговорити завтра?", "Ходімо завтра на каву?"), 3: ("Але давай поговоримо в суботу.", "Але ходімо в суботу.")},
 'zho_for_eng': {2: ("我们明天可以聊吗？", "我们明天去喝咖啡好吗？"), 3: ("不过我们周六聊吧。", "不过我们周六去吧。")},
 'zho_for_jpn': {2: ("我们明天可以聊吗？", "我们明天去喝咖啡好吗？"), 3: ("但是我们星期六聊吧。", "但是我们星期六去吧。")},
}
# Same-language siblings share their sibling's swap.
T['deu_for_jpn'] = T['deu_for_eng']; T['fra_for_jpn'] = T['fra_for_eng']; T['ita_for_jpn'] = T['ita_for_eng']
for c in ['eng_for_ara','eng_for_ben','eng_for_deu','eng_for_fra','eng_for_guj','eng_for_hin','eng_for_ita','eng_for_jpn',
          'eng_for_kor','eng_for_pan','eng_for_por','eng_for_sin','eng_for_spa','eng_for_tam','eng_for_urd','eng_for_zho']:
    T[c] = {2: EN2, 3: EN3}

K = {  # known side for courses whose known language is not English
 'cat_for_spa': {2: ("¿Podemos hablar mañana?", "¿Vamos a tomar un café mañana?"), 3: ("Pero hablemos el sábado.", "Pero vamos el sábado.")},
 'eus_for_spa': {2: ("¿Podemos hablar mañana?", "¿Vamos a tomar un café mañana?"), 3: ("Pero el sábado hablamos.", "Pero el sábado vamos.")},
 'deu_for_jpn': {2: JA_A2, 3: JA_A3}, 'fra_for_jpn': {2: JA_A2, 3: JA_A3}, 'ita_for_jpn': {2: JA_A2, 3: JA_A3}, 'eng_for_jpn': {2: JA_A2, 3: JA_A3},
 'spa_for_jpn': {2: ("明日話せますか？", "明日コーヒーを飲みに行きませんか？"), 3: ("でも土曜日に話しましょう。", "でも土曜日に行きましょう。")},
 'zho_for_jpn': {2: ("明日話せますか？", "明日コーヒーを飲みに行きませんか？"), 3: ("でも土曜日に話しましょう。", "でも土曜日に行きましょう。")},
 'eng_for_ara': {2: ("هل يمكننا التحدّث غدًا؟", "هل نذهب لشرب القهوة غدًا؟"), 3: ("لكن دعنا نتحدّث يوم السبت.", "لكن دعنا نذهب يوم السبت.")},
 'eng_for_ben': {2: ("আমরা কি কাল কথা বলতে পারি?", "কাল কি আমরা কফি খেতে যাব?"), 3: ("কিন্তু চলো শনিবার কথা বলি।", "কিন্তু চলো শনিবার যাই।")},
 'eng_for_deu': {2: ("Können wir uns morgen unterhalten?", "Wollen wir morgen einen Kaffee trinken gehen?"), 3: ("Aber lass uns am Samstag reden.", "Aber lass uns am Samstag gehen.")},
 'eng_for_fra': {2: ("On peut se parler demain ?", "On va prendre un café demain ?"), 3: ("Mais on se parle samedi.", "Mais on y va samedi.")},
 'eng_for_guj': {2: ("શું આપણે કાલે વાત કરી શકીએ?", "શું આપણે કાલે કૉફી પીવા જઈએ?"), 3: ("પણ ચાલો શનિવારે વાત કરીએ.", "પણ ચાલો શનિવારે જઈએ.")},
 'eng_for_hin': {2: ("क्या हम कल बात कर सकते हैं?", "क्या हम कल कॉफ़ी पीने चलें?"), 3: ("पर चलो शनिवार को बात करते हैं।", "पर चलो शनिवार को चलते हैं।")},
 'eng_for_ita': {2: ("Possiamo parlare domani?", "Andiamo a prendere un caffè domani?"), 3: ("Ma parliamo sabato.", "Ma andiamo sabato.")},
 'eng_for_kor': {2: ("내일 이야기할 수 있을까요?", "내일 커피 마시러 갈까요?"), 3: ("하지만 토요일에 이야기해요.", "하지만 토요일에 가요.")},
 'eng_for_pan': {2: ("ਕੀ ਅਸੀਂ ਕੱਲ੍ਹ ਗੱਲ ਕਰ ਸਕਦੇ ਹਾਂ?", "ਕੀ ਅਸੀਂ ਕੱਲ੍ਹ ਕੌਫ਼ੀ ਪੀਣ ਚੱਲੀਏ?"), 3: ("ਪਰ ਆਓ ਸ਼ਨੀਵਾਰ ਨੂੰ ਗੱਲ ਕਰੀਏ।", "ਪਰ ਆਓ ਸ਼ਨੀਵਾਰ ਨੂੰ ਚੱਲੀਏ।")},
 'eng_for_por': {2: ("Podemos falar amanhã?", "Vamos tomar um café amanhã?"), 3: ("Mas vamos falar no sábado.", "Mas vamos no sábado.")},
 'eng_for_sin': {2: ("අපිට හෙට කතා කරන්න පුළුවන්ද?", "අපි හෙට කෝපි බොන්න යමුද?"), 3: ("ඒත් අපි සෙනසුරාදා කතා කරමු.", "ඒත් අපි සෙනසුරාදා යමු.")},
 'eng_for_spa': {2: ("¿Podemos hablar mañana?", "¿Vamos a tomar un café mañana?"), 3: ("Pero hablemos el sábado.", "Pero vamos el sábado.")},
 'eng_for_tam': {2: ("நாளைக்கு பேசலாமா?", "நாளைக்கு காபி குடிக்கப் போகலாமா?"), 3: ("ஆனால் சனிக்கிழமை பேசலாம்.", "ஆனால் சனிக்கிழமை போகலாம்.")},
 'eng_for_urd': {2: ("کیا ہم کل بات کر سکتے ہیں؟", "کیا ہم کل کافی پینے چلیں؟"), 3: ("لیکن چلو ہفتے کو بات کرتے ہیں۔", "لیکن چلو ہفتے کو چلتے ہیں۔")},
 'eng_for_zho': {2: ("我们明天聊好吗？", "我们明天去喝杯咖啡好吗？"), 3: ("不过我们星期六聊吧。", "不过我们星期六去吧。")},
}

def main(snapshot, out):
    sc4 = json.load(open(snapshot)); drafts, problems = [], []
    for course, rows in sorted(sc4.items()):
        for r in rows:
            n = r['sentence_number']
            if r['global_order'] >= 10000:   # recovery rows (deu_at only): English-only, canon re-quote
                if r['global_order'] in (10013, 10014):
                    old, new = (EN2 if n == 1 else EN3)
                    if old not in r['known_text']: problems.append((r['id'], 'known', old)); continue
                    drafts.append({'id': r['id'], 'course': course, 'line': r['global_order'], 'speaker': r['speaker'],
                                   'known_before': r['known_text'], 'known_after': r['known_text'].replace(old, new),
                                   'target_before': r['target_text'], 'target_after': r['target_text']})
                continue
            if n not in (2, 3): continue
            known_swap = K.get(course, {}).get(n) or (EN2 if n == 2 else EN3)
            tgt_swap = T.get(course, {}).get(n)
            rec = {'id': r['id'], 'course': course, 'line': n, 'speaker': r['speaker'],
                   'known_before': r['known_text'], 'target_before': r['target_text'],
                   'target_audio_id': r['target_audio_id'], 'known_audio_id': r['known_audio_id']}
            for side, swap in (('known', known_swap), ('target', tgt_swap)):
                before = r[f'{side}_text']
                if not swap or before.count(swap[0]) != 1:
                    problems.append((r['id'], side, swap and swap[0])); rec[f'{side}_after'] = None; continue
                rec[f'{side}_after'] = before.replace(swap[0], swap[1])
            drafts.append(rec)
    json.dump({'drafts': drafts, 'problems': problems}, open(out, 'w'), ensure_ascii=False, indent=1)
    print(len(drafts), 'rows drafted;', len(problems), 'problems'); [print('PROBLEM', p) for p in problems]

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
