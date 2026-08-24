const {q}=require('./db.cjs'); const fs=require('fs');
const props=require('./proposals.json');
const applied=require('../../docs/a134-census-delta-2026-08-17/link-applied-log.json');
const presApplied=require('../../docs/a134-census-delta-2026-08-17/link-pres-applied-log.json');
const NOTE={
 'eng_for_sin:S0216L01B03':['G1','high','Deleted the corrupt token rather than substituting "I". The authored English has no first person, and siblings B01/B02/U01 show the bare noun phrase. **Overturns the brief.** A sibling worker independently made the identical edit while this job was running.'],
 'eng_for_sin:S0226L01U03':['G1','high','Two defects. The stray Latin article dropped (Sinhala has no article, and the indefinite මිනිහෙක් is not introduced until seed 230 — using it here would have broken the ordering rail). The corrupt token became the accusative "me", not the subject pronoun: the subject form occurs **0 times** in the whole course, the accusative **79 times**, and all four sibling rows at this seed use it. **Overturns the brief.** A sibling worker independently made the same accusative correction mid-job.'],
 'eng_for_sin:S0233L01U02':['G1','high','Devanagari → Sinhala. The sibling row S0233L01U03 is the same sentence with the correct pronoun in the same slot.'],
 'eng_for_sin:S0241L01B02':['G1','high','Devanagari → Sinhala. Sibling U05 is the same sentence differing only in tense.'],
 'eng_for_sin:S0420L03U01':['G1','high','Orphan leading vowel sign stripped; the result is a token attested in 806 phrases.'],
 'eng_for_sin:S0121L03U08':['G3','high','Not recoverable as a visual-order artefact — no reordering of those four codepoints yields a word. The answer comes from the row next door: sibling U07 is the *same sentence frame* with "you" in slot 0, and seed 121 itself opens with it.'],
 'eng_for_sin:S0061L03B03':['G3','medium','Orphan vowel sign deleted rather than expanded. Sibling U02 renders the English "that" with **no** Sinhala counterpart in this exact frame, so deletion matches the course\'s own convention. Runner-up (rejected): insert the demonstrative, whose position would have been dictated by where the corrupt glyph happened to sit — not evidence.'],
 'eng_for_sin:S0151L01U05':['G4','medium-high','**Clearance overturned.** See §4.'],
 'eng_for_sin:S0118L02U08':['EXTRA','high','Found by my own re-derivation; the census missed it. Latin-glyph mangling of the first-person pronoun. All 7 sibling rows on this card open with the correct pronoun.'],
};
(async()=>{
 const cur=async p=>{
  if(p.layer==='phrase')return (await q(`select known_text k,known_audio_id::text a from course_practice_phrases where id=$1`,[p.id]))[0];
  if(p.layer==='lego')return (await q(`select known_text k,known_audio_id::text a from course_legos where id=$1`,[p.id]))[0];
  return (await q(`select known_text k,known_audio_id::text a from course_seeds where course_code='eng_for_sin' and seed_number=398`))[0];
 };
 let rows=[];
 for(const p of props){ const c=await cur(p); rows.push({...p,now:c.k,link:c.a}); }
 const g=k=>rows.filter(r=>r.group===k);
 const line=r=>`| \`${String(r.id).replace('eng_for_sin:','')}\` | ${r.seed} | ${r.old} | **${r.now}** | ${r.target} |`;
 let m=`# A-134 — the 18-row census delta, repaired and live (eng_for_sin)

**Worker:** OPUS, plate A-134. **Course:** \`eng_for_sin\` — prompt side Sinhala, answer side English.
**Scope handed to me:** the 18 rows of the phrase-corpus census that were not the 24 bare-ගෙ rows owned by #887.

## The headline

**All 18 were confirmed VOICED before anything was touched** — proven from each clip's provider
\`word_boundaries\`, i.e. the per-token record of what was actually spoken, not from the stored text.
Every defective token appears in the spoken token stream. 17 of the 18 carry a mechanical defect;
the 18th is the contested row in §4.

**21 content rows and 23 clips are now repaired and live**, verified on the bytes the learner is
served. I also found and fixed **1 row the census missed**, and I am holding **7** with reasons (§6).

## 1. I re-derived the census, and it is not 42

Scanning all 11,719 practice phrases myself for wrong-script, orphan-vowel-sign and known-corruption
classes returns **49** defective rows, not 42: the 24 bare-ගෙ rows (#887's, untouched), my 17
mechanical rows, and **8 rows the census did not flag**. The census also included one row on a
token-blacklist inheritance rather than a mechanical class — the contested row in §4 — which my
mechanical scan does not reproduce. So: 24 + 17 + 8 = 49 mechanical, plus 1 inherited = my 18 accounted for.

## 2. Group 1 — five clean rows, two of which the adjudication got wrong

| row | seed | was | now | English |
|---|---|---|---|---|
${g('G1').map(line).join('\n')}

Two of these overturn the analysis I was handed. Both were then **independently confirmed by a
sibling worker** who edited the same two rows the same way while this job was in flight (§7) —
which is stronger corroboration than the verifier I was refused (§8).

## 3. Group 2 — the seed 398 cluster, and the ordering constraint

12 rows in one cluster: 10 practice phrases, the card, and the seed sentence. All read the same
malformed noun phrase for "our children".

**Is the second token corrupt?** Yes, and not on rarity alone — rarity alone is what wrongly convicted
six real Sinhala words on this plate. The evidence: it appears in exactly one lego and ten phrases,
**all at seed 398 and nowhere else in the course**; it is morphologically not a Sinhala plural of
"child" (there is no such suffix); and the course's own word for "children", used 32 times from seed
567, is different. Distribution + morphology + the authored English all agree. **Verdict: corrupt.**
The first token is separately malformed — it stacks a second vowel sign on a base that already carries one.

**The ordering constraint, and how it actually resolved.** The brief warned that the natural repair
needs "our" (believed first taught at seed 454) and "children" (seed 567), both *after* 398.
**One half of that premise is wrong.** Searching the whole corpus rather than the lego layer, "our"
first appears at **seed 271** — in a seed sentence, 127 seeds *before* 398. So "our" carries no
ordering debt at all, and the constraint collapses to a single token.

For "children" there is genuinely nothing usable at or before 398 (the singular "child" at 392 will not
carry a possessed plural in colloquial Sinhala). So I introduce that one token at 398 rather than
degrade the Sinhala, and I did **not** move any other seed's introduction. The justification is that
the seed-398 card is itself \`is_new = true\` — it *is* an introduction point — and this course
re-introduces already-taught tokens in later "new" legos constantly. I measured it rather than
asserting it: **18** separate \`is_new\` legos contain "us/to us", **58** contain "I", **118** contain
"that". The pattern is the course's norm, not an exception I invented.

**Debt, stated plainly:** exactly one token is now used 169 seeds before its previous first appearance.
That is the whole cost, and it is disclosed rather than hidden.

${g('G2').map(line).join('\n')}

**The cluster was bigger than 12.** Two **presentation** clips quote the seed sentence and therefore
*spoke* the corruption. Only one of the two cards' text changes, so only one link was invalidated —
the other would have sat there stale, correct-looking and wrong. Both were re-rendered and repointed.

## 4. Group 4 — the contested row: I overturn the clearance

| row | seed | was | now | English |
|---|---|---|---|---|
${g('G4').map(line).join('\n')}

The census called the final token corrupt; a later independent check on this plate **cleared** it.
**I overturn the clearance**, and this is the verdict resting most on grammatical judgement, so here
is exactly what it rests on:

- **Distribution (strong).** The token as written occurs **once in the entire course**. The stem it
  should be occurs in **73 phrases, 6 seeds and 4 legos**, and is a *taught card* at seed 140.
- **Mechanism (strong).** The difference is a single inserted dependent vowel sign on the first
  consonant — byte-for-byte the same defect class as two other rows in this very job.
- **Morphology (judgement).** The written stem is not a Sinhala verb root; the corrected one is.
- **Construction (strong).** The corrected form follows the course's own productive "when …" pattern,
  attested 41 times and taught at seed 34.

The earlier clearance was, I believe, a correct *rejection of rarity-as-evidence* that stopped there.
Rarity is not why I am overturning it; the near-neighbour distribution and the inserted-vowel-sign
mechanism are. **Confidence: medium-high**, and it is a one-codepoint deletion, trivially reversible.

## 5. Group 3, and the row the census missed

| row | seed | was | now | English |
|---|---|---|---|---|
${g('G3').concat(g('EXTRA')).map(line).join('\n')}

## Per-row confidence and reasoning

| row | group | confidence | why |
|---|---|---|---|
${Object.entries(NOTE).map(([k,v])=>`| \`${k.replace('eng_for_sin:','')}\` | ${v[0]} | ${v[1]} | ${v[2]} |`).join('\n')}
| the 12 seed-398 rows | G2 | medium-high | §3. Strong on "the old text is corrupt"; medium-high on the replacement, which is a construction, not a corpus quotation. |

