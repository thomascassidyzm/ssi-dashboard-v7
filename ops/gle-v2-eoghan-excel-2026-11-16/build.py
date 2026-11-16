# Builds the sheet for Eoghan (gle_v2_for_eng), mirroring his Bileog1 row for row (cs #251·AI, 16 Nov 2026).
#   python3 -I build.py <live seeds: Popty GET /api/production/gle_v2_for_eng/seeds, or live-snapshot-2026-11-16.json>
# Columns: A = our live Irish, B = our live English, C = our comment (blank where ours is his line), D = empty, for him.
# Comment sources, in order: HAND (written for the live text quoted beside it; the build FAILS if live has moved on, so
# a stale comment can never ship), then the notes already sent to him in ../gle-v2-eoghan-seedlist (the 12 Nov list),
# tidied. PLANNED holds #250·AI's wording for rows the #107·AI plan will rewrite: used only once live equals it.
import csv,json,re,sys,zipfile,os
from xml.sax.saxutils import escape
HERE=os.path.dirname(os.path.abspath(__file__))
live={s['seed_number']:s for s in json.load(open(sys.argv[1]))['seeds']}
his=[r for r in json.load(open(os.path.join(HERE,'his-bileog1.json')))[1:]]
base={int(r['Seed']):r for r in csv.DictReader(open(os.path.join(HERE,'..','gle-v2-eoghan-seedlist','irish-seed-list-for-eoghan.csv')))}
nrm=lambda s:' '.join(re.sub(r"[^\w ]",'',(s or '').lower().replace('’',"'")).split())
def options(t):
    t=re.sub(r'\[[^\]]*\]','',t or '')
    t=re.sub(r'\((?=[^)]*\b(?:means|is|=|more|ne|on her|she and|sport|the person|buartha|sásta|nóiméad|Ní raibh)\b)[^)]*\)?','',t)   # his notes in brackets
    return [nrm(x) for x in re.split(r'\s/\s|\s/(?=\S)',t) if nrm(x)]
