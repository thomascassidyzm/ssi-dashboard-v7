// Fan-out for the A-135 adversarial refutation. Posts one worker per axis.
const CWD = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/wt-a135';
const PARENT = '05b5db54-aacc-4e20-92c3-1cc8cb9ccd9c';
const TOKEN = process.env.CSTOK;

const PRE = `You are an ADVERSARIAL REFUTER on plate A-135, working for the lead refuter (this is one axis of a larger refutation). Work in ${CWD} on branch fix/jpn-paren-kor-english-2026-08-17.

HARD CONSTRAINTS — violating any of these ruins the plate:
- DO NOT git commit, git add, or git push. Nothing.
- DO NOT write to the database. Use docs/a135-jpn-paren-kor-2026-08-17/jrefute-q.cjs ONLY (node jrefute-q.cjs "<sql>", set env JSON=1 for json output) — it wraps every statement in a READ ONLY transaction. Do not use q.cjs or q2.cjs and do not open your own pg client.
- DO NOT render or generate audio, and do not call queue-audio-pass.
- Write ONLY files under docs/a135-jpn-paren-kor-2026-08-17/ whose names start with the prefix you are given. Other agents own every other file there — do not touch, move or overwrite anything else, in particular anything starting adj-, refute-, census-, kor-, or jrefute- other than your own prefix.

CONTEXT. Seven Japanese-known courses (deu/eng/fra/ita/por/spa/zho _for_jpn), five of them LIVE BETA, carry the author's own grammar notes inside learner-facing known text: 「行く（不定詞）」, 「手伝う（ayudar三人称過去接続法）」. They are not only printed, they are SPOKEN by the TTS inside the prompt clip. A prior adjudicator (worker #880) classified all 1,423 affected rows across three surfaces and produced a plan: 465 strip, 213 rewrite, 21 partial, 724 hold. Your job is to try to BREAK that plan, not to bless it.

Files to read (all in docs/a135-jpn-paren-kor-2026-08-17/):
- adj-buckets.md — #880's written adjudication, its decision rule and appendices (163KB — read the head, then the sections you need)
- adj-plan.json — array of 1423 objects: {table, phrase_role, course_code, seed_number, row_key, row_uuid, old_known_text, new_known_text, target_text, bucket, action (strip|rewrite|partial|hold), hold_reason, hold_kind, notes, paren_reasons[], has_clip, clip_id, surface (known_text|card_tile|component_row_latent), needs_author_check}
- census-paren-rows.json, census-component-tiles.json — the raw census, taken before anything moved
- adj-collisions.json, adj-tile-collisions.json — #880's own ZUT analysis
- jrefute-corpus.json — the lead's dump of every row in these courses: [{tbl, row_uuid, course_code, seed_number, known_text, target_text, phrase_role, known_audio_id}]

Facts already established by the lead, NOT up for re-derivation:
- card_tile and component_row_latent plan entries reuse the PARENT lego's row_uuid, so row_uuid is NOT unique across the plan — always key on (row_uuid, surface).
- Only surface=known_text rows are learner PROMPTS. Component-role phrase rows are never played and never bundled (ssi-learning-app api/courses/[code]/cycles.ts ~line 148 and bundle.ts BUNDLE_PHRASE_ROLES = build|use|practice|eternal_eligible) — but the code comment says component rows still render as visual tiles.
- On the strict production prompt surface the lead re-derived the post-edit ZUT collision set independently and #880's 169-row hold set covers it with zero uncovered collisions. Do not redo axis 2.

METHOD RAILS you are judging against:
- ZUT: one known prompt -> exactly one target form, per course.
- The known side is a CONTROLLED LANGUAGE: never use known-language words or structures the learner has not been given at or before that row's seed.
- A debut must hand the learner a producible intention, never a grammar label.

HONESTY RULE (Tom, absolute): state your sample sizes explicitly. An extrapolation is NOT a census and must not be written as one. If you cannot judge something — a Japanese family you are unsure of, a query that would not run — report it as an EXPLICIT GAP rather than passing it. Default to REFUTED when uncertain: a wrong "looks fine" ships a defect to five live beta courses, a wrong "refuted" costs one review round. Do not be agreeable, and do not re-narrate the proposal back.

YOUR OUTPUT: (1) a findings write-up in your markdown file, (2) a JSON array of per-row judgements in your json file:
[{row_uuid, surface, proposed_action, verdict: "ok"|"change"|"refuted", axis, reason, proposed_alternative}]
covering every row you ACTUALLY judged (not rows you did not look at). Your final chat message must LEAD with: your verdict for this axis, how many rows you judged out of how many in scope, and the counts you would refute / change. Then the specific defects, most serious first, each naming concrete row_key / course / seed / old text / new text.

YOUR SPECIFIC TASK:
`;

