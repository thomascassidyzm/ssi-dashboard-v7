-- A-108: T-V register + speaker-gender repair on staged pod drafts
-- Courses: hrv_for_eng, bul_for_eng, ukr_for_eng, pol_for_eng
-- Gated: per-row before-state assertion; aborts on any drift.
-- Preserves target_text_draft = true (no PATCH route, no flag change).
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE a108_changes(id text primary key, before text, after text, reason text) ON COMMIT DROP;

INSERT INTO a108_changes VALUES
-- ============ hrv_for_eng ============
('hrv_for_eng:pod-0-unrecorded:SC06-S001',
 'Oprostite. Dobar dan. Kako se zovete?',
 'Oprosti. Dobar dan. Kako se zoveš?',
 'register: scene 6 is a peer first-meeting; all ten released lines in the scene are T (A ti?, Odakle si?, nisam te razumio). The lone V opener was the outlier.'),
('hrv_for_eng:pod-0-unrecorded:SC21-S008',
 'Da, rekao sam da je tamo.',
 'Da, rekla sam da je tamo.',
 'gender: Learner is voiced by EXAVITQu4vr4xnSDxMaL (Sarah, f) -> feminine l-participle.'),
('hrv_for_eng:pod-0-unrecorded:SC22-S001',
 'Biste li imali nešto protiv da pokušam vježbati hrvatski s vama? Ne učim jako dugo, i još uvijek se osjećam malo nervozno kad govorim s drugim ljudima.',
 'Bi li imao nešto protiv da pokušam vježbati hrvatski s tobom? Ne učim jako dugo, i još uvijek se osjećam malo nervozno kad govorim s drugim ljudima.',
 'register: scene 22 addressee is Friend (peer); the released remainder of the scene is T (Govorim li ti, tvoju pomoć, s tobom). Participle imao is masculine to agree with Friend, voiced hr-HR-SreckoNeural (m).'),

-- ============ bul_for_eng ============
('bul_for_eng:pod-0-unrecorded:SC02-S004',
 'Можеш ли да ми кажеш колко е далече до града?',
 'Можете ли да ми кажете колко е далече до града?',
 'register: scene 2, addressed to a stranger on a bus; the released opener in the same scene is V (Извинете).'),
('bul_for_eng:pod-0-unrecorded:SC03-S007',
 'Да, искаш ли менюто?',
 'Да, искате ли менюто?',
 'register: barista to customer, service scene 3 -> V.'),
('bul_for_eng:pod-0-unrecorded:SC03-S009',
 'Ето кафето ти.',
 'Ето кафето ви.',
 'register: barista to customer, service scene 3 -> V.'),
('bul_for_eng:pod-0-unrecorded:SC11-S012',
 'Написано е на картичката за посрещане в стаята ти. Приятен престой.',
 'Написано е на картичката за посрещане в стаята ви. Приятен престой.',
 'register: receptionist to guest, service scene 11 -> V. Every other released receptionist line in the scene is V.'),
('bul_for_eng:pod-0-unrecorded:SC12-S001',
 'Добро утро. Не се чувствам много добре - можеш ли да ми препоръчаш нещо?',
 'Добро утро. Не се чувствам много добре - можете ли да ми препоръчате нещо?',
 'register: customer to pharmacist, service scene 12 -> V. The pharmacist replies with V (Какви са симптомите ви?).'),
('bul_for_eng:pod-0-unrecorded:SC12-S004',
 'Опитай парацетамол за главоболието, и тези таблетки за гърло.',
 'Опитайте парацетамол за главоболието, и тези таблетки за гърло.',
 'register: pharmacist to customer, service scene 12 -> V imperative.'),
('bul_for_eng:pod-0-unrecorded:SC13-S002',
 'Да, около десет минути пеша е. Продължи направо по този път.',
 'Да, около десет минути пеша е. Продължете направо по този път.',
 'register: local to a tourist stranger, scene 13 -> V imperative. The same speaker''s released line s13.5 already uses V (вземете).'),
('bul_for_eng:pod-0-unrecorded:SC15-S002',
 'Можеш ли да ми кажеш колко струва това?',
 'Можете ли да ми кажете колко струва това?',
 'register: practice line, asking a shop what something costs -> service act. hrv and ukr render the same line V.'),
('bul_for_eng:pod-0-unrecorded:SC17-S002',
 'Искаш ли да платиш в брой, с карта, или да го начислим към стаята?',
 'Искате ли да платите в брой, с карта, или да го начислим към стаята?',
 'register: staff-voiced payment question to a hotel guest -> V.'),
