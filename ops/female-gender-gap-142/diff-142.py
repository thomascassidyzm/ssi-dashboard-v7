#!/usr/bin/env python3
"""cs #142: word diff stored_text vs female_text for every bucket=fix clip in the #131 lists, plus the known English
from the #131 slot file. Output: ops/female-gender-gap-142/diff-142-<course>.tsv (clip, changes, stored, female, known)."""
import csv, sys, difflib, re, json, os
SEEDS = sys.argv[1] if len(sys.argv) > 1 else None  # dir holding seeds-<fra|por|spa>.json from GET /api/production/<course>/seeds
for c in ['fra_for_eng','por_for_eng','spa_for_eng']:
    seed = {}
    if SEEDS:
        for x in json.load(open(os.path.join(SEEDS, f'seeds-{c[:3]}.json')))['seeds']: seed[x['seed_number']] = x['known_text'] + ' = ' + x['target_text']
    known = {}
    for r in csv.DictReader(open(f'ops/female-gender-gap-131/slots-131-{c}.tsv'), delimiter='\t'):
        known.setdefault(r['clip'], r['known'])
    out = open(f'ops/female-gender-gap-142/diff-142-{c}.tsv','w')
    out.write('clip\tchanges\tstored_text\tfemale_text\tknown\tseeds\tseed_text\n')
    for r in csv.DictReader(open(f'ops/female-gender-gap-131/clips-131-{c}.tsv'), delimiter='\t'):
        if r['bucket'] != 'fix': continue
        a = re.findall(r"[\w'’-]+", r['stored_text']); b = re.findall(r"[\w'’-]+", r['female_text'])
        ch = []
        for op,i1,i2,j1,j2 in difflib.SequenceMatcher(a=a,b=b,autojunk=False).get_opcodes():
            if op!='equal': ch.append(' '.join(a[i1:i2])+'>'+' '.join(b[j1:j2]))
        out.write('\t'.join([r['clip'],'; '.join(ch),r['stored_text'],r['female_text'],known.get(r['clip'],''),r['seeds'],' / '.join(seed.get(int(n),'') for n in r['seeds'].split(',') if n.strip().isdigit())])+'\n')
