#!/usr/bin/env python3
"""#447 eng-asia slice (worker #474·AI): turns the live dumps + hit files + this file's HAND VERDICTS into eng-asia.json.
READ-ONLY. Inputs live in $CS_SCRATCH (regenerate with dump-course.py + detect.cjs + the eng-asia patterns).
The verdict lists below are a person-equivalent read of every hit named; nothing here is applied anywhere.
Usage: python3 -I eng-asia.build.py <scratch_dir> <out.json>"""
import json, re, sys, collections
S, OUT = sys.argv[1], sys.argv[2]
C = ['eng_for_jpn', 'eng_for_kor', 'eng_for_zho', 'eng_for_ara']
# known-side length ratio vs English, used ONLY to estimate chars for known prompts that do not exist yet (J1)
RATIO = {'eng_for_jpn': 0.45, 'eng_for_kor': 0.5, 'eng_for_zho': 0.3, 'eng_for_ara': 0.9}
norm = lambda t: re.sub(r'[\s。、，,.!?？！؟]+', '', (t or '').lower())
tok = lambda t: re.findall(r"[^\W_]+(?:['’][^\W_]+)*", (t or '').lower().replace('’', "'"))

def syl(w):
    w = w.lower().replace("'", '').replace('’', '')
    sp = {'something':2,'someone':2,'everyone':3,'everything':3,'evening':2,'every':3,'interesting':4,'different':3,'idea':3,'ideas':3,'really':2,'quiet':2,'being':2,'going':2,'doing':2,'trying':2,'saying':2,'playing':2,'naturally':4,'favourite':3,'family':3,'restaurant':3,'comfortable':4,'actually':4,'usually':4,'probably':3,'the':1,'are':1,'were':1,'were':1,'there':1,'where':1,'here':1,'tired':1,'hour':1,'our':1,'television':4,'unusual':4,'definitely':4,'conversation':4}
    if w in sp: return sp[w]
    if w in ('i', 'a'): return 1
    w2 = re.sub(r'(?<!l)e$', '', w) if len(w) > 2 else w
    w2 = re.sub(r'ed$', 'd', w2) if not re.search(r'[td]ed$', w) else w2
    n = len(re.findall(r'[aeiouy]+', w2)) + (1 if re.search(r'[^aeiou]le$', w) else 0)
    return max(1, n)
rows = []
def add(course, fam, rid, known, target, verdict, fix, conf, canon, chars, source='live row, read 17 Nov'):
    rows.append(dict(course=course, family=fam, row_id=rid, known=known, target=target, verdict=verdict,
                     recommended_fix=fix, confidence=conf, source=source, canon_ref=canon, chars=int(round(chars))))

def load(c):
    D = json.load(open(f'{S}/{c}.json')); H = json.load(open(f'{S}/{c}.hits2.json'))['hits']
    idx = {}
    for s in D['seeds']:
        for l in s['legos']:
            idx[l['id']] = dict(known=l['known'], target=l['target'], seed=s['n'], is_new=l['is_new'], lego=l)
            for p in l['phrases']: idx[p['id'].split(':')[-1]] = dict(known=p['known'], target=p['target'], seed=s['n'], type=p['type'], lego=l)
    return D, H, idx