('bul_for_eng:pod-0-unrecorded:SC17-S004',
 'Искаш ли да платиш в брой, с карта, или на стаята?',
 'Искате ли да платите в брой, с карта, или на стаята?',
 'register: staff-voiced payment question to a hotel guest -> V.'),
('bul_for_eng:pod-0-unrecorded:SC17-S005',
 'Искаше ли да платиш в брой или с карта?',
 'Искахте ли да платите в брой или с карта?',
 'register: staff-voiced payment question to a hotel guest -> V.'),
('bul_for_eng:pod-0-unrecorded:SC21-S004',
 'Можеш ли да ми кажеш къде е тоалетната?',
 'Можете ли да ми кажете къде е тоалетната?',
 'register: asking staff or a stranger for the toilet -> service act. hrv and ukr render the same line V.'),
('bul_for_eng:pod-0-unrecorded:SC21-S011',
 'Искаш ли да поръчаш напитки?',
 'Искате ли да поръчате напитки?',
 'register: staff-voiced order question to a customer -> V.'),
('bul_for_eng:pod-0-unrecorded:SC21-S012',
 'Искаш ли първо да поръчаш напитки?',
 'Искате ли първо да поръчате напитки?',
 'register: staff-voiced order question to a customer -> V.'),
('bul_for_eng:pod-0-unrecorded:SC21-S013',
 'Искаше ли първо нещо за пиене?',
 'Искахте ли първо нещо за пиене?',
 'register: staff-voiced order question to a customer -> V.'),
('bul_for_eng:pod-0-unrecorded:SC16-S002',
 'Говори малко прекалено бързо, затова не съм сигурен дали разбрах.',
 'Говори малко прекалено бързо, затова не съм сигурна дали разбрах.',
 'gender: Learner is voiced bg-BG-KalinaNeural (f) -> сигурна.'),
('bul_for_eng:pod-0-unrecorded:SC18-S007',
 'Това правилно ли е? Прав ли съм?',
 'Това правилно ли е? Права ли съм?',
 'gender: Learner is female -> права.'),
('bul_for_eng:pod-0-unrecorded:SC19-S001',
 'Това ме прави щастлив.',
 'Това ме прави щастлива.',
 'gender: Learner is female -> щастлива.'),
('bul_for_eng:pod-0-unrecorded:SC19-S002',
 'Това ме кара да се чувствам малко притеснен.',
 'Това ме кара да се чувствам малко притеснена.',
 'gender: Learner is female -> притеснена.'),
('bul_for_eng:pod-0-unrecorded:SC22-S001',
 'Ще имаш ли нещо против, ако се опитам да упражнявам говоренето на български с теб? Не уча от много дълго време, и все още се чувствам малко нервен да говоря с други хора.',
 'Ще имаш ли нещо против, ако се опитам да упражнявам говоренето на български с теб? Не уча от много дълго време, и все още се чувствам малко нервна да говоря с други хора.',
 'gender: Learner is female -> нервна. Register already T and correct for the peer Friend scene.'),

-- ============ ukr_for_eng ============
('ukr_for_eng:pod-0-unrecorded:SC07-S004',
 'Я б хотів великий, будь ласка. З вівсяним молоком, якщо є.',
 'Я б хотіла великий, будь ласка. З вівсяним молоком, якщо є.',
 'gender: Customer 1 is voiced uk-UA-PolinaNeural (f) -> хотіла.'),
('ukr_for_eng:pod-0-unrecorded:SC07-S006',
 'Я б хотів на винос, будь ласка.',
 'Я б хотіла на винос, будь ласка.',
 'gender: Customer 1 is voiced uk-UA-PolinaNeural (f) -> хотіла.'),
('ukr_for_eng:pod-0-unrecorded:SC16-S002',
 'Ви сказали трохи занадто швидко, тому я не впевнений, чи зрозумів.',
 'Ви сказали трохи занадто швидко, тому я не впевнена, чи зрозуміла.',
 'gender: Learner is voiced uk-UA-PolinaNeural (f) -> впевнена, зрозуміла.'),
('ukr_for_eng:pod-0-unrecorded:SC18-S007',
 'Це правильно? Я правий?',
 'Це правильно? Я права?',
 'gender: Learner is female -> права.'),
('ukr_for_eng:pod-0-unrecorded:SC19-S001',
 'Це робить мене щасливим.',
 'Це робить мене щасливою.',
 'gender: Learner is female -> щасливою.'),
