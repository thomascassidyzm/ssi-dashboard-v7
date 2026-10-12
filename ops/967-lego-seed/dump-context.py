# Read-only: for each LEGO id in a json list, print seed, LEGO, components, and every non-component phrase on that lego_index.
import json,subprocess,sys,re,os
def q(sql):
    r=subprocess.run(['psql',os.environ['DATABASE_URL'],'-At','-c',f"select coalesce(json_agg(zz),'[]') from ({sql}) zz"],capture_output=True,text=True,check=True)
    return json.loads(r.stdout)
for it in json.load(open(sys.argv[1])):
    m=re.match(r'(.+):S(\d+)L(\d+)$',it['id']); c,s,l=m[1],int(m[2]),int(m[3])
    seed=q(f"select known_text,target_text from course_seeds where course_code='{c}' and seed_number={s}")[0]
    lg=q(f"select known_text,target_text,type,components from course_legos where course_code='{c}' and seed_number={s} and lego_index={l}")[0]
    sib=q(f"select lego_index,known_text,target_text,type from course_legos where course_code='{c}' and seed_number={s} order by lego_index")
    ph=q(f"select phrase_role r,known_text k,target_text t from course_practice_phrases where course_code='{c}' and seed_number={s} and lego_index={l} order by phrase_role,position")
    print(f"\n=== {it['id']} [{it['bucket']}]\nSEED  {seed['known_text']} || {seed['target_text']}\nLEGO  {lg['type']} {lg['known_text']} || {lg['target_text']}\nCOMP  {json.dumps(lg['components'],ensure_ascii=False)}")
    print('SIBS  '+' ; '.join(f"L{x['lego_index']}:{x['known_text']}={x['target_text']}" for x in sib))
    for p in ph: print(f"  {p['r'][:3]} {p['k']} || {p['t']}")