# ---------------- HAND VERDICTS (read 17 Nov) ----------------
# M = the prompt and the English say different things; G = the known prompt is garbled / not natural;
# Q = the known prompt is a statement or bare clause where the English is a question (needs its question form or ？);
# E = the English is not grammatical / natural (K9); OK = read, not a defect.
JPN_QM = {
 'M': 'S0052L06U05 S0052L06U06 S0053L03U12 S0054L03U11 S0054L03U12 S0061L01U07 S0061L01U11 S0061L01U14 S0061L02U01 S0061L02U10 S0061L03U05 S0061L03U08 S0061L03U09 S0061L03U12 S0061L03U15 S0061L04U04 S0061L04U08 S0061L04U15 '
      'S0063L03U02 S0063L03U10 S0063L03U11 S0063L03U14 S0063L04B05 S0063L04U03 S0066L01U14 S0070L05U03 S0079L01B01 S0079L01B02 S0084L01U05 S0093L01U06 S0099L02U12 S0107L02U04 S0113L01U01 S0113L01U12 '
      'S0127L01B06 S0131L02U09 S0131L05U13 S0138L01U11 S0138L02U13 S0139L02U11 S0139L03U07 S0154L01U05 S0155L01U05 S0155L02U01 S0156L01U11 S0158L01U10 S0158L02U07 S0166L02B05 S0167L02U11 '
      'S0168L03U06 S0169L01U01 S0170L02U01 S0170L02U12 S0190L02U11 S0207L02U09 S0208L01U05 S0250L03U04 S0273L02U02 S0274L01U01',
 'G': 'S0061L03B03 S0061L03B04 S0061L03B05 S0061L03B06 S0063L01U14 S0063L02B06 S0063L02U05 S0063L02U11 S0063L03B03 S0063L03B04 S0063L03B05 S0063L03B06 S0063L03B07 S0063L03U01 S0063L03U03 S0063L03U04 '
      'S0063L03U06 S0063L03U07 S0063L03U08 S0063L03U09 S0063L03U12 S0063L03U13 S0063L03U15 S0063L04B04 S0063L04U02 S0063L04U07 S0063L04U09 S0063L04U12 S0063L04U14 S0075L01B05 S0079L01B06 S0160L01U11 '
      'S0167L03B03 S0167L03B04 S0167L03B05',
 'Q': 'S0021L03B02 S0021L03B03 S0021L03B04 S0154L01B05 S0287L01B01',
 'E': 'S0113L01U10 S0137L01U14 S0183L01B06 S0183L01U01 S0183L01U03 S0183L01U06 S0183L01U08 S0183L01U12 S0183L01U13 S0183L01U14 S0190L03B01 S0190L03B02 S0199L01U08 S0203L01B03 S0257L03U01 S0262L01B04',
}
# rows found by the in-basket "same prompt, different English" read and the seed-sentence read (jpn)
JPN_EXTRA = {
 'M': 'S0052L04U04 S0129L03B06 S0144L02U08 S0155L04B07 S0155L04U04 S0166L02U01 S0166L02U02 S0166L02U03 S0166L05U07 S0204L02U03 S0223L01U06 S0131L03B01 S0076L03U01 S0098L01U06 S0098L02U02 S0098L03U01 '
      'S0099L01U01 S0100L04B07 S0100L04U01 S0109L01U01 S0126L01U01 S0122L03B03 S0131L01U07 S0131L02U04 S0129L01B06',
 'G': 'S0144L01B02 S0144L01B03 S0144L01B04 S0144L01B05 S0144L01B06 S0144L01B07 S0022L03U02 S0063L01B04 S0063L01U01 S0063L02U01 S0065L01U05 S0065L02U01 S0065L03U01 S0065L04U01 S0095L02U01 S0099L02U01 '
      'S0101L01B05 S0101L01U01 S0101L02B05 S0101L02U01 S0152L01U02 S0152L03U03 S0203L02B03',
 'E': 'S0081L01B05 S0183L01B03 S0183L01B04 S0183L01B05 S0183L01B07 S0183L01U15 S0061L03B01 S0061L03B02 S0182L02B01 S0182L02B02 S0250L03B01',
}
KOR = {
 'M': 'S0012L03B03 S0063L02U04 S0154L01U03 S0158L01U01 S0158L01U02 S0155L03U02 S0135L01B03 S0085L01B02 S0094L01B02 S0099L01B03 S0100L02B02 S0140L01U01 S0143L01U02 S0145L01B03 S0145L01U03 '
      'S0146L02U01 S0155L01U01 S0155L01U03 S0157L02U02 S0148L01U01 S0149L02U02 '
      'S0160L01U03',
 'G': 'S0067L01B01 S0201L02B02 S0202L03B02 S0203L02B02 S0205L02B02 S0211L02B02 S0230L01B04 S0232L02B04 S0233L02B03 S0235L02B04',
 'Q': 'S0012L03B01 S0021L01B01 S0021L01B02 S0021L01B03 S0021L03B01 S0021L03B02 S0021L03B03 S0021L03B04 S0081L01B01 S0119L02B01 S0150L01B01 S0150L01B02 S0150L01B03 S0154L01U01 S0154L02B03 '
      'S0155L02U02 S0157L01U05 S0162L01B01 S0167L02B01 S0167L02B03 S0169L01B01 S0169L01B02 S0171L02B01 S0171L02B02 S0175L01B01 S0175L01B02 S0179L02B01 S0179L02B02 S0182L02B02 S0182L02B03 '
      'S0194L01B01 S0194L01B03 S0196L01B01 S0196L01B03 S0201L02B01 S0226L01U05 S0271L01B01 S0271L01B02 S0271L01B03 S0271L02B03 S0281L01B03 S0283L01B03 S0287L01B02 S0287L01B03 S0287L02B03',
 'E': 'S0061L02B02 S0061L02B03 S0150L02B01 S0182L02B01',
}
ZHO = {
 'M': 'S0066L01U01 S0068L01U01 S0069L01U01 S0069L02U03 S0069L02U04 S0070L01U01 S0070L02B04 S0071L01U01 S0071L02U01 S0071L02U05 S0073L02U02 S0073L02U03 S0073L02U04 S0067L01U02 S0067L01U03 '
      'S0064L02B04 S0066L02B04 S0072L01B04 S0034L05U02',
 'G': 'S0028L03U03 S0044L01U06 S0052L01U05 S0150L02B02 S0150L02B03',
 'Q': 'S0075L01B01 S0075L01U05 S0119L01B01 S0150L01B01 S0161L01B01 S0182L01B01 S0196L01B01 S0071L02U04',
 'E': 'S0182L01B02 S0182L01B03 S0182L01B04 S0196L01B02 S0196L01B03 S0196L01B04 S0271L01B02 S0271L01B03 S0271L01B04 S0157L02B02 S0157L02B04 S0150L02B01 S0267L01B02',
}
ARA = {'E': 'S0048L01B02 S0157L02B03 S0061L01B01 S0150L02B01'}
FIX = {
 'M': ('rewrite the KNOWN prompt to say what the English says (or delete the row if the basket keeps enough rows)', 'K2 P16 R0.1', 'known'),
 'G': ('rewrite the KNOWN prompt in natural word order, using the seed\'s own wording', 'K6 (latitude stops at garbled) A16', 'known'),
 'Q': ('give the KNOWN prompt its question form (か / ？ / 吗 / ?) and re-voice the known clip', 'A7 A9', 'known'),
 'E': ('rewrite the ENGLISH as natural, punctuated English (or delete the fragment row)', 'K9', 'target'),
}
def verdict_rows(course, idx, table, fam_prefix):
    seen = set()
    for code, ids in table.items():
        for rid in ids.split():
            if rid in seen or rid not in idx: continue
            seen.add(rid); r = idx[rid]; fx, canon, side = FIX[code]
            ch = (len(r['known'] or '') + (1 if code == 'Q' else 0)) if side == 'known' else 2 * len(r['target'] or '')
            add(course, f'{fam_prefix}-{code}', rid, r['known'], r['target'], 'REAL', fx, 'sure' if code in 'MQ' else 'likely', canon, ch)
    return seen

