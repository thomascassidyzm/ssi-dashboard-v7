"""ita_for_eng #195 wave-1 mismatch fixes (job #36, Kai 2 Nov 2026): one decision per #195 row, read in full by the
job against the LIVE course. S = Sonnet's #195 fix as proposed; K = new known only; T = new target only; B = both;
HOLD = for Kai (proposal + reason). Untaught bound clitics (P27: cambiarlo, discuterlo, l'hai …) are replaced by an
object the learner already has (questo/quello), the shape Kai approved in #650 (canon P27 worked example).
Run: python3 ops/ita-mismatch-36/decisions.py <findings.jsonl> > tools/course-optimization/ita-mismatch-36-2026-11-02.data.cjs"""
import json, sys
S = ('S',)
# DEL: the fixed row would be an exact twin of a sibling already in the basket, so the defective row goes instead
DEL = ('DEL',)
D = {
 'S0026L04U05': ('HOLD', 'I like feeling nearly ready to go', None, 'This phrase IS seed 26 (approved). "as if I\'m" has no Italian; fixing it means changing the seed itself, so it is a seed-level call.'),
 'S0071L02B02': ('HOLD', 'to let you hear something', 'far sentire qualcosa a te', '"someone/you" has no Italian. The natural Italian is farti sentire, which is not taught; qualcuno and a nessuno are only taught after this LEGO. "a te" is taught (con te, seed 1) but stressed — your call.'),
 'S0071L02B03': ('HOLD', 'I want to let you hear something', 'voglio far sentire qualcosa a te', 'Same as S0071L02B02.'),
 'S0071L02U02': ('HOLD', None, 'è utile far sentire a te come parlare italiano', 'Same as S0071L02B02 (farti untaught).'),
 'S0071L02U06': ('HOLD', None, 'mi piacerebbe far sentire a te come parlare italiano', 'Same as S0071L02B02.'),
 'S0071L02U08': ('HOLD', 'I want to let you hear how to say something in Italian', 'voglio far sentire a te come dire qualcosa in italiano', 'Same as S0071L02B02.'),
 'S0071L02U09': ('HOLD', None, 'non volevamo far sentire niente a nessuno', '"to anyone" is a LATER LEGO of seed 71 (L04), so a nessuno is not yet taught at L02.'),
 'S0103L01U01': DEL,
 'S0104L01B04': DEL,
 'S0104L01U03': ('B', 'we need to change that now', 'dobbiamo cambiare quello adesso'),
 'S0105L01U03': ('B', 'that is why we need to change this', 'ecco perché dobbiamo cambiare questo'),
 'S0112L02U03': DEL,
 'S0116L01U07': ('K', 'I was thinking about the choice'),
 'S0116L02U06': ('K', 'I think this is the best choice'),
 'S0116L02U07': ('K', 'I was trying to make the best choice'),
 'S0116L03B04': ('T', 'potrei farlo'),
 'S0116L03U02': ('T', 'potrei farlo meglio'),
 'S0121L01B03': ('B', 'I like to use this', 'mi piace usare questo'),
 'S0121L01U04': ('B', 'I want to use this more often', 'voglio usare questo più spesso'),
 'S0121L02B03': S,
 'S0123L01U07': ('K', "I'm excited about this idea"),
 'S0130L01U01': S,
 'S0143L03U04': S,
 'S0149L02U01': S,
 'S0152L02B02': S,
 'S0154L01B02': S, 'S0154L01B03': S,
 'S0155L04U02': S,
 'S0160L01U01': ('HOLD', 'I don\'t know how you say this word', 'non so come si dice questa parola', 'Idiom: "non so come si dice" is how Italians say "I don\'t know how you say it" (LEGO how do you say | come si dice). Probably not a defect — keep, or take the reword?'),
 'S0160L01U06': ('HOLD', "I'm trying to remember how you say this word", 'sto provando a ricordare come si dice questa parola', 'Same idiom question as S0160L01U01.'),
 'S0174L01U01': ('B', 'can you see that?', 'riesci a vedere quello?'),
 'S0175L02U08': S,
 'S0181L01B04': S,
 'S0182L02B04': ('K', 'I should go somewhere'),
 'S0183L02B04': DEL,
 'S0192L02U05': S,
 'S0192L02U06': ('B', "I'm trying to finish this before tomorrow night", 'sto provando a finire questo prima di domani sera'),
 'S0193L01U06': ('K', "I'm sorry but I'm too busy to talk now"),
 'S0196L01U03': S,
 'S0200L01U04': S,
 'S0205L01U01': ('B', "I've forgotten that", 'ho dimenticato quello'),
 'S0205L02U07': ('K', 'I was trying to say something'),
 'S0207L01U01': ('B', "you've done that", 'hai fatto quello'),
 'S0209L02B04': DEL,
 'S0209L02U05': ('T', 'vogliono passare più tempo a fare pratica'),
 'S0209L02U07': S,
 'S0210L03B03': ('B', 'to discuss this', 'discutere questo'),
 'S0210L03U01': ('B', 'we need to discuss this', 'dobbiamo discutere questo'),
 'S0210L03U03': ('B', 'they want to discuss this', 'vogliono discutere questo'),
 'S0210L03U07': ('B', "I didn't want to discuss this", 'non volevo discutere questo'),
 'S0216L01U03': S, 'S0216L01U04': S,
 'S0232L02B04': ('B', 'there was a woman who can remember that', "c'era una donna che può ricordare quello"),
 'S0238L01B03': ('HOLD', None, None, 'Sonnet proposed DELETE. "tell me about it | me lo dicessi" is a normal pairing, and the twin S0237L01B03 "he wanted me to tell you about it | voleva che te lo dicessi" was judged fine. I would keep it as is.'),
 'S0247L01U01': S,
 'S0251L02U03': S,
 'S0261L02U08': ('K', 'it might be too late to do anything now'),
 'S0267L01U07': ('K', 'have you heard from that woman you were talking to yesterday?'),
 'S0272L01U06': S,
 'S0274L01B03': S,
 'S0277L02U01': S,
 'S0288L01B02': S,
 'S0292L01U07': S,
 'S0292L02U01': ('HOLD', 'I hope you\'ll be able to find the keys soon', None, 'Italian drops the possessive (trovare le chiavi = find your keys). le tue chiavi is not available (tue never taught). Change the English, or leave as idiom?'),
 'S0292L02U04': ('K', "I hope you'll be able to finish the work before you leave"),
 'S0293L02U04': S,
 'S0294L01U06': ('K', 'I hope to be able to call you tomorrow before I leave'),
 'S0302L01U01': ('HOLD', None, 'non vuole vivere altrove', '"somewhere else" | "da qualche parte" — dropping "else" makes "she doesn\'t want to live somewhere", which is odd. altrove is only taught at seed 611 and da qualche altra parte is untaught. Leave, or wait for altrove?'),
 'S0302L01U05': ('K', 'he said that he wants to live somewhere'),
 'S0309L01B03': ('B', "I've never done that", 'non ho mai fatto quello'),
 'S0311L03U03': ('HOLD', 'I want to believe in the facts about that young woman', 'voglio credere ai fatti su quella giovane donna', '"what the young woman said" | "i fatti di quella giovane donna" — any fix changes the meaning of one side. Your wording?'),
 'S0313L02U04': ('HOLD', 'he wants to believe in the facts of all five games', None, 'Same shape as S0311L03U03: "what happened" | "fatti". The English fix reads stiffly.'),
 'S0318L01U04': S,
 'S0319L02U01': S, 'S0319L02U06': S,
 'S0320L04B03': S,
 'S0324L01U06': S,
 'S0327L01U04': ('B', "I don't want to offer this now", 'non voglio offrire questo adesso'),
 'S0327L01U05': ('B', 'I want to offer this today', 'voglio offrire questo oggi'),
 'S0331L01U04': S,
 'S0332L02U06': S,
 'S0333L01B03': S,
 'S0333L01U04': S,
 'S0337L01U04': S,
 'S0339L01U06': S,
 'S0342L01U04': ('K', 'that student who said something wants to understand'),
 'S0345L01B02': S, 'S0345L01U01': S, 'S0345L01U05': S,
 'S0351L01B02': S, 'S0351L02B03': DEL,
 'S0353L02U06': S,
 'S0356L01U06': S,
 'S0357L02U06': S,
 'S0358L01U04': ('HOLD', None, 'sono sicuro che non poteva raggiungerlo', 'raggiungerlo / raggiungerli are not taught, and "raggiungere quello / loro" reads badly. Accept the untaught clitic here, or another wording?'),
 'S0358L01U05': ('HOLD', None, 'ha detto che doveva correre per raggiungerli', 'Same as S0358L01U04.'),
 'S0358L01U06': ('HOLD', None, 'anche se volesse, non potrebbe raggiungerli', 'Same as S0358L01U04.'),
 'S0364L01B03': S, 'S0364L02B03': S, 'S0364L03U06': S,
 'S0371L02B03': S,
 'S0372L02U05': S,
 'S0374L01B03': S, 'S0374L01U02': S, 'S0374L01U03': S, 'S0374L01U04': S, 'S0374L02U03': S,
 'S0375L01B03': S,
 'S0377L01U05': S,
 'S0385L02U01': S,
 'S0387L01B03': S,
 'S0396L02U01': S, 'S0396L02U03': S, 'S0396L02U05': S,
 'S0403L02U01': S,
 'S0409L01B03': S,
 'S0410L01U01': S, 'S0410L03U02': S, 'S0410L03U05': S,
 'S0412L02U04': ('B', "we shouldn't allow this", 'non dovremmo permettere questo'),
 'S0413L02U01': S, 'S0413L03U01': S, 'S0413L04B03': DEL, 'S0413L04U02': S,
 'S0417L02U03': S,
 'S0421L02U01': S,
 'S0426L02U05': S, 'S0426L03B02': S,
 'S0436L01B02': S,
 'S0440L01B02': S, 'S0440L02U02': S,
 'S0445L02U01': ('B', "she couldn't carry that", 'non riusciva a portare quello'),
 'S0445L02U04': ('B', "I'm trying to carry this", 'sto provando a portare questo'),
 'S0446L01U01': ('B', "she couldn't break that", 'non riusciva a rompere quello'),
 'S0446L01U04': ('B', 'we need to break this', 'dobbiamo rompere questo'),
 'S0446L01U05': ('B', "we shouldn't break this", 'non dovremmo rompere questo'),
 'S0450L01U01': ('B', "she couldn't catch that", 'non riusciva a prendere quello'),
 'S0450L01U02': ('B', 'I asked to take that', 'ho chiesto di prendere quello'),
 'S0450L01U04': ('B', 'we need to take this', 'dobbiamo prendere questo'),
 'S0450L01U05': ('B', 'she asked to take that', 'ha chiesto di prendere quello'),
 'S0464L03U04': ('K', 'she forgot it so I told her again'),
 'S0465L02B03': S, 'S0465L02U01': S,
 'S0469L02U01': ('K', "we can't change it so let me ask"),
 'S0470L03B03': ('K', 'to ask before we stop'),
 'S0470L03U02': ('K', 'let me ask before we stop'),
 'S0474L02U06': DEL,
 'S0477L02U01': S,
 'S0480L03U06': DEL,
 'S0488L02B04': S, 'S0488L02U02': S, 'S0488L02U03': S, 'S0488L02U04': S, 'S0488L02U05': S,
 'S0492L01U03': S, 'S0492L03U05': S,
 'S0494L03B04': S,
 'S0501L04B03': ('HOLD', None, 'fidarmi che giochiate senza litigare', '"che giocare" is not grammatical, but the fix (giochiate) is only taught at the NEXT LEGO of seed 501 (L05). Fix now anyway, or delete this BUILD row?'),
 'S0502L02U04': S, 'S0502L04U05': S,
 'S0503L01U02': S, 'S0503L01U04': S,
 'S0505L02B03': S,
 'S0508L02U05': ('K', "there's no point worrying now"),
 'S0509L01U02': S,
 'S0510L03U04': S,
 'S0511L02U04': S,
 'S0512L02U04': S,
 'S0514L01U03': ('K', 'I found what I wanted'),
 'S0514L01U04': ('K', 'I found this today'),
 'S0514L02B03': S, 'S0514L02U03': S,
 'S0517L01B03': ('B', "they're trying to come together", 'stanno provando a venire insieme'),
 'S0518L04U04': S,
 'S0521L01U05': S,
 'S0529L01U04': ('B', 'can you all finish this?', 'potete finire questo?'),
 'S0529L03U05': ('K', 'can you all finish?'),
 'S0533L01U05': ('K', 'is what you say true?'),
 'S0534L01B02': S,
 'S0538L02U04': S, 'S0538L02U05': S,
 'S0543L01U02': S,
 'S0547L02U01': S,
 'S0551L01U05': ('T', 'so che la chiesa è qui da qualche parte'),
 'S0559L02U04': ('K', 'the path through the wood is somewhere here'),
 'S0563L02U05': ('HOLD', None, None, 'LEGO "to keep going any longer | continuare ancora a lungo" only works in a negative; "keep going a little longer" has no "a little". Any fix rewrites the phrase — your wording?'),
 'S0569L01U03': S,
 'S0569L01U04': ('T', 'hai già deciso quanto?'),
 'S0569L02U05': S,
 'S0571L02U01': ('K', "I'm not convinced that would be a good idea"),
 'S0573L03U05': ('K', 'it makes things even more special'),
 'S0581L02B03': ('K', 'will you tell me a little more about what it\'s like'),
 'S0585L02U04': S, 'S0585L02U05': S,
 'S0586L01U03': S, 'S0586L02U05': S,
 'S0590L02U02': ('HOLD', 'I saw the last bus leaving now', None, '"just now" | "adesso" — adesso does mean "just now" here; I read this as idiom, not a defect. Keep?'),
 'S0592L02U04': S,
 'S0597L04U04': ('HOLD', None, "c'erano cento persone", "\"there were\" wants c'erano, which no LEGO teaches (c'era appears only in seed 279's sentence). Accept, or keep erano?"),
 'S0600L01U02': S,
 'S0607L01U05': S,
 'S0612L01B03': ('K', 'we would have bought something here'),
 'S0618L03U05': S,
 'S0619L02U04': ('HOLD', None, None, '"how long since when we first met" is not English, and "since we first met" no longer holds the LEGO "since when". Your wording?'),
 'S0628L01B04': S,
 'S0629L01U01': ('HOLD', 'do you want milk in the coffee?', 'vuoi il latte nel tuo caffè?', 'Italian drops the possessive (nel caffè = in your coffee). Same question as the keys row: idiom, or add tuo / drop "your"?'),
 'S0629L01U04': ('HOLD', None, 'vuoi il latte nel tuo tè?', 'Same as S0629L01U01.'),
 'S0629L01U07': ('HOLD', None, "vuoi un po' di latte nel tuo caffè?", 'Same as S0629L01U01.'),
 'S0634L01U03': S,
 'S0639L01U01': ('K', 'how can I help, sir?'),
 'S0639L01U04': ('K', 'I can help, sir'),
 'S0639L01U07': ('K', 'can I help now, sir?'),
 'S0656L02B04': ('K', 'to stay with you all'),
 'S0657L01B04': ('DEL', 'no reword keeps the LEGO "come vi sentite" (the fix "vi sentite bene" drops come), so the BUILD row is deleted; 3 BUILD rows remain'),
}
# knock-on sweep (same patterns, rows #195 did not flag)
EXTRA = {
 'S0324L02U01': ('T', 'ha detto che ha entrambe le mani', 'stray adesso (same pattern as S0351L01B02, S0356L01U06)'),
 'S0302L02U06': ('HOLD', None, 'vuoi vivere in una città o altrove?', 'Knock-on of S0302L01U01: "somewhere else" | "da qualche parte" — altrove is only taught at seed 611.'),
 'seed 571': ('HOLD', None, None, 'Seed-level: seed 571 itself reads "I\'m not convinced that would be a very good idea | non sono convinto che sarebbe una buona idea" — "very" has no Italian. Its phrase S0571L02U01 is fixed by dropping "very"; the seed is yours (molto buona idea / ottima idea are not taught).'),
 'S0464L02U05': ('HOLD', None, None, 'Knock-on: "she was somewhere else" (mind elsewhere) | "lei era da qualche parte" says she was somewhere. Your wording?'),
}

