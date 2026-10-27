// Builds the two edit-batches for job #157 (North S1647 chi->ti; South S1647 madam removal).
const fs=require('fs');const dir=__dirname;
const rows=(c,list)=>list.map(([id,k0,t0,k,t])=>({op:'phrase.update',phrase_id:`${c}:${id}`,set:{known_text:k,target_text:t},expect:{known_text:k0,target_text:t0}}));
const N='cym_nv2_for_eng',S='cym_sv2_for_eng';
const north=rows(N,[
['S1647L01B01','now, do you speak Welsh?','rŵan, dach chi’n siarad Cymraeg?','now, do you speak Welsh?','rŵan, wyt ti’n siarad Cymraeg?'],
['S1647L01B02','at the moment, do you speak Welsh?','ar hyn o bryd, dach chi’n siarad Cymraeg?','at the moment, do you speak Welsh?','ar hyn o bryd, wyt ti’n siarad Cymraeg?'],
['S1647L01B04','probably, do you speak Welsh?','mwy na thebyg, dach chi’n siarad Cymraeg?','probably, do you speak Welsh?','mwy na thebyg, wyt ti’n siarad Cymraeg?']]);
const south=rows(S,[
['S1647L01B04','you speak it madam at the moment','ŷch chi’n siarad hi madam ar hyn o bryd','do you speak Welsh at the moment?','wyt ti’n siarad Cymraeg ar hyn o bryd?'],
['S1647L01U04','so you speak it madam at the moment','felly ŷch chi’n siarad hi madam ar hyn o bryd','so, do you speak Welsh at the moment?','felly, wyt ti’n siarad Cymraeg ar hyn o bryd?'],
['S1647L01U06','probably you speak it madam','mwy na thebyg ŷch chi’n siarad hi madam','probably, do you speak Welsh?','mwy na thebyg, wyt ti’n siarad Cymraeg?'],
['S1647L01U01','great you speak it madam thank you','bendigedig ŷch chi’n siarad hi madam diolch','great, do you speak Welsh? thank you','bendigedig, wyt ti’n siarad Cymraeg? diolch'],
['S1647L01U05','great you speak it madam','bendigedig ŷch chi’n siarad hi madam','great, do you speak Welsh?','bendigedig, wyt ti’n siarad Cymraeg?']]);
fs.writeFileSync(dir+'/north-batch.json',JSON.stringify({ops:north},null,1));
fs.writeFileSync(dir+'/south-batch.json',JSON.stringify({ops:south},null,1));