def common(c, D, H, idx, untaught_fixed, done):
    # untaught target words (P1/K8/K14/K15) — detector re-run with seed words counted at their own seed
    for r in untaught_fixed:
        if r['id'] in done: continue
        if all(w.split('@')[0] in ('dont', 'theyre', 'didnt') for w in r['words']):
            add(c, 'missing-apostrophe', r['id'], r['known'], r['target'], 'REAL', "add the apostrophes (don't, they're, didn't); re-voice only if the clip says 'dont' wrongly (by ear)", 'sure', 'K9', 2 * len(r['target'] or '')); continue
        t = idx[r['id']].get('type')
        if t == 'use': fx, ch = 'delete the row (K15: never add a LEGO for it); reword with taught words only if the basket runs short', 0
        else: fx, ch = 'reword the BUILD row with taught words (K14), else delete', 2 * len(r['target'] or '') + len(r['known'] or '')
        add(c, 'untaught-target-word', r['id'], r['known'], r['target'], 'REAL', fx + ' — untaught: ' + ' '.join(r['words']), 'sure', 'P1 K8 K14 K15', ch)
    for x in H.get('dup_rows', []):
        add(c, 'duplicate-row', x['id'], x['known'], x['target'], 'REAL', f"delete (exact twin of {x['twin']} in the same basket)", 'sure', 'dup rows (spa #189/#212 precedent)', 0)
    for x in H.get('empty_audio', []):
        r = idx[x['id']]; add(c, 'empty-audio', x['id'], r['known'], r['target'], 'REAL', f"render the empty slot(s) {x['empty']} through /api/audio/render", 'sure', 'A16', 2 * len(r['target'] or ''))