('ukr_for_eng:pod-0-unrecorded:SC19-S003',
 'Коли ти говориш швидко, я почуваюся дурним.',
 'Коли ти говориш швидко, я почуваюся дурною.',
 'gender: Learner is female -> дурною.'),
('ukr_for_eng:pod-0-unrecorded:SC19-S010',
 'Я б хотів дві кульки морозива, будь ласка.',
 'Я б хотіла дві кульки морозива, будь ласка.',
 'gender: Learner is female -> хотіла.'),
('ukr_for_eng:pod-0-unrecorded:SC21-S008',
 'Так, я сказав, що це он там.',
 'Так, я сказала, що це он там.',
 'gender: Learner is female -> сказала.'),

-- ============ pol_for_eng ============
('pol_for_eng:pod-0-unrecorded:SC02-S004',
 'Czy może mi Pan powiedzieć, jak daleko jest do miasta?',
 'Czy może mi Pani powiedzieć, jak daleko jest do miasta?',
 'gender: the honorific names the addressee, and the Passenger in this pod is voiced 1b12d5daee6b (Aleksandra, f) -> Pani. Register V is correct for the stranger scene.'),
('pol_for_eng:pod-0-unrecorded:SC08-S011',
 'Będziesz dzisiaj jeść?',
 'Czy będą Państwo dzisiaj jeść?',
 'register: bartender to customers, service scene 8 -> V. Państwo is the gender-free plural form and the table holds three customers.'),
('pol_for_eng:pod-0-unrecorded:SC12-S004',
 'Spróbuj paracetamolu na ból głowy i tych pastylek na gardło.',
 'Proszę spróbować paracetamolu na ból głowy i tych pastylek na gardło.',
 'register: pharmacist to customer, service scene 12 -> V. Proszę + infinitive is the gender-free polite imperative.'),
('pol_for_eng:pod-0-unrecorded:SC13-S002',
 'Tak, to około dziesięć minut pieszo. Idź prosto tą drogą.',
 'Tak, to około dziesięć minut pieszo. Proszę iść prosto tą drogą.',
 'register: local to a tourist stranger, scene 13 -> V imperative.'),
('pol_for_eng:pod-0-unrecorded:SC13-S005',
 'Na drugim rondzie skręć w pierwszy zjazd.',
 'Na drugim rondzie proszę skręcić w pierwszy zjazd.',
 'register: local to a tourist stranger, scene 13 -> V imperative.'),
('pol_for_eng:pod-0-unrecorded:SC17-S002',
 'Chcesz zapłacić gotówką, kartą, czy doliczyć do pokoju?',
 'Czy chcą Państwo zapłacić gotówką, kartą, czy doliczyć do pokoju?',
 'register: staff-voiced payment question to a hotel guest -> V. Państwo matches the plural guest party (możemy in the reply) and carries no gender.'),
('pol_for_eng:pod-0-unrecorded:SC17-S004',
 'Czy wolisz zapłacić gotówką, kartą, czy doliczyć do pokoju?',
 'Czy wolą Państwo zapłacić gotówką, kartą, czy doliczyć do pokoju?',
 'register: staff-voiced payment question to a hotel guest -> V.'),
('pol_for_eng:pod-0-unrecorded:SC17-S005',
 'Chcesz zapłacić gotówką czy kartą?',
 'Czy chcą Państwo zapłacić gotówką czy kartą?',
 'register: staff-voiced payment question to a hotel guest -> V.'),
('pol_for_eng:pod-0-unrecorded:SC22-S001',
 'Czy mogę spróbować poćwiczyć mówienie po polsku z Panem? Nie uczę się bardzo długo i wciąż czuję się trochę zdenerwowany, mówiąc z innymi ludźmi.',
 'Czy mogę spróbować poćwiczyć mówienie po polsku z tobą? Nie uczę się bardzo długo i wciąż czuję się trochę zdenerwowana, mówiąc z innymi ludźmi.',
 'register + gender: scene 22 addressee is Friend (peer) and the released remainder of the scene is T (ciebie, radzisz sobie, tobą); Learner is voiced 1b12d5daee6b (Aleksandra, f) -> zdenerwowana.'),
('pol_for_eng:pod-0-unrecorded:SC22-S002',
 'Jasne, żaden problem. Wydaje się, że mówi Pan bardzo dobrze. Łatwo Pana rozumiem.',
 'Jasne, żaden problem. Wydaje się, że mówisz bardzo dobrze. Łatwo cię rozumiem.',
 'register: Friend speaking to the Learner in the peer scene; the released remainder of the scene is T.'),