def main(findings, live):
    F = {r['id']: r for r in (json.loads(l) for l in open(findings)) if r['course'] == 'ita_for_eng' and r['bucket'] == 'phrase-defect'}
    missing = set(F) - set(D); extra = set(D) - set(F)
    assert not missing and not extra, (missing, extra)
    ph = {}
    for s in json.load(open(live))['seeds']:
        for l in s.get('legos') or []:
            for p in l.get('basket_phrases') or []: ph[p['id'].split(':')[-1]] = p
    fixes, held = [], []
    def row(i, now, dec, why):
        k = dec[0]
        if k == 'S':
            r = F[i]
            if r['fix'] == 'delete': fixes.append([i, r['cause'], now, None, why]); return
            fk, ft = r.get('fixed_known'), r.get('fixed_target')
            fixes.append([i, r['cause'], now, [None if fk in (None, now[0]) else fk, None if ft in (None, now[1]) else ft], why])
        elif k == 'K': fixes.append([i, cls, now, [dec[1], None], why])
        elif k == 'T': fixes.append([i, cls, now, [None, dec[1]], why])
        elif k == 'B': fixes.append([i, cls, now, [dec[1], dec[2]], why])
        elif k == 'DEL': fixes.append([i, cls, now, None, why + ' — ' + (dec[1] if len(dec) > 1 else 'reworded it would be an exact twin of a sibling in the basket, so deleted')])
        elif k == 'HOLD': held.append({'id': i, 'seed': int(i[1:5]), 'now': now, 'proposal': [dec[1], dec[2]], 'reason': dec[3]})
    for i, dec in sorted(D.items()):
        r = F[i]; cls = r['cause']; now = [r['known'], r['target']]
        row(i, now, dec, f"#195 {r['severity']}/{r['cause']}: {r['what']}")
    for i, dec in sorted(EXTRA.items()):
        if i.startswith('seed '): held.append({'id': i, 'seed': int(i[5:]), 'now': ['I\'m not convinced that would be a very good idea', 'non sono convinto che sarebbe una buona idea'], 'proposal': [dec[1], dec[2]], 'reason': dec[3]}); continue
        p = ph[i]; cls = 'knock-on'; now = [p['known_text'], p['target_text']]
        if dec[0] == 'HOLD': held.append({'id': i, 'seed': int(i[1:5]), 'now': now, 'proposal': [dec[1], dec[2]], 'reason': dec[3]})
        else: fixes.append([i, cls, now, [None, dec[1]], 'knock-on sweep: ' + dec[2]])
    return fixes, held

if __name__ == '__main__':
    fixes, held = main(sys.argv[1], sys.argv[2])
    print("'use strict';\n// GENERATED by ops/ita-mismatch-36/decisions.py — edit there, not here (job #36, Kai 2 Nov 2026).\n// Rows: [id, class, [known now, target now], [known fix | null, target fix | null] | null (= delete), why].")
    print('const FIXES = ' + json.dumps(fixes, ensure_ascii=False, indent=0) + ';')
    print('const HELD = ' + json.dumps(held, ensure_ascii=False, indent=0) + ';')
    print('module.exports = { FIXES, SEED_FIXES: [], LEGO_FIXES: [], HELD };')
