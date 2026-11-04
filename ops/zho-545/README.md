# Reader brief — zho_for_eng points A, B, C (job #545 fan-out)

You read EVERY row in your seed range IN FULL and decide. You do NOT write to the database. Regex may find
candidates; it never decides (Kai's hard rule: no regex language fixes, read every row).

## Input
`~/ssi-evidence/ssi-dashboard-v7/ops/zho-545/zho-2026-11-03.json` — `{seeds, legos, phrases, intros}`.
Phrase `phrase_role`: `component` (a LEGO's literal tiles, looser standard, never replayed), `build` (plays once
right after the intro, fragments OK), `use` (replays cold forever — must be a full, unambiguous sentence).
Only phrases under an `is_new` LEGO are played; still read them all, but say `played:false` in a decision where
the row is dark. `target_text_roman` is the stored pinyin.
Also `ops/zho-545/195-zho-findings.jsonl` (on branch `cs/545-zho-learner-feedback-fixes`: `git fetch origin
cs/545-zho-learner-feedback-fixes && git show origin/cs/545-zho-learner-feedback-fixes:ops/zho-545/195-zho-findings.jsonl`)
— job #195's findings. For rows in YOUR range: where a #195 row is ALSO an A/B/C defect, fold it in (decide it
yourself, cite `"r195": true`). Do NOT work the rest of #195's list (plain dropped-object / missing-chunk rows
that are not A/B/C are out of scope).

## What to look for
- **A — broken English** on the known side of seeds, LEGOs, build/use phrases (components: only if truly broken,
  not merely fragmentary — components "can be a bit weird"). Ungrammatical ("more worse", "the completely way",
  "more perfect", wrong article/agreement/tense, "I want go", "since three days"), or English no native would say.
  NOT a defect: a BUILD fragment ("want to play", "in Chinese") — fragments are fine in BUILDs; dropped "that"
  ("I think he's…"); a phrase that's merely unlikely to be said; capitalisation; a missing full stop.
- **B — time expressions after the verb/at the end** on the TARGET side: 今天/明天/昨天/现在/以后/以前/刚才/马上/
  晚上/早上/下午/周末/每天/上个月/下周/…点/…的时候 clauses etc. Chinese puts time-when before the verb (front or
  after subject). Duration (了三个小时, 学了两年) correctly FOLLOWS the verb — that is NOT a defect. Frequency
  (一次/两次) follows the verb — not a defect. Read each row; also check seeds and LEGOs.
- **C — context-bound verbs** used outside their sense. 坐 = ride/sit: right for buses, trains, planes, taxis,
  lifts (坐公交车, 坐飞机, 坐电梯) and for sitting; WRONG for taking an object (take medicine 吃药, take a photo
  拍照, take the book 拿/带), or "take" time/a course/a turn. 弹 = play a plucked/struck instrument (弹钢琴,
  弹吉他); WRONG for sports (踢足球, 打篮球), wind instruments (吹), games/playing in general (玩), playing music
  from a device (放). Also judge other verbs translated too broadly the same way (e.g. 穿 vs 戴, 打 vs 玩, 开 for
  "open" vs "drive", 看 vs 见, 拿 vs 带, 告诉 vs 说, 想 "miss/think/want") — only where the row is actually wrong.
  The root is often the LEGO: a bare `take | 坐` or `play | 弹` LEGO teaches the learner an over-broad mapping;
  decide whether the LEGO needs its context (K40) and HOLD that with your proposed cut, while editing the
  phrases that misuse it.
- Anything else glaringly wrong you trip over in Chinese (wrong word, ungrammatical Chinese): record it as
  `point:"other"`, action `hold` — not in scope to fix, but worth listing.

