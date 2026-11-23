# step 3 findings
## check 1 — see ops/cym-for-kor/step3/changes-check1.json (6 changes)
Considered but held for second opinion: 상관있어? (190/281/653/667), 260 아이디어가 전혀 없어, 629 우유와 함께 하지만, 624 근사할 거예요, 491 방법을 사랑해.
## audio reuse (read 23 Nov via GET :3470/api/production/<course>/seeds?status=all, one call per course)
cym_nv2_for_eng S1001-S1668 (= HC 1-668, Welsh identical to draft 668/668): seeds with t1+t2 audio 641, any 665; LEGOs 1541, all 1541 with t1+t2; practice phrases 10,222 — 4,312 t1+t2, 8,406 at least one target voice; 151 seeds fully voiced (seed+every LEGO+every phrase both voices); 13 weave-dropped seeds have no LEGOs.
cym_n_for_eng (668 seeds, older Welsh): adds only 6 phrases beyond nv2 (8,412 with any target voice in either). Counts are slot links (audio id present), not clip-alive checks.
## check 3 — blind back-translation (#782·AK, sonnet, given Korean only; output ops/cym-for-kor/step3/backtranslation.json)
668/668 translated; register tags 636 B / 19 P / 12 H / 1 B-on-a-haeyo-seed (414, 우리 → fixed to 저희 in check 1).
Drift found: 182 (어디에서 = where; already fixed in check 1), 299 반 → read as "a round"/half (fix 절반, eng_for_kor S0299).
Systematic: Welsh conditional byddai/basai main clauses (225, 229, 317, 352, 415, 426, 427, 581) back-translate as plain future/real conditional — already flagged LOST_DISTINCTION in step 1; held as principle question for Kai (mark with -ㄹ 텐데?).
662 여러분은 그걸 해요 back-translates "you do it" — kept (note: hi = the language, no other Welsh reading in 656-668 run).
## check 2 — sol second opinion dispatched twice (#781·AK, #783·AK): both answered "ACCEPTED ... pending" and neither ever appeared as a job; no refusal text reached the parent conversation. Re-run as same-family Claude (opus, #784·AK).
