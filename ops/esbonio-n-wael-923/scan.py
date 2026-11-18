"""READ-ONLY scan (job #923, step 2): vowel-final word + separate 'yn' + next word, over seeds, LEGOs, phrases of nv2/sv2. Changes nothing."""
import json,re,sys,collections
VOW='aeiouwyâêîôûŵŷáéíóúẃýàèìòùäëïöü'
ARTP={'y','yr',"'r",'’r','ei','eu','ein','fy','dy','dy’','dy\'','ngh','mh','nh','a','i','e','fy’','pob','pa','rhyw','un','unrhyw'}
rows=collections.defaultdict(lambda: collections.defaultdict(set))
for c in ['cym_nv2_for_eng','cym_sv2_for_eng']:
    d=json.load(open(sys.argv[1]+f'/{c}.json'))
    def add(kind,id,t):
        if not t: return
        toks=re.findall(r"[\w’']+|[^\w\s’']",t.lower().replace("'",'’'))
        for i in range(1,len(toks)-1):
            if toks[i]=='yn' and re.fullmatch(r"[\w’]+",toks[i-1]) and re.fullmatch(r"[\w’]+",toks[i+1]):
                p=toks[i-1]
                if p[-1] in VOW and not p.endswith('’n'):
                    rows[(p,toks[i+1])][c].add((kind,id,t))
    for s in d['seeds']:
        add('seed',s['seed_id'],s['target_text'])
        for l in s['legos']:
            add('lego',l['lego_id'],l['target_text'])
            for p in l.get('basket_phrases') or []: add('phrase',p['id'].split(':')[-1],p['target_text'])
import pickle
out=[]
for (p,n),v in rows.items():
    out.append({'prev':p,'next':n,'nv2':sorted(v.get('cym_nv2_for_eng',[])),'sv2':sorted(v.get('cym_sv2_for_eng',[]))})
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
print(len(out),'pairs',sum(len(o['nv2'])+len(o['sv2']) for o in out),'rows')
