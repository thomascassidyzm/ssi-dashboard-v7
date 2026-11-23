exec(open('build2.py').read())
# recompute taught check with inventory-as-of-seed
for n,s,rows in out:
  invn=[x for x in inv if x['seed']<=n]
  def tiles(pt):
    st=pt.split(); texts=[toks(x['text']) for x in invn]
    ok=[False]*(len(st)+1); ok[0]=True
    for i in range(len(st)):
      if ok[i]:
        for lt in texts:
          if lt and match_at(st,i,lt): ok[i+len(lt)]=True
    return ok[-1]
  print(f"HC{n:02d}", s['target_text'])
  for r in rows:
    if not r['new']: continue
    good=[p for p in r['cands'] if tiles(key(p['target_text']))]
    same=[p for p in good if p['lego_id']==r['src']['lego_id']]
    r['good']=good
    print('   NEW',r['tag'],repr(r['text']),'src',r['src']['lego_id'], 'cands',len(r['cands']),'buildable',len(good),'from own basket',len(same))
    for p in sorted(good,key=lambda p:len(p['target_text']))[:6]: print('        ',p['id'].split(':')[1],p['target_text'],'=',p['known_text'],'|a' if p['target1_audio_id'] and p['target2_audio_id'] else '|-')
pickle.dump(out,open('out.pkl','wb'))
