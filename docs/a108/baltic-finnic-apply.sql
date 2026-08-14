-- A-108 Baltic/Finnic apply — fin/est/lav/lit staged pod drafts
-- Gated: asserts before-state and target_text_draft=true on every row, aborts on drift.
-- Preserves target_text_draft = true (never touched).
begin;

create temp table a108_edits(id text primary key, before text, after text, reason text) on commit drop;

insert into a108_edits values
-- FINNISH — register: V for stranger/service-directed solo lines, matching the course's own
-- service scenes (2/4 renders the identical English with V) and 15/9 + 16/1's V thread.
('fin_for_eng:pod-0:SC15-S002',
 'Voitko kertoa, paljonko tuo maksaa?',
 'Voitteko kertoa, paljonko tuo maksaa?',
 'register T->V: asking a vendor a price; course renders identical English at 2/4 as "Voitteko kertoa"'),
('fin_for_eng:pod-0:SC16-S002',
 'Puhuit hieman liian nopeasti, joten en ole varma, ymmärsinkö.',
 'Puhuitte hieman liian nopeasti, joten en ole varma, ymmärsinkö.',
 'register T->V: adjacent 16/1 "jos voitte puhua hitaasti" and 15/9 "teidan kieltanne" address the same person with V'),
('fin_for_eng:pod-0:SC21-S004',
 'Voitko kertoa, missä vessa on?',
 'Voitteko kertoa, missä vessa on?',
 'register T->V: asking venue staff for the toilet; same construction as 2/4'),
('fin_for_eng:pod-0:SC21-S007',
 'Voitko sanoa sen uudelleen?',
 'Voitteko sanoa sen uudelleen?',
 'register T->V: same stranger thread as 21/4; 21/11-13 in the scene are already V'),

-- LATVIAN — gender (Learner voice = lv-LV-EveritaNeural, female) and register
('lav_for_eng:pod-0-unrecorded:SC16-S002',
 'Tu runāji nedaudz par ātru, tāpēc es neesmu drošs, vai es sapratu.',
 'Tu runāji nedaudz par ātru, tāpēc es neesmu droša, vai es sapratu.',
 'gender: speaker is Learner, cast Everita (female) -> drosa'),
('lav_for_eng:pod-0-unrecorded:SC16-S010',
 'Piedod, man nav skaidras naudas.',
 'Atvainojiet, man nav skaidras naudas.',
 'register T->V: addressed to a cashier (follows 16/9 "we only take cash"); 16/6 in the same scene already uses V "jums"'),
('lav_for_eng:pod-0-unrecorded:SC18-S009',
 'Piedod, mans dēls pazaudēja savu biļeti.',
 'Atvainojiet, mans dēls pazaudēja savu biļeti.',
 'register T->V: addressed to transport staff; 18/2-18/3 in the same scene already use V "jums"'),

-- LITHUANIAN — gender (Learner voice = lt-LT-OnaNeural, female)
('lit_for_eng:pod-0-unrecorded:SC16-S002',
 'Tu kalbėjai truputį per greitai, tad nesu tikras, ar supratau.',
 'Tu kalbėjai truputį per greitai, tad nesu tikra, ar supratau.',
 'gender: speaker is Learner, cast Ona (female) -> tikra'),
('lit_for_eng:pod-0-unrecorded:SC18-S007',
 'Ar tai teisinga? Ar aš teisus?',
 'Ar tai teisinga? Ar aš teisi?',
 'gender: speaker is Learner, cast Ona (female) -> teisi'),
('lit_for_eng:pod-0-unrecorded:SC22-S001',
 'Ar neprieštarautum, jei pabandyčiau pasipraktikuoti kalbėti su tavimi lietuviškai? Aš mokausi dar neilgai ir vis dar jaučiuosi šiek tiek nervingas kalbėdamas su kitais žmonėmis.',
 'Ar neprieštarautum, jei pabandyčiau pasipraktikuoti kalbėti su tavimi lietuviškai? Aš mokausi dar neilgai ir vis dar jaučiuosi šiek tiek nervinga kalbėdama su kitais žmonėmis.',
 'gender: speaker is Learner, cast Ona (female) -> nervinga kalbedama'),
('lit_for_eng:pod-0-unrecorded:SC22-S005',
 'Taip, ačiū. Lengviau kalbėti tik su vienu žmogumi. Vis dėlto šiek tiek sunku sugalvoti, ką pasakyti. Nesu tikras, ką sakyti, bet jaučiu, kad galiu kalbėti pakankamai, kad pradėčiau pokalbius.',
 'Taip, ačiū. Lengviau kalbėti tik su vienu žmogumi. Vis dėlto šiek tiek sunku sugalvoti, ką pasakyti. Nesu tikra, ką sakyti, bet jaučiu, kad galiu kalbėti pakankamai, kad pradėčiau pokalbius.',
 'gender: speaker is Learner, cast Ona (female) -> tikra');

-- GATE 1: every id must exist, be a draft, and match its recorded before-state.
do $$
declare bad int;
begin
  select count(*) into bad
  from a108_edits e
  left join listening_pod_sentences s
    on s.id = e.id and s.target_text = e.before and s.target_text_draft
  where s.id is null;
  if bad > 0 then
    raise exception 'A-108 ABORT: % row(s) failed the before-state / draft-flag assertion', bad;
  end if;
end $$;

-- GATE 2: nothing may be a no-op.
do $$
declare bad int;
begin
  select count(*) into bad from a108_edits where before = after;
  if bad > 0 then raise exception 'A-108 ABORT: % no-op edit(s)', bad; end if;
end $$;

update listening_pod_sentences s
set target_text = e.after
from a108_edits e
where s.id = e.id;

-- GATE 3: exactly 11 rows written, all still drafts.
do $$
declare n int;
begin
  select count(*) into n
  from a108_edits e join listening_pod_sentences s on s.id = e.id
  where s.target_text = e.after and s.target_text_draft;
  if n <> 11 then raise exception 'A-108 ABORT: post-write verification saw % of 11', n; end if;
end $$;

commit;
