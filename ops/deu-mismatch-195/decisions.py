#!/usr/bin/env python3
"""deu_for_eng #195 wave-1 mismatch rows (job #246, leg of #237; Kai approved 4 Nov 12:59Z) — every row read in full against LIVE.
Input: the 63 CONFIRM rows (cause != dropped-object) of ~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl;
all 63 still read exactly as the 30-31 Oct snapshot in the 4 Nov live pull (GET /api/production/deu_for_eng/seeds), so
none were already fixed by #435 (29 Oct) or later passes.
Output: tools/course-optimization/deu-mismatch-195-2026-11-04.data.cjs, run by the ita #36 engine with DATA=<that file>.
Rules: English first; taught forms only. Checked against the live LEGO list (first taught): seinen S0020L02 (seiner/seinem
never), würden S0557L02, gefahren S0377L04, gegangen S0362L01, Haus S0514L02, Wald S0559L03 (after L02), sie hatten S0356L01,
spielen S0337L01, darüber S0037L03, sehr S0013L03. Untaught fixes, naturalness calls and LEGO re-cuts are HELD for Kai.

DROPPED-OBJECT (19 rows, all skipped): German, like French, normally needs the object pronoun ('ich will es versuchen',
'ich weiß es nicht'), but unlike Romance there is no untaught-clitic problem — es (S0027L01) and das are taught from the
start, so a fix never needs an untaught form. The class is MIXED, though: weitermachen (S0092) and geschafft (S0564) are
complete German with no object, and 8 rows (S0261-S0295 'asked me' | 'wollte wissen') are a verb-choice question, not a
dropped object. Not sure enough to fix as a class, so the whole class is HELD for Kai, nothing fixed."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FIND = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl')
E, D, H, K = 'edit', 'delete', 'hold', 'keep'
POSS = "seiner/seinem (dative) is taught nowhere in the course (only seinen, S0020L02); 'with the mother' is not natural English — "
# id: (action, known | None, target | None, why)
DEC = {
 'S0042L04U04': (E, 'Last night I wanted to try it, but I feel better now', None, "English first: 'es versuchen' is 'try it' (it | es S0027L01)"),
 'S0060L01U01': (E, 'I am not yet ready to speak German well but I will try it soon', None, "English first: 'es bald versuchen' is 'try it soon'"),
 'S0067L01U09': (E, 'Why do you want to stop trying to speak German when you are getting better?', 'Warum willst du aufhören zu versuchen Deutsch zu sprechen wenn du besser wirst', "English first: nothing in the German says 'at speaking it' or 'now'; the stray 'oft' ('often getting better') dropped from the German"),
 'S0102L01U09': (E, 'I think you should try doing it like that before you want to try something similar or different', 'Ich denke du solltest versuchen es so zu machen bevor du etwas ähnliches oder anderes versuchen willst', "'bevor du … willst' said 'before you want' with no verb; versuchst is untaught here, so 'versuchen willst' | 'want to try'; 'first' had no German"),
 'S0109L02U04': (E, 'I am happy to read a new story about this tomorrow', None, "English first: 'morgen' is 'tomorrow', no 'morning'"),
 'S0115L02U06': (H, 'I wanted to ask if you want me to lead the conversation tonight', 'Ich wollte fragen ob du willst dass ich heute Abend das Gespräch führe', "'at home' has no German and 'führen kann' adds a 'can' the English lacks; führe is untaught and drops the LEGO 'führen' (engine refused), and dropping only 'at home' leaves the kann — proposed as shown, or 'if you want me to be able to lead' — Kai's call"),
 'S0117L01U05': (E, 'He tells me definitely that is good', None, "English first: no 'für mich' in the German"),
 'S0117L03B02': (E, 'When I was by the bus', None, "English first: 'beim Bus' has no 'stop' (Bushaltestelle is not taught)"),
 'S0117L03U09': (E, 'She tells me she was by the bus', None, "English first: 'beim Bus' has no 'stop'"),
 'S0125L02U01': (E, None, 'Ich mag deine Idee darüber, wie wir die Sprache diese Woche hier lernen können', "'idea about how' needs darüber (taught S0037L03); the English cannot lose 'about'"),
 'S0126L02B03': (E, None, 'Wie ich denke hat sich so sehr verändert', "'so much' is 'so sehr' (sehr taught S0013L03); bare 'so' left 'much' unmatched"),
 'S0131L04U01': (E, 'I think about what you said because it is in my head', None, "English first: 'Ich denke nach über' has no 'keep'"),
 'S0139L03U05': (E, 'It is perfect if we can start so early together tomorrow', 'Es ist perfekt wenn wir morgen so früh zusammen anfangen können', "'morgen früh so früh' doubled 'früh' and said 'tomorrow' where the English did not; now tomorrow | morgen on both sides"),
 'S0147L03U05': (E, 'Do you think he is feeling nervous to meet those people?', None, "English first: no preposition in 'nervös … diese Leute zu treffen'"),
 'S0153L02U02': (E, 'You did exactly what you should have done when you wanted to wait for me', None, "English first: 'warten wolltest' is 'wanted to wait', not 'decided'"),
 'S0212L01U10': (E, 'Do you know why asking for something can be so difficult for many people?', None, "English first: 'für viele Leute' is 'for many people'"),
 'S0224L01U06': (H, None, 'Ich habe gerade meinen Freund in der Kneipe gestern Abend gesehen bevor ich nach Hause gegangen bin', "'bevor ich nach Hause bin' has no verb for 'went'; gegangen is first taught at S0362, gefahren at S0377, so the German cannot be completed at seed 224 with taught words ('just' + 'yesterday evening' also clash) — delete, or allow gegangen early: Kai's call"),
 'S0237L01U04': (H, 'He wanted me to speak German with his mother when she is here next week', 'Er wollte, dass ich mit seiner Mutter Deutsch spreche, wenn sie nächste Woche hier ist', POSS + "add seiner (untaught) or delete"),
 'S0237L01U08': (H, None, 'Er wollte, dass ich seinem Bruder sage, warum wir die Arbeit nicht rechtzeitig fertig gemacht haben', POSS + "add seinem (untaught) or delete"),
 'S0238L01U04': (H, None, 'Er wollte, dass du mit seiner Mutter Deutsch sprichst, wenn sie nächste Woche hier ist', POSS + "add seiner (untaught) or delete"),
 'S0238L01U06': (H, None, 'Er wollte, dass du seiner Schwester alles sagst', POSS + "add seiner (untaught) or delete"),
 'S0240L01U01': (E, None, 'Mein Vater mag es nicht, aufzuhören zu reden, wenn er mit seinen Freunden ist', "'his friends' is 'seinen Freunden' — seinen is taught (S0020L02, S0052L03)"),
 'S0255L01U05': (E, None, 'Ich bin schon lange hier, weil ich dich fragen wollte, wann du denkst, dass du bereit sein wirst, heute nach Hause zu gehen', "'do you think' had no German; the embedded form of the basket's own U02 ('wann du denkst, dass du bereit sein wirst')"),
 'S0255L01U06': (E, None, 'Meine Freundin hat gesagt, dass sie nicht kommen wird, bis sie weiß, wann du denkst, dass du bereit sein wirst, morgen zum Büro zu gehen', "as U05: U02's embedded 'wann du denkst, dass …'"),
 'S0255L01U07': (E, 'When do you think you will be ready to leave, I need to know that now?', None, "English first: 'ich muss das jetzt wissen' is 'I need to know that now'"),
 'S0257L02U02': (E, 'There was one new thing that I wanted to ask you when we were talking yesterday', None, "English first: no über in 'das ich dich fragen wollte'"),
 'S0257L02U07': (E, 'The only thing I wanted to do yesterday was to finish the work before it was evening', 'Das einzige Ding das ich gestern machen wollte war die Arbeit zu erledigen bevor es Abend war', "'bevor der Abend war' is not German; 'bevor es Abend war' | 'before it was evening'"),
 'S0266L01U04': (H, None, None, "'building' has no German ('in dem alten Büro'); Gebäude is never taught and Haus only from S0514, and 'the office was in the old office' is nonsense — proposed 'The office of my father was old | Das Büro meines Vaters war alt', or delete"),
 'S0268L02U07': (E, 'I sent her the answer to her question yesterday after I finished my work', None, "English first: no 'hier' in the German"),
 'S0280L03U04': (E, 'She told me that this question was the most important one for her', None, "English first: no 'gestern' in the German"),
 'S0281L02U03': (E, 'I have my coffee in the morning before I have to go to the office', 'Ich habe meinen Kaffee am Morgen, bevor ich zum Büro gehen muss', "'bevor ich zum Büro will' said 'want' with no verb; gehe is untaught here, so 'gehen muss' | 'have to go'; 'am Morgen' has no 'every'"),
 'S0281L03U09': (E, 'I finish my coffee and help you', None, "English first: 'und helfe dir' has no 'then'"),
 'S0283L01U05': (E, 'Which of your friends can help us with the problem now', None, "English first: 'mit dem Problem' is 'the problem'"),
 'S0283L02U10': (E, 'They wanted to know if the friends speak about us when we are not there', None, "English first: no 'mit ihnen' in the German"),
 'S0291L02U03': (E, 'I will be able to do it myself if you can tell me exactly what you want me to do', None, "English first: 'was du willst, dass ich mache' is 'want me to do' (S0169L01)"),
 'S0301L01B03': (E, None, 'er hat gesagt, dass er nicht weiß', "the course pairs 'I don't know' with 'ich weiß nicht'; the extra es had no English"),
 'S0324L04U01': (K, None, None, "the seed's own sentence: German leaves the possessive off body parts ('beide Hände'), English says 'her hands' — both natural"),
 'S0331L02B02': (E, None, 'kann nicht alle Antworten geben', "'cannot' had no kann; the build now steps to the seed 'Sie kann nicht alle Antworten geben'"),
 'S0374L01B03': (E, 'I thought it was very', None, "English first: the build already says 'sehr' (the LEGO is 'very beautiful')"),
 'S0419L01U03': (H, None, None, "'would like them | mögen wollten' says 'wanted to like'; würden is first taught at S0557L02 (the #358 F plural-würden hold). Proposed 'I thought the people liked them | ich dachte, dass die Leute sie mögen' (meaning shifts) or wait for würden"),
 'S0419L01U04': (H, None, None, "as U03: proposed 'she told me the people liked them | sie hat mir gesagt, dass die Leute sie mögen'"),
 'S0419L01U06': (H, None, None, "as U03: proposed 'I knew the people liked them | ich wusste, dass die Leute sie mögen'"),
 'S0422L01U02': (E, None, 'ich dachte, dass wir eine Frage hatten', "'had' is hatten (sie hatten S0356L01); 'haben' was present"),
 'S0443L02U04': (H, None, None, "the whole S0443L02 'on | auf' basket is broken German ('es weiter auf machen' = 'keep opening it', not 'keep it on'): seed 443's 'auf die gleiche Weise' was cut into 'on | auf' + 'same | gleiche'. A LEGO re-cut ('in the same way | auf die gleiche Weise') is Kai's call; fixing one row's 'I think' does not help"),
 'S0443L03U04': (H, None, None, "the whole S0443L03 'same | gleiche' basket says 'es gleiche machen' / 'den gleiche Ansatz', which is not German; same LEGO re-cut question as S0443L02. Row-level proposal: 'I thought all wanted to do the same | ich dachte, dass alle das Gleiche machen wollten'"),
 'S0447L01B03': (E, None, 'nach Hause gehen', "'go' had no German; 'go home | nach Hause gehen' as S0447L03B03 ('home | nach Hause' alone would clash with S0447L03B01 'home | Hause')"),
 'S0499L01U02': (E, 'maybe we should try it', None, "English first: 'es versuchen' is 'try it'"),
 'S0506L04U02': (E, 'she moved', None, "English first: umgezogen has no 'away'"),
 'S0506L04U04': (E, 'he moved too', None, "English first: umgezogen has no 'away'"),
 'S0511L01U05': (E, 'she has the news', None, "English first: 'hat' is 'has', and Nachricht is this LEGO's 'news'"),
 'S0513L02U04': (E, None, 'er versucht am meisten', "'he tries the most' has no object; 'it tries it the most' reads badly, so the es goes"),
 'S0518L05U03': (E, 'can you imagine that?', None, "English first: 'dir das vorstellen' is 'imagine that'"),
 'S0524L02U05': (E, 'she wants to try it three times', None, "English first: 'es drei Mal versuchen' is 'try it three times'"),
 'S0524L02U06': (E, 'he tried it three times', None, "English first: 'es drei Mal versucht' is 'tried it three times'"),
 'S0525L02B03': (K, None, None, "'du konntest es' is how German says 'you were able to do it' — a modal + es stands for the doing ('ich kann es'), as U03 'konntest du es sehen' shows the full form"),
 'S0525L02U02': (K, None, None, "'du konntest es nicht' is natural German for 'you weren't able to do it'"),
 'S0525L02U05': (K, None, None, "'du konntest es nicht' is natural German for 'you weren't able to do it'"),
 'S0527L05U07': (K, None, None, "'wer es mir erzählt hat' is the natural German; English 'who told me' leaves the object unsaid and 'who told me it' reads badly"),
 'S0531L01U04': (E, None, 'sie will ein Spiel spielen', "'play' is spielen (S0337L01); 'ein Spiel machen' said 'make a game'"),
 'S0531L01U06': (E, None, 'sie kann ein Spiel spielen', "'play' is spielen (S0337L01)"),
 'S0559L02B03': (H, None, None, "'she went along the path | sie ist durch den Weg gegangen' — 'durch den Weg' is not natural German and 'through the path' is not natural English; Wald is taught only at S0559L03, after this LEGO. Proposed 'she went through the wood | sie ist durch den Wald gegangen' moved under S0559L03, or delete"),
 'S0591L02U01': (K, None, None, "the seed's own sentence: 'down to the shops' is plain English for 'to the shops'"),
 'S0629L01B01': (E, None, 'ich mag', "German does not drop the subject; the LEGO is 'Ich mag es'"),
}

def main():
    rows = [json.loads(l) for l in open(FIND)]
    de = {r['id']: r for r in rows if r['course'] == 'deu_for_eng' and r['decision'] == 'CONFIRM' and r['cause'] != 'dropped-object'}
    dropped = [r for r in rows if r['course'] == 'deu_for_eng' and r['decision'] == 'CONFIRM' and r['cause'] == 'dropped-object']
    assert set(de) == set(DEC), (set(de) ^ set(DEC))
    fixes, held, kept = [], [], []
    for i, (a, k, t, why) in sorted(DEC.items()):
        r = de[i]; now = [r['known'], r['target']]; tag = f"#195 {r['severity']}/{r['cause']}: {why}"
        if a == E: fixes.append([i, r['cause'], now, [k, t], tag])
        elif a == D: fixes.append([i, r['cause'], now, None, tag])
        elif a == H: held.append({'id': i, 'seed': r['seed'], 'now': now, 'proposal': [k, t], 'reason': why})
        else: kept.append({'id': i, 'seed': r['seed'], 'now': now, 'reason': why})
    for r in dropped:
        held.append({'id': r['id'], 'seed': r['seed'], 'now': [r['known'], r['target']], 'proposal': [r['fixed_known'], r['fixed_target']],
                     'reason': 'dropped-object class held whole: German normally needs the object pronoun, but this class mixes real drops with complete German (weitermachen, geschafft) and asked-me | wollte-wissen verb choices; judge suggestion shown'})
    out = os.path.join(ROOT, 'tools/course-optimization/deu-mismatch-195-2026-11-04.data.cjs')
    with open(out, 'w') as f:
        f.write("'use strict';\n// GENERATED by ops/deu-mismatch-195/decisions.py — edit there, not here (job #246, Kai approved 4 Nov 2026).\n")
        f.write("// Rows: [id, class, [known now, target now], [known fix | null, target fix | null] | null (= delete), why].\n")
        f.write("// Run with the ita #36 engine: DATA=tools/course-optimization/deu-mismatch-195-2026-11-04.data.cjs node tools/course-optimization/ita-mismatch-36-2026-11-02.cjs …\n")
        for n, v in (('FIXES', fixes), ('HELD', held), ('KEPT', kept)):
            f.write(f"const {n} = {json.dumps(v, ensure_ascii=False, indent=1)};\n")
        f.write("module.exports = { COURSE: 'deu_for_eng', LANGUAGE: 'German', LOG_PREFIX: 'deu-195', JOB: '#246',\n"
                "  AGENT: 'deu-mismatch-195 (job #246)', PURPOSE: 'job #246 deu_for_eng #195 phrase-mismatch fixes (Kai approved 4 Nov) — refill of the slots these edits emptied',\n"
                "  FIXES, SEED_FIXES: [], LEGO_FIXES: [], HELD, KEPT };\n")
    print(f"fixes {len([x for x in fixes if x[3]])} edits + {len([x for x in fixes if not x[3]])} deletes, held {len(held)} (incl {len(dropped)} dropped-object), kept {len(kept)}")
main()