const TASKS = [
  {
    label: 'a135-refute-axis1-rewrites',
    prefix: 'jrefute-a1-',
    task: `AXIS 1 — THE 213 REWRITES ARE NEW AUTHORED JAPANESE AND THEY ARE THE RISKIEST THING IN THIS PLAN.
A "strip" only removes text; a "rewrite" puts Japanese in front of a learner that no author has ever spoken. Filter adj-plan.json to action="rewrite" (213 rows). For EVERY rewrite row check three things:
(a) MEANING — does the new known_text still determine the target_text? e.g. 「始める（一人称）」→「始める（私が）」 for target "anfange" is meant to say 1sg. Does it? Does it lose or add anything (aspect, politeness, transitivity, animacy)?
(b) CONTROLLED-LANGUAGE DEBUT — is every piece of the new Japanese ALREADY GIVEN to the learner at or before that row's seed_number, in that same course? This is the check that matters most and it is scriptable: for each new token/marker introduced by the rewrite (e.g. 私が, 彼・彼女は, 君は, 私たちが, あなたが, 彼らは), find the EARLIEST seed in that course where that exact string appears in a served known_text (course_legos, or course_practice_phrases with phrase_role in build/use) — use jrefute-corpus.json for this. If the earliest appearance is LATER than the row's seed, the rewrite introduces unseen known-side vocabulary at that row and you must REFUTE it, naming the debut seed. Report the debut seed for every marker family in every course as a table.
(c) ELICITATION DRIFT — did the rewrite silently change WHICH target form the prompt elicits? Watch especially the ones where #880 mapped a grammar person label onto a pronoun marker but the target is not actually that person, and where 3人称 was rendered 「彼・彼女は」 (which fixes a gender the target may not fix) or where a subject marker が was used where は/を would be right for the argument role.
Also flag any rewrite whose new_known_text DUPLICATES an existing known_text in the same course with a different target — the lead's ZUT pass covers the production surface, so you are looking for the subtler case: a rewrite that makes two prompts near-identical to a learner's eye even if not byte-identical.
If you cannot check all 213, take a STRATIFIED sample across all seven courses and across every distinct rewrite family (group by the notes field / the paren string being replaced), and SAY your sample size and how you stratified. Report every rewrite you would reject, with the seed its vocabulary actually debuts at.
Files: docs/a135-jpn-paren-kor-2026-08-17/jrefute-a1-rewrites.md and jrefute-a1-rows.json.`,
  },
  {
    label: 'a135-refute-axis3-buckets',
    prefix: 'jrefute-a3-',
    task: `AXIS 3 — THE BUCKET BOUNDARY. #880's rule is "message or form" plus a producibility test, and it explicitly OVERRULES the brief on two families. Pressure-test the boundary in BOTH directions.
(i) THE TWO OVERRULES. #880 calls 「（君は・丁寧）」 and 「（彼女は・私に）」 pure CONTENT rather than MIXED (its reasoning is in adj-buckets.md, "Two places where I differ from the brief"). It argues 丁寧 in 「～したいですか（君は・丁寧）」→gostarias de is the softened request, not addressee register. Attack that: pull every row in every course whose parenthetical contains 丁寧, 口語, 改まった, or a register word, look at the actual target_text, and decide whether 丁寧 is (a) naming the message, (b) naming the target's morphology, or (c) doing both. If register is genuinely metalinguistic to the learner — a tag they cannot act on without knowing what "polite form" means — say so and say what should happen instead.
(ii) THE 465 STRIPS THAT MAY BE LOAD-BEARING CONTENT. Go through every distinct parenthetical string in the strip set and hunt for ones where the parenthetical is naming the MESSAGE and the strip therefore deletes meaning the learner needs. Pay particular attention to these families, several of which could be naming the message rather than the form: 希望, 状態, 強調, 理由, 条件, 期待, 比較, 本当, 一般的に, 時間表現. For each, read the actual target_text of the rows carrying it and decide.
(iii) 疑問 AND 否定 SPECIFICALLY. A question marker or a negation marker may be the ONLY thing telling the learner which target form to produce — 「問題（否定）」→"kein Problem" vs 「問題」→"problem" is a meaning difference, not a form difference. Find every strip row whose parenthetical contains 疑問, 否定, 肯定, or a negation/interrogative cue and judge each one; report any where stripping changes what the learner would say.
Report every strip you would reject as load-bearing, with course, seed, row_key, old text and the target it elicits, and give the alternative you would use (rewrite to what Japanese, or hold).
Files: docs/a135-jpn-paren-kor-2026-08-17/jrefute-a3-buckets.md and jrefute-a3-rows.json.`,
  },
  {
    label: 'a135-refute-axis4-keeps',
    prefix: 'jrefute-a4-',
    task: `AXIS 4 — THE 519 "KEEP, CONTENT, NO EDIT NEEDED" ROWS. Filter adj-plan.json to hold_kind="keep_content_no_edit_needed" (519 rows). These stay exactly as they are, which means the learner keeps SEEING and, where there is a clip, HEARING a parenthetical inside the prompt.
Group them by parenthetical family and for each family apply the severity test the plate is actually run on: would the learner NOTICE it, and would it DERAIL them? The distinction that matters: a person marker like （彼らは） is spoken as natural Japanese and reads as part of the prompt, whereas a tag like （丁寧） is spoken as a metalinguistic LABEL — a word about the language rather than a word of the message — even though #880 classed it as content. #880 itself concedes register "is metalinguistic in form" and chose not to fold it in; decide whether that concession should have been an edit.
For every family you keep, say why. For every family you think should have been an edit, name it, give the row count, give example rows (course/seed/row_key/known_text/target_text), say whether those rows have a live clip (has_clip in the plan), and say what the edit should be.
Also check the mechanical question: among the 519, how many are actually spoken — join to the clip data (has_clip) and to course_audio to see whether the parenthetical is inside the rendered text. A kept parenthetical with no clip is a printing defect; a kept parenthetical with a clip is a printing AND a speaking defect, and they should not be counted together.
Files: docs/a135-jpn-paren-kor-2026-08-17/jrefute-a4-keeps.md and jrefute-a4-rows.json.`,
  },
  {
    label: 'a135-refute-axis5-broken-rows',
    prefix: 'jrefute-a5-',
    task: `AXIS 5 — THE 36 ROWS NOBODY HAS LOOKED AT. Filter adj-plan.json to hold_kind in ("blocked_no_gloss_to_fall_back_on" [31 rows], "blocked_row_corrupt" [3 rows], "blocked_wrong_language" [2 rows]). That is 36 rows and your scope is ALL of them, individually — no sampling, this is a census.
For each row: pull it live from the DB with jrefute-q.cjs (course_legos or course_practice_phrases by id), print known_text, target_text, seed_number, phrase_role, status, known_audio_id, and the linked course_audio row's text and voice if there is one. Then say IN PLAIN WORDS what is actually wrong with it.
- "no gloss to fall back on" means the ENTIRE known_text is a parenthetical or reduces to nothing when stripped — so what does the learner currently see, and is it usable at all?
- "corrupt" and "wrong language" in a LIVE BETA COURSE are their own defect, and they may be worse than the one this plate is fixing. Nobody has looked at them. Say plainly whether each is a live learner-facing defect right now, what the learner sees and hears, and whether it should be escalated as its own fix rather than parked as a hold.
For each of the 36 give a concrete recommendation: what the row should say, or delete, or escalate-to-author. Where you can propose the corrected known_text from the target_text and the surrounding seed, do so.
Files: docs/a135-jpn-paren-kor-2026-08-17/jrefute-a5-broken.md and jrefute-a5-rows.json.`,
  },
  {
    label: 'a135-refute-axis6-audio-rebind',
    prefix: 'jrefute-a6-',
    task: `AXIS 6 — THE AUDIO CONSEQUENCE, RE-DERIVED FOR THE ACTUAL PLAN. This is a mechanical, high-precision task; get the mechanism exactly right before you count anything.
Editing known_text fires trg_null_lego_audio_on_text_change / trg_null_phrase_audio_on_text_change, which REPOINTS known_audio_id via audio_id_for_text() — to an existing clip if one matches, or to NULL (a silent slot) if none does. FIRST: read the actual trigger functions and audio_id_for_text() out of the live DB (SELECT prosrc FROM pg_proc WHERE proname IN (...); and pg_get_triggerdef) — do not assume, the matching key and its normalisation are the whole question. Report the function body verbatim in your write-up.
Then, for the 699 planned edits (action in strip/rewrite/partial), grouped by surface — note that card_tile and component_row_latent edits do NOT touch known_text and so should fire nothing, and you should CONFIRM that rather than assume it:
(1) How many edits REBIND FREE (audio_id_for_text finds a clip for the new text)?
(2) How many go SILENT (resolve to NULL)?
(3) THE PART THAT MATTERS MOST — does ANY free rebind land on a clip whose VOICE differs from the voice of the clip the row is on today? Enumerate every one: row_key, course, seed, old text, new text, old clip id + voice, new clip id + voice. A voice change mid-course is a learner-visible regression.
(4) ALSO — does any rebind land on a clip whose TEXT is not what the row now says? audio_id_for_text matches on text_normalized, which strips trailing punctuation, so 「行く」 and 「行く？」 can collide and the learner would hear a question where the prompt is a statement. Enumerate every rebind where the matched clip's raw text differs from the new known_text, showing both.
(5) Cross-check against the lead's earlier measurement: a NAIVE full strip of all 997 known_text rows gave 424 free rebinds with ZERO voice changes. Reproduce that number as a control so we know your harness is right, then give the real number for the actual plan. If you cannot reproduce the control, say so and stop — a harness that cannot reproduce a known number cannot be trusted for the new one.
Voice lives in course_audio (and the voices table for gender/name); read it there, never infer it from the course.
Files: docs/a135-jpn-paren-kor-2026-08-17/jrefute-a6-audio.md and jrefute-a6-rows.json.`,
  },
  {
    label: 'a135-refute-axis7-presentation',
    prefix: 'jrefute-a7-',
    task: `AXIS 7 — PRESENTATION CLIPS AND THE OTHER SURFACES #880'S PLAN DOES NOT ADDRESS.
(A) PRESENTATION CLIPS. The claim to verify is that 666 presentation clips in these seven courses embed the annotated known text and SPEAK it — e.g. 「見る（不定詞） をドイツ語で言うと：」. Confirm or correct that number from the live DB yourself (course_legos.presentation_audio_id is a text column and course_practice_phrases.presentation_audio_id is uuid — mind the difference; and the lead's memory says the learner reads course_legos.presentation_audio_id, while lego_introductions.audio_uuid is an S3 filename, not the pointer). For each: how many of them sit on a row whose known_text this plan EDITS? Those clips will go STALE — still playing the old annotated text while the card shows the new text — rather than going silent, because presentation_audio_id is a different column and the known_text triggers do not touch it. CONFIRM that: check whether any trigger nulls presentation_audio_id on a text change. Say exactly what the learner would experience for a stale one, and state what the plan is missing and what it must add (a regeneration scope, or a queued audio pass covering presentation clips, or a hold).
(B) THE TILE AND COMPONENT SURFACES. The plan makes 230 card_tile edits (course_legos.components) and 196 component_row_latent edits (course_practice_phrases rows with phrase_role='component'). #880 calls the tile batch "zero audio consequence" and the component rows "latent". Test both claims:
 - Do course_legos.components tiles render to the learner, and where? Trace it in the learning app repo (/home/tomcassidy/SSi/ssi-learning-app — api/courses/[code]/*.ts and packages/player-vue). Note the lead already established that component-role PHRASE rows are never played and never bundled, but the code comment at api/courses/[code]/cycles.ts ~line 148 says they "still render as visual tiles" — find out whether that is true and what the learner actually sees.
 - Does a components-jsonb edit fire any trigger? Check pg_trigger on course_legos.
 - Is there any consistency requirement between a tile's text and the parent row's known_text, or between the tile and the known_gloss_segments / decomposition / display_tiling columns? If the plan edits tiles but not decomposition (or vice versa) the card could show two different glosses of the same word. Check whether the same annotated strings also live in course_practice_phrases.decomposition, display_tiling, known_gloss_segments, or course_legos.known_gloss_segments, and COUNT how many annotated parentheticals live in those columns and are NOT in the plan at all. An unaddressed fourth surface is a finding.
Files: docs/a135-jpn-paren-kor-2026-08-17/jrefute-a7-presentation.md and jrefute-a7-rows.json.`,
  },
];

(async () => {
  for (const t of TASKS) {
    const body = {
      cwd: CWD,
      label: t.label,
      prompt: PRE + t.task + `\n\nYour file prefix is "${t.prefix}" — every file you create must start with it.`,
      model: 'opus',
      effort: 'high',
      parent: PARENT,
    };
    const res = await fetch('http://localhost:4317/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cs-conv': TOKEN },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    console.log(t.label, '->', txt.slice(0, 300));
  }
})();