## 6. What I am holding, and why — 7 rows at seed 226

My re-derivation found 8 rows the census missed. One (§5) I fixed. The other **7 are held**, and the
reason is a rail, not a lack of time. They read \`the <noun>\`, \`a <noun>\`, \`that <noun>\` — English
articles embedded in the Sinhala prompt side. Sinhala has no articles, so the seed's own sentence
renders "the man" with a demonstrative. Applying that:

- "the man" and "that man" both become the *same* Sinhala string with two different English answers — a **hard ZUT hit**.
- Falling back to the bare noun for "the man" collides with \`S0226L01B01\`, which is already the bare noun for "man".

There is no assignment of taught vocabulary to those three prompts that satisfies ZUT. The defect is
not a typo — **the card is teaching an English distinction that the prompt language does not mark**,
and fixing that is a design decision on seed 226, not a text repair. Per the brief, hard hits are
blockers and soft near-conflicts are reported rather than widened. **Held, with the analysis, for
whoever owns seed 226.** They are the only rows in my defect classes left anywhere in the course.

## 7. The estate moved under me — twice

Between my collision pre-check and my first write, other live workers inserted **243 clips** into this
course. My first apply aborted on the unique index because a clip for one of my exact repaired texts
had been created **27 minutes after** my pre-check cleared it. **Nothing was applied; the transaction
rolled back.** I added a re-validation pass that, immediately before writing, re-reads every target
row's current text, drops rows a sibling already fixed, re-points the optimistic-lock guards, and
re-runs the collision check. It then found:

- \`S0216L01B03\` — **already at my exact target text.** Dropped from my apply set; I gated the
  sibling's clip with my own gates instead (passes clean, z = -0.14, tail -88.1 dB).
- \`S0226L01U03\` — half-fixed by a sibling (accusative corrected, Latin article still there). Guard
  re-pointed at the live text; my repair completed the row.

Both of my overturns in §2 are exactly what that sibling did independently.

## 8. Verification — what I could and could not get

**EXPLICIT GAP: I could not obtain an independent verifier.** The mandated adversarial sonnet worker
was **refused by the fan-out depth ceiling** (this job already sits at the maximum worker depth). The
permitted fallback, an independent linguistic opinion via the Claude CLI, **is not authenticated in
this environment** — it exits "Not logged in" under both the default and the account config directory.
So every linguistic verdict here is **self-review**, and I am naming it as such. What I substituted:

- Adversarial checks run against the **database** rather than against my own reasoning: ZUT collision
  sweep, the is_new re-introduction counts, near-neighbour distribution counts, and a Unicode-aware
  vocabulary gate. Numbers, not opinions.
- The sibling worker's independent agreement on both overturns (§7) — unplanned, and the strongest
  external check I actually got.

**The known-side gate is inert for Sinhala, so I wrote my own.** The shipped \`tokenizeKnown()\` splits
on an ASCII-only class: Sinhala tokenises to nothing and a "0 violations" result means nothing. Mine
uses \`Intl.Segmenter\` grapheme segmentation, so vowel signs and the ZWJ inside conjuncts are never
split from their base. **Two passes, and I state which way each errs:** exact-token matching **over-reports**
(an inflection of a taught verb scores as unseen), prefix-stem matching **under-reports** (a new word
that merely starts like a taught one scores as seen). Only tokens failing *both* are treated as real.
Result: **13 candidate violations, all one token** — the seed-398 "children" discussed in §3 — and
**zero** agglutination artefacts.

**ZUT:** 0 hard hits across all 21 repaired strings, checked against every phrase, lego and seed in
the course, punctuation-normalised.

**Learner-progress migration (A-111):** verified, not assumed — \`lego_progress\` **0** rows and
\`seed_progress\` **0** rows for this course, and the 4 \`learner_lego_pairings\` rows are at seeds 1 and
150, none at any seed I touched. **A genuine no-op, now recorded.**

## 9. Gates, renders and collisions

I could not reuse the plate's gates directly: they are shaped for *presentation* clips (they demand
the narration terminator and use a presentation rate model). I wrote \`gates-known.cjs\` for prompt
clips, reusing the transferable gates and **extending the purity gate** for this job's classes: no
Devanagari, no Telugu, no Latin letter, no token opening with a dependent vowel sign, plus every
corruption this plate has shipped once.

**Self-test:** the purity gate fires on **21/21** of the corrupt texts and **0/21** of the repaired
ones. Writing it also caught a false positive in the inherited gate: the bare-ගෙ filler was matched as
a *substring*, which is safe on presentation clips but wrongly condemns the real word for "at home" —
it now matches a bare token pair. Two of my repaired rows would have been blocked by the old form.

**Rate model — verified, not inherited.** Refitted on this course's own known/sin clips
(n = **13,341**, excluding the 74 carrying the "..." convention): **ms = 1387.6 + 45.78 × chars,
residual sd 133.3**. That reproduces the prior worker's fit (1398.0 + 45.58×, sd 149.6, n = 13,301)
to within 1% on both coefficients — **confirmed.**

**Renders: 22/22 passed every gate on the first attempt.** |z| ≤ 1.31; tail floors −77 to −88 dB
against a −40 dB limit. Compressor-free chain, \`PHASE8_NO_LISTEN=1\`, every take kept as a spare.

**Collisions:** one internal (the seed sentence and its use-phrase normalise identically) — rendered
**once**, both rows pointed at the one clip, exactly the arrangement already in the database. One
external, caused by the live sibling (§7). Both resolved by **reuse, never by inventing a difference.**

## 10. Make-before-break, and the two trigger traps

Bytes went to S3 and \`course_audio\` rows were inserted **before** any content text moved, so a live
clip existed at every instant. **No clip was deleted.** Both traps in the brief bit, in opposite directions:

- **Phrases and legos** re-resolve the audio link on a text change. Because the new clip existed
  first, the trigger relinked correctly — **20 of 20 by \`trigger_reresolve\`** — but I read every link
  back and asserted it rather than trusting that.
- **The seed row has no such trigger**: text and link were set in one statement, or the link would
  have kept pointing at a clip speaking the old text with no NULL and no alarm.
- **A third trap the brief did not name, and it caught me:** \`course_legos.presentation_audio_id\` is a
  **\`text\`** column while every sibling id column is \`uuid\`, and unlike the phrase trigger the lego
  trigger **does** null it. My card edit therefore silently left one card with no presentation audio.
  I caught it in the same run and repaired it — but it is worth writing down, because the two seed-398
  presentation clips ended up in *opposite* states: one nulled and silent, one stale and wrong.

## 11. Live verification

Every clip fetched through the learner path (\`/api/audio/<id>\`, path segment):
**23/23 HTTP 200**, decoded duration matching \`duration_ms\` exactly on all 23, and **md5 of the served
bytes identical to my gated take on all 22 clips I produced** (the 23rd is the sibling's clip, verified
200 + duration). \`content_stamp\` bumped, so the cached script is invalidated.

Course-wide re-scan after the work: **0** rows in my defect classes remain anywhere in the course
except the 7 held at seed 226.
`;
 fs.writeFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.worktrees/a134-delta/docs/a134-census-delta-2026-08-17/REPORT.md',m);
 console.log('report written', m.length, 'chars');
})();