EN="We kept our English (the English sentences are shared by all our courses, so we only change them when the Irish can't follow)."
TMIAN="'want' is 'is mian liom' throughout, as you suggested."
LIKE="We use 'is maith liom' for 'I like (doing)', which learners have from early on, and 'bain taitneamh as' for 'enjoy'. Your 'taitníonn … liom' is lovely too, but we'd rather keep one way of saying 'like' for beginners."
HAND={
 12:("níor mhaith liom buille faoi thuairim a thabhairt faoin rud a tharlóidh amárach","We took your 'faoin rud'. We wrote 'a tharlóidh' ('that will happen') rather than 'a tharlófar', which is the impersonal form. Is that OK? (We may still change this early sentence; if we do, we will send you the new one.)"),
 27:("Ní maith liom an iomarca ama a chaitheamh le freagra a thabhairt",LIKE+" Is this OK?"),
 55:("Ní bhainim taitneamh as dúiseacht nuair nár chodail mé go maith","We kept our English. "+LIKE+" Is 'Ní bhainim taitneamh as dúiseacht' OK here?"),
 120:("Tá sé suimiúil gur maith leat dul ar an mbus","We took your 'gur maith leat' and kept 'Tá sé suimiúil'. "+LIKE+" Is this OK?"),
 121:("Tá sé neamhghnách nach maith leat do charr a úsáid",LIKE+" Is this OK?"),
 239:("is maith le mo mháthair léamh",LIKE+" Is this OK?"),
 240:("Ní maith le m'athair stopadh ag caint",LIKE+" Is this OK?"),
 64:("Níl sé éasca Gaeilge a fhoghlaim ach tá sé spraíúil","We kept 'tá sé spraíúil' for 'it is fun' (focloir.ie gives 'spraíúil' for 'fun', as in 'a fun way to learn'), and plain 'Gaeilge' as elsewhere in the course. Is this OK?"),
 109:("caithfidh muid obair go dian chun a lán focal nua a fhoghlaim","Thank you: we've taken your 'chun'. We use 'caithfidh muid' rather than 'caithfimid', because we use 'muid' for 'we' in every tense. Is this OK?"),
 117:("Tá mé cinnte go bhfuil mé ag déanamh níos fearr ná an uair dheireanach ar labhair muid le chéile","We have a shorter version for now, built from words learners already have, with 'tá mé' for 'táim' and 'labhair muid' for 'labhraíomar' (we use those two-word forms throughout). Is this OK?"),
 153:("Ní déarfainn é ar an mbealach céanna díreach","We took your 'Ní déarfainn'. We kept 'ar an mbealach céanna díreach', because learners already have 'bealach' for 'way'. Is this OK?"),
 219:("bhí sé go deas scíth a ligean ar feadh tamaill","We left out 'ár': learners first meet 'to relax' as plain 'scíth a ligean', and a few sentences later as 'mo scíth a ligean'. Is plain 'scíth a ligean' OK here?"),
 220:("ar fhéach tú ar bheagán teilifíse?","The English asks about one occasion ('did you watch a bit'), so we kept the past tense. Is 'ar fhéach tú ar bheagán teilifíse?' OK?"),
 248:("cheap mé go raibh an scannán go hiomlán uafásach agus tá m'airgead ar ais uaim",EN+" We use 'tá … uaim' for 'I want' + a thing. For 'complete rubbish' we wrote 'go hiomlán uafásach' ('completely awful'); the dictionary gives 'praiseach' as 'a mess', which felt further from 'rubbish'. Is ours OK, or what would you say?"),
 294:("Níl dóthain ama agam glaoch ort anocht","We read 'Níl bheidh' as a slip, and kept our shorter 'glaoch ort' ('to call you'). Is this OK?"),
 300:("Ní mian léi a bheith míchairdiúil","Ours says 'to be unfriendly'. We would like to take your 'cuma mhíchairdiúil' to get 'seem', but with 'go mbeadh': after 'want' we always use the conditional in the 'go' clause, so it would be 'Ní mian léi go mbeadh cuma mhíchairdiúil uirthi'. Does that sound right? (We also wrote 'ní mian' without the h.)"),
 318:("Ní cheapaim, i mo thuairim féin ní fhéadfadh sí é a thabhairt léi an uair seo",EN+" For 'in my opinion' we now use 'i mo thuairim féin' (as the dictionary at focloir.ie gives it, and as you wrote at 618), so all three sentences that say 'in my opinion' (318, 597, 618) match. We kept 'an uair seo' for 'this time'. Is this OK?"),
 392:("an páiste sin leis an ngruaig dhubh os comhair an phoist","We kept a shorter line that follows the English ('with the black hair'), using words learners already have, with 'sin' for 'that child' and 'an phoist' for 'the post office'. Is this OK?"),
 408:("Ba chóir, sin an bealach is fearr chun teaghlach sona a dhéanamh","We took your 'teaghlach'. 'Ba chóir' answers the question at 407. We kept 'a dhéanamh' because the English says 'make a happy family'; your 'a choinneáil sona' is 'keep happy'. Is this OK?"),
 414:("an bhféadfadh muid buidéal fíona dheirg a fháil le do thoil?",EN+" We use 'an bhféadfadh muid' ('muid' for 'we' in every tense), and 'fíona dheirg': 'fíon' is masculine, so 'dearg' after it becomes 'dheirg'. Is this OK?"),
 433:("Ní fhéadfadh siad fáil amach cathain a thosaigh an scannán","We used 'ní fhéadfadh siad', the 'féad-' form you use for 'could' in most sentences (311 to 314, 358, 412 to 414, 435). Is this OK?"),
 434:("an bhféadfadh siad líon na mac léinn a ghlacann siad a laghdú?","We used 'an bhféadfadh siad', the 'féad-' form you use for 'could' in most sentences; 435 then answers it with 'd'fhéadfadh'. Is this OK?"),
 457:("cuid den fhadhb ná líon na réimsí éagsúla",EN+" We kept 'cuid den fhadhb ná …', the same 'ná' pattern you use at 609 ('an rud ciallmhar … ná ceist a chur'), and plain 'réimsí' for 'areas'. Is this OK?"),
 472:("cuid den fhadhb ná nach bhfuil na fíricí ar eolas againn","We kept 'cuid den fhadhb ná …' so this matches 457 and keeps the English order. Is this OK?"),
 552:("Tá cuma ghránna ar an séipéal atá ar an taobh eile den tsráidbhaile","This sentence already had your September correction, 'cuma ghránna ar an séipéal'; your sheet was written over the older text. We write 'den tsráidbhaile' with 't', the standard form after 'den'. Is this OK?"),
 570:("cé mhéad atá tú toilteanach a íoc ar do thicéad?","We took 'toilteanach' from your later notes. Is this OK?"),
 597:("I mo thuairim féin, tá na céadta scéal cloiste aige faoi",EN+" For 'in my opinion' we use 'i mo thuairim féin', as at 318 and 618. We took your 'na céadta scéal'. Is this OK?"),
}
HAND.update({
 43:("Ní raibh mé ag smaoineamh faoin bhfreagra a thabharfainn","Your line, with the fada on 'mé'."),
 65:("Tá sé tábhachtach am a chaitheamh chun tú féin a thástáil","Your line, spelt 'chaitheamh'."),
 176:("fiafróidh mé de an mbeidh sé in ann cabhrú linn an bhliain seo chugainn","Your line, with 'an' added before 'bhliain'. Is this OK?"),
 353:("ba ghá di rith timpeall na páirce","Your line, spelt 'ba ghá di' (no fadas)."),
 355:("an raibh gá di labhairt leis an mbean sin a bhfuil aithne agat uirthi?","Your line, spelt 'di' (no fada)."),
 510:("D'imigh sí chun áit shábháilte a fháil agus an carr a phairceáil ann","We used the wording you sent us later for this one, spelt 'shábháilte'. Is this OK?"),
 577:("Tá muid ag fanacht leis an scéal ón ospidéal","We used the wording you sent us later ('an scéal', since 'nuacht' is the news on TV). Is this OK?"),
})
HAND.update({   # older open questions settled by us, and notes refreshed where the Irish has since changed
 99:("ba chóir duit ceist a chur ort féin cén fáth nach bhfuil sé ag obair","We kept plain 'cén fáth' ('why'), which learners already have, rather than 'faoin bhfáth'. Is this OK?"),
 119:("an féidir liom ceist a chur ort faoi rud éigin sula n-imíonn tú?","We kept 'faoi' for 'about', which learners already have, and 'imeacht' for 'leave' (you mention 'fág' is also fine). Is this OK?"),
 127:("Ní hé sin an chúis ar mhian liom tú a fheiceáil",EN+" We took your 'an chúis'. 'wanted' is 'mian' throughout (here 'ar mhian'), and we kept 'tú a fheiceáil' for 'to see you'. Is this OK?"),
 137:("Tá sé níos tábhachtaí labhairt go minic ná a bheith foirfe","'than' is 'ná' in every other sentence (42, 87, 117), so we kept 'ná' here and keep 'seachas' for 'instead of' (502, 523). Is this OK?"),
 154:("cén áit ar mian leat bualadh le chéile oíche Shathairn?",EN+" We used 'mian' for 'want' ('would like' is 'ba mhaith liom', taught separately). We kept 'leat', for one person, and took your 'oíche Shathairn' without 'Dé'. Is this OK?"),
 394:("an cailín sin leis an ngúna buí",EN+" We kept the shorter 'leis an ngúna buí' ('with the yellow dress'), which follows the English and uses words learners already have, and 'sin' for 'that girl'. Is this OK?"),
 407:("nár chóir dúinn iarracht a dhéanamh dea-shampla a thabhairt?",EN+" 'trying' is 'ag iarraidh' and 'try' is 'iarracht a dhéanamh', as you suggested. We use 'ba chóir' for 'should' throughout. Is this OK?"),
 409:("Níor chóir, is cuma cad a dhéanann muid","The answer echoes 'nár chóir…?' at 407. We use 'dhéanann muid' ('muid' for 'we' in every tense). Is this OK?"),
 542:("aon uair a bhíonn fearg ort",EN+" We took your 'bíonn fearg ort', with 'aon uair a bhíonn', as in 'an uair a bhí'. Is this OK?"),
 553:("ceapaim go bhfuil cuma an-ghránna ar an séipéal beag",EN+" This sentence already had your September correction, 'cuma an-ghránna ar an séipéal'; your sheet was written over the older text. Is this OK?"),
 593:("cibé méid a d'argóin mé bhí orm é a roinnt leis fós",EN+" For 'however much I argued' we wrote 'cibé méid a d'argóin mé', so that 'seachas' keeps the one meaning 'instead of' (502, 523). Is this OK?"),
})
# #250·AI's comments, for the text the #107·AI plan will put live (not live on 16 Nov).
PLANNED={
 300:("Ní mian léi go mbeadh cuma mhíchairdiúil uirthi","You wrote 'go mbeidh'. After 'want' we always use the conditional in the 'go' clause, so we kept 'go mbeadh'. Does 'go mbeadh' sound right to you here?"),
 219:("bhí sé go deas mo scíth a ligean ar feadh tamaill","You wrote 'ár scíth'. 'To relax' is taught earlier (110) as 'mo scíth a ligean', and learners use it only about themselves for a long time, so we kept 'mo'. Is 'mo' OK here?"),
 117:("Cinnte dearfa, tá mé ag déanamh níos fearr anois ná mar a bhí á dhéanamh agam ar an uair dheireanach a labhair muid le chéile","Your sentence, with 'táim' written as 'tá mé' and 'labharaíomar' as 'labhair muid' (two words, as we do throughout). The rest is as you wrote it. Still right to your ear?"),
 12:("níor mhaith liom a rá cad a tharlóidh amárach","This one is our own new draft ('I wouldn't like to say what's going to happen tomorrow'). Is it natural?"),
 294:("Níl dóthain ama agam anocht chun glaoch a chur ort","Your line began 'Níl bheidh', which we took to be a slip. Is our reading right?"),
 392:("an páiste sin a bhfuil gruaig dhubh air agus atá ina sheasamh os comhair na hoifige poist","Your line gave 'uirthi / air' and 'ina seasamh / ina sheasamh'; we took the 'him' choices and extended the English to match. The only thing we added is 'sin' for 'that child'. Would you rather leave it out?"),
 220:("An mbíonn tú ag féachaint ar an teilifís mórán?","Just so you know: we've changed the English to 'Do you watch much television?' to match your sentence, and use your Irish."),
 260:("Níl smaoineamh dá laghad agam, ach is féidir liom buille faoi thuairim a thabhairt","We made your sentence longer to teach 'guess' ('I don't have the faintest idea, but I can guess'). Is it natural?"),
 518:("Ní fhéadfainn mé féin a shamhlú leis an bhfadhb dhíreach chéanna","You wrote 'chéanna díreach' here and 'dhíreach chéanna' at 153. We'd like one pattern for 'exactly the same', and 153 comes first, so we used 'dhíreach chéanna'. Is that fine?"),
}
def tidy(t):
    t=re.sub(r"Kai decided to keep '([Tt])á … uaim'","We use 'tá … uaim'",t)
    t=re.sub(r'\bseeds\b','sentences',re.sub(r'\bseed\b','sentence',t))
    return ' '.join(t.split())