## The rules you fix by (digest of course-methodology-canon.md on Popty main; read a section there if you need detail)
- **K9/K16** English must be grammatical and natural; Chinese must be grammatical, natural Chinese.
- **P1/P2/K29/K14/K15** A phrase may use ONLY material taught before it (seeds 1..N-1, plus LEGOs and their
  components up to and including the phrase's own LEGO in seed N; never a later sibling). Chinese is NOT read
  word-by-word: it tiles from WHOLE taught chunks (LEGO targets and component targets, plus earlier seed
  sentences' text) — so a reworded Chinese phrase must be tileable from those. If the correct form needs
  something untaught, the phrase is reworded to something else that IS taught, or deleted. Never invent a LEGO.
- **K6/K7** English side is looser: forms of taught words are fine; a genuinely new English word is a mild defect.
  Prefer English edits built from the glosses of taught LEGOs.
- **P17** Every build/use phrase must contain its whole LEGO on BOTH sides (words may sit inside it, K49). A fix
  that breaks containment is wrong — reword so it still contains the LEGO.
- **P6/P7/P16/K2 (ZUT)** A USE phrase is a complete single sentence, and its English must have exactly one
  Chinese answer given what's taught — no new one-English-two-Chinese clash anywhere in the course.
- **S15** A SEED sentence is edited only if WRONG: ungrammatical, teaches something false, or fails a canon rule.
  Name which. Seed edits have a course-wide blast radius → mark them clearly (`table:"seed"`).
- **LEGO edits** (L-rules, O12, O13): a LEGO edit obliges re-making every phrase under it AND checking every
  phrase in the course that uses the old gloss/target. If you propose a LEGO edit, list those knock-on rows and
  propose their edits too (they may sit outside your range — list them anyway). LEGO may contain only words its
  own seed says (L26). A LEGO whose meaning only holds in a context should carry that context INSIDE it (K40/K42,
  e.g. `take | 坐` → grow to the seed's vehicle chunk), or have the sense in its intro (K23). **Never delete a LEGO.**
- **R0.3** Rewording or deleting a phrase is legitimate; delete when no good reword exists from taught material.
- When unsure, or when the fix is a judgement call (seed rewrite, LEGO re-cut, meaning change, several valid
  fixes), action = `hold`. APPLY only the clear ones.

## Output — `ops/zho-545/decisions-<from>-<to>.json` (e.g. decisions-001-167.json), committed and pushed on YOUR branch
```json
{ "range": [1,167], "snapshot": "zho-2026-11-03.json",
  "coverage": { "seeds": n, "legos": n, "build": n, "use": n, "component": n, "read_in_full": true },
  "decisions": [
    { "id": "zho_for_eng:S0114L01B02",        // phrase id; LEGO: "S0153L01"; seed: "seed:153"
      "table": "phrase|lego|seed", "role": "build|use|component|lego|seed", "played": true,
      "point": "A|B|C|other", "r195": false,
      "action": "edit|delete|hold",
      "before": { "known": "more worse", "target": "更差" },
      "after":  { "known": "worse", "target": "更差", "roman": "gèng chà" },   // null for delete; roman = pinyin of new target if target changed
      "why": "plain English: what is wrong and why the fix is right",
      "taught": "for a changed target: which LEGO/component/seed teaches each chunk, e.g. 明天=S0023L01, 去=S0005L02",
      "gloss": "literal word-by-word gloss of the Chinese (required for holds and target edits)",
      "knockOn": ["ids of rows that must change if this one does"]   // LEGO / seed edits
    } ] }
```
Exact `before` text (copied from the snapshot, byte for byte). One decision per row. Rows with no defect are NOT
listed — but the coverage counts must say you read them all. Holds must carry pinyin + literal gloss + the
plain-English "why it is wrong" so Kai, who reads no Chinese, can rule.

## Boundaries
- No database writes, no hand-written DB code, no TTS. Read the snapshot file only.
- Scratch in $CS_SCRATCH (not /tmp). Commit ONLY `ops/zho-545/decisions-*.json` on your own branch; push it
  (`git push -u origin HEAD`). Do not merge anywhere.
- Report in one paragraph: counts per point (edit/delete/hold), the branch, and the file path.
</content>
</invoke>
