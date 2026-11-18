import json,glob,re,collections,os
S=os.environ['CS_SCRATCH']+'/r/'
RULES=[ # (family key, regex over "slice|family")
('BARE', r'bare-LEGO build'),
('FLAGS', r'taught as new twice|NEW twice|new twice|not-new|notnew|dup.debut|duplicate debut|Y\. not-new|Z\. same LEGO'),
('EMPTY', r'empty.?audio|empty English|Empty audio|E1 empty|empty audio slot'),
('PROMPT', r'J1-|J2-[MGQ]|K2-[MGQ]|Z2-[MGQ]|known prompt does not match|known-seed-gap|known-side wording|known-side grammar|A2-E'),
('NONSENSE', r'T1a|T1b|T2a|T2b|T3 |sin_template|sin_nonsense|sin_filler|tag-glue|in English. tag|bare-LEGO build|today_tail|bare yes/no echo'),
('ENGRAM', r'J2-E|K2-E|Z2-E|en_grammar|missing.apostrophe|English prompt ungrammatical|ungrammatical English|broken LEGO English|english-seed|lex:embedded|lex:perfect|lex:reported|J4'),
('CARRY', r'PRIORITY|435-fix|think \(that\)|want-moechte|like-wue|dort|pensar em|European forms|time-after-modal|K55|我想|Japanese-only|fand-for|moegen|wann-question|k46|k48|english-side-in-swiss|old-man|se voir|need for help|until after|happening|^spa\|spa_mx_for_eng\|[B-SU]\. |dup-debut|verb-lego-no-pronoun'),
('GENDER', r'gender label|component speaker form|plain-register'),
('UNTAUGHT', r'untaught|before it is taught|not yet taught|word form not yet|AC\. untaught|P3 untaught|B6 untaught|P2 "she|F\. Words used|seed word no LEGO|E\. Seed words no LEGO|coverage gap|never-taught'),
('P26', r'never said|not in a played basket|seed.(sentence )?not.played|seed-not-played|seed_not_played|seed-never-said|Seed sentence|seed never said|seed sentence lost|S1 seed copy|S2 seeds with no|AE\. seed|F9 seed|C\. Seed sentence|seed Korean never'),
('L26', r'not in its seed|not-in-seed|not_in_seed|literal|invented gloss|dictionary-style|LEGO English the seed|L26|drifted|LEGO target is not|LEGO text wrong|lego-text|X\. LEGO says|H\. LEGO English|F2 LEGO not|B2 LEGO English|P4 LEGO English|en_adds_word|T\. seed English|cut mid-construction|LEGO not in its own seed|F1 particle|F11'),
('P17', r'not contain|drills|does not drill|basket-not-drilling|missing.LEGO|missing_lego|phrase-missing|AD\. row|G row does|D\. Phrases|P5 practice rows|seed copy parked|off-LEGO|F6 phrase|W\. LEGO vs USE|J\. Taught form'),
('ZUT', r'ZUT|zut|one prompt, two|One English|one English|two answers|V\. LEGO clash|one known, two'),
('QMARK', r'question|qmark|F10'),
('FORMAL', r'formal|sir/madam|you guys|gnaedige'),
('FLAGS', r'taught as new twice|NEW twice|new twice|not-new|notnew|dup.debut|duplicate debut|Y\. not-new|Z\. same LEGO'),
('DUP', r'duplicate|dup.rows|dup-rows|Same row twice|same row twice|D1 exact|AA\. dup|L\. Duplicate'),
('LONG', r'over 8|over-8|over_8|8.syllable|lego-over'),
('GAPPED', r'gapped|E gapped'),
('TGRAM', r'grammar error|P1 she|P6 single|F3 |F3b|F4 wrong|F7 two|disfrutar|tomar|could I have|practicar|pense pas|grand-chose|che potessi|Wrong Italian|wrong Korean|seed Korean wrong|E wrong word|the one|possa|learn her name|一会儿|English word in the Chinese|reflexive|wrong-case|contradictory|indirect question'),
('TO', r'without .to.|without its subject'),
]
rows=collections.defaultdict(lambda:collections.defaultdict(lambda:[0,0]))
unm=collections.Counter()
for f in sorted(glob.glob(S+'*.json')):
  sl=os.path.basename(f)[:-5]
  for r in json.load(open(f)):
    if not isinstance(r,dict): continue
    v=str(r.get('verdict','')).upper()
    if not v.startswith('REAL'): continue
    fam=str(r.get('family'));key=f'{sl}|{r.get("course")}|{fam}'
    if fam.startswith('B LEGO drifted'): key='L26 '+key
    k='L26' if key.startswith('L26 ') else next((k for k,re_ in RULES if re.search(re_,key,re.I)),None)
    if not k: unm[(sl,r.get('course'),fam)]+=1; k='OTHER'
    try: ch=int(r.get('chars') or 0)
    except: ch=0
    rows[k][r.get('course')][0]+=1; rows[k][r.get('course')][1]+=ch
for k in [x[0] for x in RULES]+['OTHER']:
  t=rows[k]; print(f"\n## {k}: rows {sum(v[0] for v in t.values())} chars {sum(v[1] for v in t.values())}")
  print('  '+'; '.join(f"{c} {v[0]}/{v[1]}" for c,v in sorted(t.items(),key=lambda x:-x[1][0])))
print('\nUNMATCHED'); [print(' ',k,n) for k,n in unm.most_common()]
json.dump({k:{c:v for c,v in t.items()} for k,t in rows.items()},open(os.environ['CS_SCRATCH']+'/fam.json','w'))

# examples: first REAL row from the 3 biggest courses per family
ex=collections.defaultdict(lambda:collections.defaultdict(list))
for f in sorted(glob.glob(S+'*.json')):
  sl=os.path.basename(f)[:-5]
  for r in json.load(open(f)):
    if not isinstance(r,dict) or not str(r.get('verdict','')).upper().startswith('REAL'): continue
    fam=str(r.get('family'));key=f'{sl}|{r.get("course")}|{fam}'
    if fam.startswith('B LEGO drifted'): key='L26 '+key
    k='L26' if key.startswith('L26 ') else next((k for k,re_ in RULES if re.search(re_,key,re.I)),'OTHER')
    if len(ex[k][r['course']])<1: ex[k][r['course']].append((r.get('row') or r.get('row_id'),r.get('known'),r.get('target'),str(r.get('recommended_fix') or r.get('fix'))[:110]))
import sys
if len(sys.argv)>1:
  for k in sys.argv[1:]:
    print('\n#',k)
    for c,_ in sorted(rows[k].items(),key=lambda x:-x[1][0])[:5]:
      for e in ex[k][c]: print(' ',c,'|',' | '.join(str(x)[:120] for x in e))
