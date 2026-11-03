import sys,json,io,urllib.request,os
import numpy as np, librosa, torch
from transformers import Wav2Vec2FeatureExtractor, AutoModelForCTC
from huggingface_hub import hf_hub_download
M='facebook/wav2vec2-xlsr-53-espeak-cv-ft'
fe=Wav2Vec2FeatureExtractor.from_pretrained(M); voc={v:k for k,v in json.load(open(hf_hub_download(M,'vocab.json'))).items()}; model=AutoModelForCTC.from_pretrained(M).eval()
torch.set_num_threads(4)
def fetch(aid):
  p=f'clips/{aid}.mp3'
  if not os.path.exists(p):
    os.makedirs('clips',exist_ok=True)
    req=urllib.request.Request(f'http://localhost:3470/api/production/audio/{aid}/stream',headers={'x-agent-id':'zho-545 polyphone detect (job #545)'})
    open(p,'wb').write(urllib.request.urlopen(req,timeout=60).read())
  return p
def phones(aid):
  y,_=librosa.load(fetch(aid),sr=16000)
  iv=fe(y,sampling_rate=16000,return_tensors='pt').input_values
  with torch.no_grad(): ids=model(iv).logits.argmax(-1)
  seq=ids[0].tolist(); outp=[]; prev=None
  for i in seq:
    if i!=prev and voc.get(i) not in ('<pad>','<s>','</s>','<unk>',None): outp.append(voc[i])
    prev=i
  return ' '.join(outp)
if __name__=='__main__':
  items=json.load(open(sys.argv[1])); out=[]
  for it in items:
    for slot in ('a1','a2'):
      if it.get(slot):
        try: it[slot+'_ph']=phones(it[slot])
        except Exception as e: it[slot+'_ph']='ERR '+str(e)[:80]
    out.append(it); print(it['id'],it['text'],'|',it.get('a1_ph'),'|',it.get('a2_ph'),flush=True)
  json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False)
