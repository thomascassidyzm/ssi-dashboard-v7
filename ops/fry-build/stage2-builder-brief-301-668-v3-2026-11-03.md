# fry_for_eng builder brief v3: stage 2, seeds 301–668

Written 3 Nov 2026 by job #762 for Kai. It replaces v2 (d/5055160c) for stage 2. v2's sections 3, 5, 7 and 8 still apply where this brief does not say otherwise. The binding rule text is `ops/fry-build/governing-brief-grammar-rules-2026-10-28.txt` in the Popty repo. The same text is live in `courses.quality_rules.grammar_rules` for fry_for_eng, and the course-builder serves it to every build agent. Where they disagree, the live rule text wins.

**DO NOT START THIS BUILD.** Stage 2 starts only on Kai's word. Nothing in this brief is a go.

## 1. Where things stand (3 Nov 2026, read live)

- Seeds 1–300 have been built. There are 733 LEGOs and about 8,800 practice phrases, all draft. Seeds 12, 184, 196, 229, 231, 248, 250, 258, 262, 274 and 297 are back to draft because their phrases were edited (#735, #762). The other seeds in 1–300 are released.
- Seeds 301–668 are draft, have no LEGOs, and are Auke's text. Seed text is frozen for the builder.
- Audio: the target voice is Auke, as a human recording (`human_only`). There is no TTS cast for fry, so `POST /api/audio/render` refuses target audio with `VOICE_POLICY`. No phrase in 1–300 has known-side audio. A content pass ends by queueing an audio pass (`tools/course-optimization/queue-audio-pass.cjs`). It never ends with a render.

## 2. Auke's corrections from stage 1. Every one binds stage 2.

These are from his 303 seed edits (23–27 Oct, findings d/dc42517e), his chat rule (28 Oct) and his notes of 3 Nov. Seed numbers are evidence.

1. **Informal "you" is dû and the clitic is -stû** (wolstû, datstû, astû, foar'tstû), never do/-sto. There are no do/-sto left in 301–668. The formal jo is used only in seeds 639–655 (sir/madam). Plural jim is in 529 and 656–668. A basket never mixes jo, jim and dû material.
2. **Our/us is always ús, with the accent** (Auke, 3 Nov: an unaccented "us" is a misspelling). Stage 2 seeds with ús: 304, 308, 381, 397, 398, 428, 447, 523, 572, 604. Seeds 454 and 462 begin with a capital "Us". Leave them as written. They are an open question for Auke (§6). Never write a lowercase "us" in any Frisian LEGO, component or phrase.
3. **Two infinitives** (Auke's chat rule, 28 Oct). After modals, litte, sjen, gean, bliuwe and graach, and in bare "to X" LEGOs, use the -e/-je form: leare, prate, besykje. Use the -en/-jen form only directly after te: te learen. Teach "te learen" as one unit. Objects go before te + verb. A basket never mixes the two forms. **The phrase door does not know this rule. It writes "wol learen", so read every row it returns.**
4. **No útfine.** besykje (te) only for a real attempt. Stage 2 has besykje only in 407, inside "Soene wy net besykje moatte". Where the English says "trying to" and the Frisian has no besykje, the basket must not bring it back (541, 638).
5. **"remember" by sense:** noch witte / wist net mear (464), betinke, op in wurd komme. ûnthâlde only for retaining.
6. **"should":** Auke flattened it to moatte in 328 and 403–405. soe … moatte remains in 438 (dwaan moatte soe), 499 and 407 (Soene wy … moatte). Never drill both forms as "should" in one basket, and never teach moat as "must" under a "should" LEGO.
7. **Modal clusters keep the main infinitive before the modal.** Never bring back "kinne sil" where Auke wrote kin/kinne (668).
8. **Opinion:** ik fyn X goed/moai (374, 486, 553). 12 stage 2 seeds still say ik tink dat … (303, 304, 314, 315, 317, 325, 328, 335, 339, 636, 641, 655). Build what each seed says. Do not normalise, and do not drill the competing form in the same basket.
9. **Preposition + relative uses the R-form** (dêr't … mei, 388). The LEGO grows to cover the whole relative clause.
10. **One om for coordinated infinitives.** Auke's om … te rewrites are in 475 and 510.
11. **"it feels" is it liket** (618). "feel as if" is it gefoel ha dat.
12. **His vocabulary choices:** folgjende jier (416) alongside takommende (1–300) and nije wike (277), stopje (402, 470, 471), efkes (471, 638), elts(e) (542), poppe (519), ûnthjitte (535), tichtby (614), saterdei with snein. Do not "de-Dutchify" what he wrote, and do not add Dutch-shaped forms he avoided.
13. **friend:** freondinne in 308. freon is used for a woman in 358 (Dyn freon sei dat se …), and 359 and 360 also use freon. Build what each seed says.
14. **Mum/Dad** are capitalised in English for ús mem and ús heit. The 12 rows in seed 240 that gloss ús heit as lowercase "dad" stay as they are (Kai, 3 Nov). Do not "fix" them, and do not copy them.
15. **Seed 535 has no full stop** (Auke's last save). Leave it.

## 3. Punctuation and line shape (Kai, 3 Nov). This is new since v2.

- **"?" goes on seeds and phrases that are questions, never on LEGOs.** Every seed and every BUILD or USE phrase that is a real question ends with "?" on both sides. LEGO text never carries "?" on either side, even when the LEGO is itself a question (wa wie dy man | who was that man). 59 stage-2 seeds end with "?" (316, 327, 337 … 667). Their LEGOs still get no "?".
- **Decide by reading the sentence.** Never decide by its first word. Embedded clauses and fragments are not questions (hoe't ik sizze kin; wat ik bedoel is wichtich). A statement followed by a question is a question and gets "?" (ik bin klear, wêr wolstû moetsje?). Stage 1 missed 104 rows of this shape, and #762 fixed them. Conditional statements with inversion are not questions (astû witst wat ik bedoel; om't ik der oer ynsit, kin ik net mear betinke).
- **No ask-then-state lines.** Never write a phrase that asks and then states (kenstû ien, ik ken net folle minsken). One voice reads both halves, and the learner hears a question that turns into a statement. Make every line a single thing: a question (moatstû fuortgean, of kinstû in bytsje wachtsje?) or a statement (ja, ik bin der wis fan, ik haw se sjoen). The phrase door writes these lines. Reword or drop each one before you submit. Stage 1 had 12, and #762 reworded them.
- Phrases are lowercase with no full stop. A phrase is never a capitalised one-word or one-chunk sentence. "In âlde man." is wrong. Write in âlde man | an old man.
- The "?" must be in place before any audio is recorded or rendered. Adding "?" later can unlink an existing clip, because the text trigger compares the words. Re-link only if the clip's words are identical (`audio.link` with `allow_text_mismatch`), and list every re-link.

## 4. The defects stage 1 actually had (check every block of 25 for them)

These came from the phrase door or the builder, not from Auke. #720, #735 and #762 found them.
- "wol learen"-type infinitive errors (§2.3).
- Lowercase "us" copied from older seeds (§2.2). 64 phrases and 6 LEGOs had to be fixed.
- Questions with no "?": 1,030 rows in total (§3).
- Ask-then-state lines (§3).
- A capitalised one-chunk phrase with a full stop ("In âlde man.").
- "mum" in lowercase under ús mem.
- A deleted phrase that left its basket exactly at the floor (S0012L02). Check the floors after any deletion.

## 5. Canon rules (unchanged from v2 §5)

LEGO English comes from this seed's own known_text. A LEGO grows on both sides. No bare function word, ellipsis, bracket, slash or tag. "as in" goes in the presentation. LEGO order is the build-up order. A verb-final LEGO starts with its trigger (K48). Every phrase contains its LEGO on both sides. The known side uses only words that have already been given. A LEGO is a duplicate only if both sides match. Never delete a LEGO. Run a knock-on sweep after any LEGO edit. For want-you-to seeds (427, 432 in stage 2), use whole-chunk presentations first, then head + dat-clause, with the English "that you speak".

## 6. Open questions for Auke (send them as one list. Do not wait for answers.)

- Q-Us: Should the capital "Us" in seeds 239, 240, 454 and 462 be "Ús"?
- Q3 "should": moatte (328, 403–405) or soe … moatte (407, 438, 499)?
- Q4: ik fyn X or ik tink dat X … is? This matters for 12 stage 2 seeds (§2.8).
- Q5: takommende, nije or folgjende for "next"?
- Q6: ha or haw? 13 stage-2 seeds have haw.
- Q7: tichtby (614) or the lexicon's tichteby?
- Q10: freon or freondinne for a woman (308 vs 358)?
- Q11: Which separable verb debuts the split form?
- Q12: Do the jo seeds (639–655) stay strictly jo … binne?
- From stage 1: 27 of Auke's recordings are now marked as questions but were read as statements. Kai is marking them on the listening page (d/c69d01b1). Re-recording is Kai's decision, not the builder's.
- From stage 1: Seed 202 Frisian is "hoe't er … moast" (how HE had to). Its English drops "he".

## 7. Tooling

- All writes go through Popty. Use `POST /api/production/fry_for_eng/edit-batch`: it is a dry run unless "apply": true, and it returns an undo. Keep the undo in `ops/fry-build/`. Send at most 50 ops per request, because a 926-op batch hit an API restart.
- New decompositions go through `POST /api/seed/complete`. A LEGO's phrase set goes through `POST /api/v2/phrases/fry_for_eng`.
- No hand-written DB code. Read through Popty routes, e.g. `GET /api/production/fry_for_eng/script-view?seedStart=&seedEnd=`, which returns at most 50 seeds.
- Work in blocks of 25 seeds. Each block ends with a ZUT check, a knock-on check, the §4 defect checks and a line in chat.
- Every edit unapproves its seed. No regex decides a language change. Read every row.
- Use the fkw lexicon (frisian.eu/languageapi_v8) as the spelling authority. Never invent a house spelling.