rows=[];stale=[];counts={'blank':0,'hand':0,'planned':0,'later':0,'option':0,'base':0}
for r in his:
    n=int(r['A']); s=live[n]; ours=s['target_text']; b=base[n]
    opts=options(r.get('F',''))
    if nrm(ours)==nrm(r.get('F','')) or (opts and nrm(ours)==opts[0]): c=''; counts['blank']+=1
    elif n in PLANNED and nrm(ours)==nrm(PLANNED[n][0]): c=PLANNED[n][1]; counts['planned']+=1
    elif n in HAND:
        if nrm(ours)!=nrm(HAND[n][0]): stale.append(n); c=''
        else: c=HAND[n][1]; counts['hand']+=1
    elif nrm(ours) in opts[1:]:
        c='Ours is your %s option.'%['','second','third','fourth'][opts.index(nrm(ours))]; counts['option']+=1
    else:
        assert nrm(b['Irish now (our draft)'])==nrm(ours),('base note written for other text',n)
        bh=options(b['Your Irish'])
        later = bh and nrm(ours)==bh[0] and nrm(b['Your Irish'])!=nrm(r.get('F',''))
        w=tidy(b['Why we differ']); q=tidy(b['Our question for you'])
        if later:
            c=('We used the wording you sent us later for this one.'+(' '+w if w and 'Same' not in b['Same as yours?'] else '')).strip(); counts['later']+=1
        elif not w and not q:
            stale.append(n); c=''
        else:
            c=(w+' '+q).strip(); counts['base']+=1
        if c and not c.rstrip(' )').endswith('?'): c+=' Is this OK?'
    rows.append((n,ours,s['known_text'],c))