out = {}
for c in C:
    D, H, idx = load(c)
    ut = json.load(open(f'{S}/{c}.untaught2.json'))
    done = set()
    if c == 'eng_for_jpn':
        ex = json.load(open(f'{S}/{c}.extra.json'))['known_is_lego_gloss']
        for rid, k, t in ex:
            if rid[:8] in ('S0226L02', 'S0227L01', 'S0227L02', 'S0227L03', 'S0228L01', 'S0229L01', 'S0229L02', 'S0229L03', 'S0230L02'):
                add(c, 'J1-prompt-is-only-the-LEGO', rid, k, t, 'REAL (A16 family, rows not on any list found)', 'write the Japanese for the whole sentence as the known prompt; the clip is then a new known render', 'sure', 'A16 P16 R0.1', RATIO[c] * len(t))
                done.add(rid)
        done |= verdict_rows(c, idx, JPN_QM, 'J2'); done |= verdict_rows(c, idx, JPN_EXTRA, 'J2')
    if c == 'eng_for_jpn':
        for x in H.get('phrase_missing_lego', []):
            if x['id'] in done or x['lego'] == 'seem': continue
            t = idx[x['id']]['type']; done.add(x['id'])
            add(c, 'phrase-missing-LEGO', x['id'], x['known'], x['target'], 'REAL', f"row does not contain its LEGO '{x['lego']}': reword with the LEGO in its taught form" + (' (BUILD)' if t == 'build' else ', or delete (USE)'), 'sure', 'P17 K50', 2 * len(x['target']) + len(x['known']) if t == 'build' else 0)
    if c == 'eng_for_kor': done |= verdict_rows(c, idx, KOR, 'K2')
    if c == 'eng_for_zho': done |= verdict_rows(c, idx, ZHO, 'Z2')
    if c == 'eng_for_ara': done |= verdict_rows(c, idx, ARA, 'A2')
    common(c, D, H, idx, ut, done)
    # LEGOs over 8 syllables (hand recount in the report; listed here as candidates with the builder's estimate)
    for x in H.get('lego_syll_over8', []) + H.get('lego_syll_7_8', []):
        n = sum(syl(w) for w in re.findall(r"[A-Za-z'’]+", x['target']))
        if x['is_new'] and n > 8: add(c, 'lego-over-8-syllables', x['id'], x['known'], x['target'], f'REAL ({n} syllables, hand-checked count)', 'cut to the shortest viable LEGO (Kai 17 Nov); whole-sentence LEGOs split at their clause; a re-cut means new intros + LEGO clips', 'likely', 'L3', 0, f'builder estimate {x["syl"]}, recount {n}')
    # seed sentences never said (P26): absent from every played basket
    snp = json.load(open(f'{S}/{c}.snp.json'))
    for n, cat, k, t, _ in snp:
        if cat == 'seed sentence absent':
            add(c, 'seed-never-said', f'seed {n}', k, t, 'REAL', 'add the seed as a USE row under its last new LEGO, reusing the seed\'s own clips (P26)', 'sure', 'P26', 0)
    out[c] = H