('pol_for_eng:pod-0-unrecorded:SC16-S002',
 'Mówiłeś trochę za szybko, więc nie jestem pewien, czy zrozumiałem.',
 'Mówiłeś trochę za szybko, więc nie jestem pewna, czy zrozumiałam.',
 'gender: Learner is voiced 1b12d5daee6b (Aleksandra, f) -> pewna, zrozumiałam. Mówiłeś is addressee-marked and left alone.'),
('pol_for_eng:pod-0-unrecorded:SC19-S001',
 'To sprawia, że jestem szczęśliwy.',
 'To sprawia, że jestem szczęśliwa.',
 'gender: Learner is female -> szczęśliwa.'),
('pol_for_eng:pod-0-unrecorded:SC19-S002',
 'To sprawia, że czuję się trochę zmartwiony.',
 'To sprawia, że czuję się trochę zmartwiona.',
 'gender: Learner is female -> zmartwiona.'),
('pol_for_eng:pod-0-unrecorded:SC21-S008',
 'Tak, powiedziałem, że to tam.',
 'Tak, powiedziałam, że to tam.',
 'gender: Learner is female -> powiedziałam.'),
('pol_for_eng:pod-0-unrecorded:SC22-S005',
 'Tak, dziękuję. Łatwiej jest rozmawiać tylko z jedną osobą. Trochę trudno jest wymyślić, co powiedzieć. Nie jestem pewien, co powiedzieć, ale czuję, że mówię wystarczająco dobrze, żeby zacząć prowadzić rozmowy.',
 'Tak, dziękuję. Łatwiej jest rozmawiać tylko z jedną osobą. Trochę trudno jest wymyślić, co powiedzieć. Nie jestem pewna, co powiedzieć, ale czuję, że mówię wystarczająco dobrze, żeby zacząć prowadzić rozmowy.',
 'gender: Learner is female -> pewna.');

-- Gate 1: every target row must exist, be a draft, and match its recorded before-state.
DO $$
DECLARE missing int; notdraft int; drifted int; n int;
BEGIN
  SELECT count(*) INTO n FROM a108_changes;
  SELECT count(*) INTO missing FROM a108_changes c
    WHERE NOT EXISTS (SELECT 1 FROM listening_pod_sentences s WHERE s.id = c.id);
  SELECT count(*) INTO notdraft FROM a108_changes c
    JOIN listening_pod_sentences s ON s.id = c.id WHERE s.target_text_draft IS NOT TRUE;
  SELECT count(*) INTO drifted FROM a108_changes c
    JOIN listening_pod_sentences s ON s.id = c.id WHERE s.target_text <> c.before;
  RAISE NOTICE 'a108: % changes staged; missing=% notdraft=% drifted=%', n, missing, notdraft, drifted;
  IF missing > 0 OR notdraft > 0 OR drifted > 0 THEN
    RAISE EXCEPTION 'A-108 ABORT: before-state gate failed (missing=% notdraft=% drifted=%)', missing, notdraft, drifted;
  END IF;
  IF EXISTS (SELECT 1 FROM a108_changes WHERE after = before) THEN
    RAISE EXCEPTION 'A-108 ABORT: a staged change is a no-op';
  END IF;
  IF EXISTS (SELECT 1 FROM a108_changes WHERE after ~ '[/()\[\]{}]') THEN
    RAISE EXCEPTION 'A-108 ABORT: a replacement value carries an annotation mark';
  END IF;
END $$;

-- Apply. target_text_draft is untouched, so it stays true.
UPDATE listening_pod_sentences s
   SET target_text = c.after
  FROM a108_changes c
 WHERE s.id = c.id
   AND s.target_text = c.before
   AND s.target_text_draft IS TRUE;

-- Gate 2: exactly the staged rows must now carry the after-state, and all must still be drafts.
DO $$
DECLARE applied int; n int; stillraft int;
BEGIN
  SELECT count(*) INTO n FROM a108_changes;
  SELECT count(*) INTO applied FROM a108_changes c
    JOIN listening_pod_sentences s ON s.id = c.id WHERE s.target_text = c.after;
  SELECT count(*) INTO stillraft FROM a108_changes c
    JOIN listening_pod_sentences s ON s.id = c.id WHERE s.target_text_draft IS TRUE;
  RAISE NOTICE 'a108: applied=%/% still_draft=%/%', applied, n, stillraft, n;
  IF applied <> n OR stillraft <> n THEN
    RAISE EXCEPTION 'A-108 ABORT: post-state gate failed (applied=%/% still_draft=%/%)', applied, n, stillraft, n;
  END IF;
END $$;