assert not stale, ('rows needing a hand-written comment', stale)
H=['Gaeilge (anois)','English','Ár nóta / Our comment','Do thuairimí / Your comments']
with open(os.path.join(HERE,'gle-v2-sheet-for-eoghan.csv'),'w',newline='') as f:
    w=csv.writer(f); w.writerow(['Seed']+H); [w.writerow([n,a,b,c,'']) for n,a,b,c in rows]
print(counts, sum(1 for x in rows if x[3]))
col=lambda i:chr(65+i)
def cell(ci,ri,v,st): return f'<c r="{col(ci)}{ri}" t="inlineStr" s="{st}"><is><t xml:space="preserve">{escape(str(v))}</t></is></c>'
sh=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="3" width="45" customWidth="1"/><col min="4" max="4" width="70" customWidth="1"/><col min="5" max="5" width="40" customWidth="1"/></cols><sheetData>']
sh.append('<row r="1">'+''.join(cell(i,1,h,1) for i,h in enumerate(['Seed']+H))+'</row>')
for ri,(n,a,b,c) in enumerate(rows,2):
    st=2 if c else 3
    sh.append(f'<row r="{ri}"><c r="A{ri}" s="{st}"><v>{n}</v></c>'+cell(1,ri,a,st)+cell(2,ri,b,st)+(cell(3,ri,c,st) if c else '')+f'<c r="E{ri}" s="4"/></row>')
sh.append('</sheetData></worksheet>')
styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2A8"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF4FF"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="5"><xf/><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="top"/></xf><xf fillId="2" applyFill="1"><alignment wrapText="1" vertical="top"/></xf><xf><alignment wrapText="1" vertical="top"/></xf><xf fillId="3" applyFill="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>'
out=os.path.join(HERE,'gle-v2-sheet-for-eoghan.xlsx')
z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)
z.writestr('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>')
z.writestr('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
z.writestr('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Bileog1" sheetId="1" r:id="rId1"/></sheets></workbook>')
z.writestr('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
z.writestr('xl/styles.xml',styles); z.writestr('xl/worksheets/sheet1.xml',''.join(sh)); z.close()