# LEGO-level items (each read with its seed and basket; fixes are best effort from the course's own forms)
# (course, lego, family, problem, fix, confidence, canon, est chars)
LEGOS = [
 ('eng_for_jpn','S0202L02','lego-text','LEGO "didn\'t know how to answer the question" is not in seed 202 "nobody was sure how to answer the question"; its 4 USE rows say "knew"','re-cut to the shortest piece both seeds share: "how to answer the question | 質問にどう答えるか"; U01-U04 then contain it','likely','L26 P17',2*27+10),
 ('eng_for_jpn','S0043L01','dup-debut','"to answer | 答える" is taught as NEW again (first at S0027L02)','mark not-new; seed 43 sentence keeps a played home (P26)','sure','L17 P25',0),
 ('eng_for_jpn','S0207L01','notnew-untaught','not-new, but no earlier LEGO has this pair on both sides','make it NEW (template intro + basket from words taught by 207)','sure','L31',40),
 ('eng_for_jpn','S0257L01','notnew-untaught','"that | あの" not-new with no earlier exact pair','make it NEW (or grow to "that blue thing | あの青いもの" which is the seed\'s piece)','likely','L31',20),
 ('eng_for_kor','S0061L02','lego-text','second "again | 다시" debut in seed 61 (dup of S0061L01); its basket is "could you / could you say? / could you explain?" and seed 61\'s "could you say that" has no LEGO','re-cut S0061L02 to "could you say that | 말해줄 수 있어요" and make its BUILD rows full questions with ?; the 3 fragment rows then contain it','likely','L17 S3 P17',2*19+9),
 ('eng_for_kor','S0090L01','lego-text','LEGO "good | 좋은" is not in seed 90 ("that would be great"); all 8 of its rows say "more slowly"','re-cut to "more slowly | 더 천천히" (in the seed on both sides); rows unchanged','sure','L26 P17',2*11+5),
 ('eng_for_kor','S0109L02','zut','"열심히 일해야 해요" answers "need to work hard" (S0106L03) and "must work hard" (S0109L02); 4 of S0109L02\'s rows say "need to"','unify: give S0109L02 "열심히 일해야만 해요" (해야만 = must) and its 4 rows "must work hard"','likely','K2 L34',2*4*20+16),
 ('eng_for_kor','S0012L01','zut','"싶지 않아요" answers "I wouldn\'t like to" (S0012L01) and "I don\'t want" (rows B02, U01, U02 here and seed 19)','give S0012L01 the softer Korean "…하고 싶지는 않아요" and its 3 rows "I wouldn\'t like to…" in English','best guess','K2 L34',2*3*28+14),
 ('eng_for_kor','S0160L01','phrase-missing-LEGO','LEGO "how | 어떻게"; none of its 6 rows says "how" ("this word in English")','rewrite the 6 rows as "how do you say … in English" shapes, or re-cut to "how do you say | 어떻게 말해요"','likely','P17',6*2*35),
 ('eng_for_kor','S0035L02 S0146L01','zut','"아무것도" answers "anything" (S0035L02) and "nothing" (S0146L01)','put the S0146 one inside its seed piece: S0146L02 already teaches "nothing seems to be working | 아무것도 작동하지 않는 것 같아요", so S0146L01 drops (or goes not-new)','likely','K2 L34',0),
 ('eng_for_kor','S0049L01','lego-text','"that\'s the sort of thing" is not in seed 49 "It\'s like this, if you know what I mean"','English → "it\'s like this"','sure','L26',2*15),
 ('eng_for_kor','S0059L01','lego-text','"have to do" is not in seed 59 ("what I need to do")','English → "need to do"','sure','L26',2*10),
 ('eng_for_kor','S0109L03','lego-text','"in order to learn" is not in seed 109 ("to learn")','English → "to learn"','sure','L26',2*8),
 ('eng_for_kor','S0138L01','lego-text','"here | 여기" — the English seed says "This was where"','English → "this was where" over 여기가 (best cut that avoids a gap)','best guess','L26 L32',2*14),
 ('eng_for_kor','S0083L01','phrase-missing-LEGO','row U03 "I don\'t agree" drops "with" from "I agree with"','"I don\'t agree with that | 저는 그것에 동의하지 않아요"','sure','P17',2*24+15),
 ('eng_for_kor','S0061L01','dup-debut','"again | 다시" taught NEW twice in seed 61 (L01 and L02)','see S0061L02 re-cut','sure','L17',0),
 ('eng_for_kor','S0207L01 S0257L01','notnew-untaught','not-new with no earlier exact pair ("you\'ve done what you needed to do", "blue")','make NEW (intro + basket); seeds 207 and 257 have no other new LEGO','sure','L31 P26',60),
 ('eng_for_kor','seed 200 / 279 / 280','known-seed-gap','the Korean seed leaves out a piece the English must say: 200 drops "make sure" (확실히 하다), 279 drops "left" (남지), 280 drops "had to" (해야 했어요)','add the missing piece to the Korean seed (the LEGOs already carry it: S0200L02 확실히 하려고, S0279L02 남지)','sure','A16 R0.1',3*30),
 ('eng_for_zho','S0011L01','lego-text','"to be able | 我想" — 我想 is "I want"; clashes with S0001L01 "I want | 我想"','known → "能"','sure','K2',1),
 ('eng_for_zho','S0057L01','lego-text','"can\'t remember | 说" — 说 is "to speak" (S0001L02)','known → "记不住"','sure','K2',3),
 ('eng_for_zho','S0059L02','lego-text','"next week | 做" — 做 is "to do" (S0059L01)','known → "下周"','sure','K2',2),
 ('eng_for_zho','S0097L01','zut','"好" answers "well" (S0013L01) and "yes" (S0097L01); seed 97 itself says 是的','S0097L01 known → "是的"','sure','K2 K24',2),
 ('eng_for_zho','S0151L01 S0159L01','zut','"那不是" answers "that wasn\'t" and "that isn\'t what" (Chinese has no tense here)','put each inside its seed piece: "that wasn\'t what I was hoping | 那不是我希望的" and "that isn\'t what I\'m trying to say | 那不是我想说的"','likely','K2 L34',2*45+18),
 ('eng_for_zho','S0012L02','lego-text','"Doesn\'t want" is not in seed 12 ("I wouldn\'t like to"); all 11 rows already say "wouldn\'t like"','English → "Wouldn\'t like"; rows unchanged','sure','L26 P17',2*13),
 ('eng_for_zho','S0026L03','lego-text','"Seems" is not in seed 26 ("as if"); all 8 rows say "as if"','English → "As if" (known 好像 already means it)','sure','L26 P17',2*5),
 ('eng_for_zho','S0033L01','lego-text','"A long time" is not in seed 33 ("How long have you been…")','English → "How long | 多久"','likely','L26',2*8+2),
 ('eng_for_zho','S0055L03','lego-text','"Doesn\'t like" is not in seed 55 ("I don\'t enjoy"); rows mix "don\'t like" and "don\'t enjoy" under one 不喜欢','English → "Don\'t enjoy"; B02 "Don\'t like waking up" → "Don\'t enjoy waking up"; 不喜欢 stays (two Englishes, one Chinese, is fine: K3)','likely','L26 P17 K3',2*11+2*25),
 ('eng_for_zho','S0218L01','lego-text','"How much" is not in seed 218 ("I didn\'t do much"); its 5 rows say "much"','English → "Much"; known → "多少" kept','sure','L26 P17',2*4),
 ('eng_for_zho','S0103L02','lego-text','"More"; its rows say "many" (很多)','re-cut to the seed piece "many more | 更多"? rows say 很多/many, so: English → "Many | 很多" if seed 103 keeps 很多, else rewrite rows','best guess','P17 L26',2*4),
 ('eng_for_zho','S0034L02','lego-text','LEGO "To be quiet"; its 4 rows are "When you are talking" over garbled Chinese "的时候你在说话"','delete the 4 rows; write 4 rows that contain 保持安静 | to be quiet','sure','P17 A16',4*(2*25+8)),
 ('eng_for_zho','S0032L02 S0042L03 S0077L02 S0138L01','gapped-lego','known side has a written gap: 你想...吗, 我开始觉得...了, 对...速度感到惊讶, 这就是...的地方','re-cut each to contiguous seed words with no gap (e.g. "This was where | 这就是"), or grow it to the whole clause','likely','L32',4*12),
 ('eng_for_zho','S0011L04 S0067L01','phrase-missing-LEGO','S0011L04U03 "He wants to come back later on" drops its LEGO "After"; S0067L01U06 "I don\'t know why you want to stop" breaks "Why do you want to stop"','reword U03 with "after"; U06 → "Why do you want to stop? I don\'t understand"','likely','P17 K50',2*35+2*40),
 ('eng_for_zho','S0207L01 S0257L01','notnew-untaught','not-new with no earlier exact pair','make NEW','sure','L31',30),
 ('eng_for_ara','S0049L02','lego-text','"you understand | أنت تفهم" is not in the English seed ("if you know what I mean")','English → "you know"; Arabic seed and LEGO → تعرف ("إذا كنت تعرف ما أقصده")','likely','L26',2*8+30),
 ('eng_for_ara','S0045L02 S0054L01','phrase-missing-LEGO','S0045L02B03 "I want to find out" under LEGO "know"; S0054L01B03 "we didn\'t want to" under "we wanted to"','reword B03 with "know"; S0054L01B03 → "we wanted to" (K50: a different verb form is a break)','sure','P17 K50',2*20+2*12),
 ('eng_for_ara','S0207L01 S0228L02 S0257L01','notnew-untaught','not-new with no earlier exact pair','make NEW','sure','L31',40),
 ('eng_for_jpn eng_for_kor eng_for_zho eng_for_ara','seed 108 (S0108L01/L02)','english-seed','"we didn\'t hope to wake (in the middle of the night)" is not natural English; it is the target in all four courses (LEGO + ~10 rows each)','"we were hoping not to wake up in the middle of the night" (LEGO "we were hoping not to wake"); propose, do not assume: this is the shared English seed text','likely','K9 R0.18',4*(2*45*10)),
]
for c, lid, fam, prob, fx, conf, canon, ch in LEGOS:
    add(c, fam, lid, '', prob, 'REAL', fx, conf, canon, ch)

json.dump(rows, open(OUT, 'w'), ensure_ascii=False, indent=0)
tab = collections.defaultdict(lambda: [0, 0])
for r in rows: tab[(r['course'], r['family'])][0] += 1; tab[(r['course'], r['family'])][1] += r['chars']
for (c, f), (n, ch) in sorted(tab.items()): print(f'{c}\t{f}\t{n}\t{ch}')
for c in C: print(c, 'TOTAL', sum(1 for r in rows if r['course'] == c), sum(r['chars'] for r in rows if r['course'] == c))
