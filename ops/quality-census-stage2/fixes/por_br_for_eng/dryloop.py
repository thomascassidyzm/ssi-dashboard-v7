import json,re,subprocess,sys
ops=json.load(open('ops.json'))
def w(t):return re.sub(r'[^\w\s\']','',t.lower().replace('’',"'")).split()
allowed=json.load(open("allowed.json"))
for it in range(80):
  body=json.dumps({'ops':ops},ensure_ascii=False).encode()
  r=subprocess.run(['curl','-s','-X','POST','http://localhost:3470/api/production/por_br_for_eng/edit-batch','-H','Content-Type: application/json','-H','x-agent-id: cs-432-por-br-census-fix','-H','x-agent-role: census-fix','--data-binary','@-'],input=body,capture_output=True)
  d=json.loads(r.stdout)
  if d.get('code')!='TEXT_MISMATCH':
    json.dump(d,open('dry.json','w'),ensure_ascii=False,indent=1);break
  m=re.search(r'says "(.*)" but the \w+ text is "(.*)" \(allow',d['error'],re.S)
  i=d['index']
  if not m or w(m.group(1))!=w(m.group(2)):
    print('REAL MISMATCH',d['error']);sys.exit(1)
  ops[i]['allow_text_mismatch']=True;allowed.append((i,ops[i].get('phrase_id') or ops[i].get('seed_number'),m.group(1),m.group(2)))
json.dump(ops,open('ops.json','w'),ensure_ascii=False,indent=1)
json.dump(allowed,open('allowed.json','w'),ensure_ascii=False,indent=1)
print(len(allowed),'punctuation-only overrides');print({k:v for k,v in d.items() if not isinstance(v,(list,dict))});print(list(d.keys()))
