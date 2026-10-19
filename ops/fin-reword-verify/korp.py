import json,sys,urllib.request,urllib.parse
# usage: python3 korp.py 'cqp' corpora  -> hits + 2 examples
cqp,corp=sys.argv[1],sys.argv[2]
q=urllib.parse.urlencode({'corpus':corp,'cqp':cqp,'start':0,'end':2,'default_context':'1 sentence','show':'word'})
try:
  s=urllib.request.urlopen('https://www.kielipankki.fi/korp/api8/query?'+q,timeout=180).read().decode()
  d=json.loads(s)
except Exception as e:
  print('SERVER-ERROR',str(e)[:100]); sys.exit()
if 'ERROR' in d: print('ERR',d['ERROR']); sys.exit()
print(d.get('hits'),end='  | ')
for k in d.get('kwic',[])[:2]: print(' '.join(t['word'] for t in k['tokens'])[:160],end=' || ')
print()
