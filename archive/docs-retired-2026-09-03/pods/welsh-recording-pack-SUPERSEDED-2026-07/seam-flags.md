# Seam-pass flagged lines — founder ear (optional review before Saturday)

Every line below hit the pod-0 8-syllable ceiling with **no clean intention boundary**
inside at least one clause, so the seam pass (`tools/insert-ellipsis-seams.cjs`) placed
a '…' at the best available prosodic point instead — a forced mid-clause split, or (one
case) a mechanical fallback split because the LLM output changed more than seam placement.

**32 lines flagged across both dialects** (2 North, 30 South — South has more/longer
clauses than North for equivalent content).

**Default if you say nothing**: readers are native speakers, they breathe where it feels
natural and can edit live at the mic — record as-is, no pre-approval needed. This list is
only here in case you want to eyeball any of them first.

## North (`cym_n_for_eng`) — 2 flagged

### S139 (`cym_n_for_eng:pod-0:SC15-S009`)

- **Before:** Dyma'r union fath o ymarfer sydd ei angen arna i. Dw i'n meddwl y galla i deimlo fo'n newid fy ymennydd i tra dan ni'n siarad! Dw i wir yn gwerthfawrogi dy help di. Ond mae'n syndod pa mor flinedig dw i'n mynd pan dw i'n siarad mewn iaith dw i ddim yn ei siarad yn dda iawn.
- **After:** Dyma'r union… fath o ymarfer… sydd ei angen arna i. Dw i'n meddwl… y galla i deimlo… fo'n newid fy ymennydd i… tra dan ni'n siarad! Dw i wir yn gwerthfawrogi… dy help di. Ond mae'n syndod… pa mor flinedig… dw i'n mynd… pan dw i'n siarad mewn iaith… dw i ddim yn ei siarad… yn dda iawn.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S135 (`cym_n_for_eng:pod-0:SC15-S005`)

- **Before:** Wyt, diolch. Mae'n haws siarad efo un person yn unig. Mae o chydig bach yn anodd meddwl am rywbeth i'w ddeud, cofia. Dw i ddim yn siŵr be i'w ddeud, ond dw i'n teimlo fel taswn i'n gallu siarad digon i ddechrau cael sgyrsiau.
- **After:** Wyt, diolch. Mae'n haws siarad… efo un person yn unig. Mae o chydig bach yn anodd… meddwl am rywbeth i'w ddeud,… cofia. Dw i ddim yn… siŵr be i'w ddeud,… ond dw i'n teimlo… fel taswn i'n… gallu siarad… digon i ddechrau cael sgyrsiau.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

## South (`cym_s_for_eng`) — 30 flagged

### S14 (`cym_s_for_eng:pod-0:SC05-S002`)

- **Before:** Do, hir iawn. Dw i wedi blino'n lân nawr. Nos da. Wela i di fory.
- **After:** Do, hir iawn. Dw i wedi… blino'n lân nawr. Nos da. Wela i di fory.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S19 (`cym_s_for_eng:pod-0:SC06-S005`)

- **Before:** Dw i'n dod o Fanceinion, ond dw i'n byw yn Llundain nawr. A chi?
- **After:** Dw i'n dod o Fanceinion,… ond dw i'n byw… yn Llundain nawr. A chi?
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S4 (`cym_s_for_eng:pod-0:SC01-S004`)

- **Before:** Ydw, mae diwrnod prysur 'da fi heddiw. Gobeithio cei di ddiwrnod da. Wela i di wedyn.
- **After:** Ydw… mae diwrnod prysur 'da fi heddiw. Gobeithio cei di ddiwrnod da. Wela i di wedyn.
- **Reason:** LLM output failed text-fidelity check (changed more than '…' placement) — forced mechanical split applied instead

### S34 (`cym_s_for_eng:pod-0:SC07-S007`)

- **Before:** Gallen i gael dau goffi gwyn a dau goffi du ac un o rheina, os gwelwch yn dda?
- **After:** Gallen i gael dau goffi gwyn… a dau goffi du… ac un o rheina… os gwelwch yn dda?
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S41 (`cym_s_for_eng:pod-0:SC07-S014`)

- **Before:** Ydych chi moyn eistedd i mewn? Ma'r bwrdd wrth y ffenest yn rhydd.
- **After:** Ydych chi moyn eistedd i mewn? Ma'r bwrdd wrth y… ffenest yn rhydd.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S25 (`cym_s_for_eng:pod-0:SC06-S011`)

- **Before:** Dw i'n dysgu Saesneg, ond ddim mewn ysgol. Dw i'n gweithio gydag oedolion. Dw i ar wyliau 'ma gyda fy ngwraig a'r plant. Ry'n ni'n cael amser hyfryd.
- **After:** Dw i'n dysgu Saesneg,… ond ddim mewn ysgol. Dw i'n gweithio… gydag oedolion. Dw i ar wyliau 'ma… gyda fy ngwraig a'r plant. Ry'n ni'n cael… amser hyfryd.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S46 (`cym_s_for_eng:pod-0:SC08-S004`)

- **Before:** Licen i beint o'r cwrw chwerw, os gwelwch yn dda.
- **After:** Licen i beint o'r cwrw chwerw… os gwelwch yn dda.
- **Reason:** LLM output failed text-fidelity check (changed more than '…' placement) — forced mechanical split applied instead

### S56 (`cym_s_for_eng:pod-0:SC08-S014`)

- **Before:** Allwn ni gael tipyn o fara? A phowlen o sglodion i'r bwrdd.
- **After:** Allwn ni gael… tipyn o fara? A phowlen o… sglodion i'r bwrdd.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S69 (`cym_s_for_eng:pod-0:SC09-S011`)

- **Before:** Wrth gwrs. A beth licech chi i'w yfed?
- **After:** Wrth gwrs. A beth licech… chi i'w yfed?
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S64 (`cym_s_for_eng:pod-0:SC09-S006`)

- **Before:** Oes, ma'r eog a'r risotto yn rhydd o glwten. Ma gyda ni rai saladau hefyd.
- **After:** Oes… ma'r eog a'r risotto… yn rhydd o glwten. Ma gyda ni rai saladau… hefyd.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S75 (`cym_s_for_eng:pod-0:SC09-S017`)

- **Before:** A'r bil, pan fyddwch chi'n barod. Allen ni rannu fe?
- **After:** A'r bil… pan fyddwch chi'n barod. Allen ni rannu fe?
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S66 (`cym_s_for_eng:pod-0:SC09-S008`)

- **Before:** Ma'r oen yn ardderchog. Ma fe 'di cael ei goginio'n araf, gyda rhosmari.
- **After:** Ma'r oen yn ardderchog. Ma fe 'di… cael ei goginio'n… araf, gyda rhosmari.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S78 (`cym_s_for_eng:pod-0:SC10-S002`)

- **Before:** Oes, ma nhw lawr yr eil yna, ar y chwith.
- **After:** Oes, ma nhw lawr yr eil yna… ar y chwith.
- **Reason:** LLM output failed text-fidelity check (changed more than '…' placement) — forced mechanical split applied instead

### S84 (`cym_s_for_eng:pod-0:SC10-S008`)

- **Before:** Croeso. Ydych chi yma ar wyliau? Dych chi'n siarad Cymraeg da iawn.
- **After:** Croeso. Ydych chi yma ar wyliau? Dych chi'n siarad… Cymraeg da iawn.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S80 (`cym_s_for_eng:pod-0:SC10-S004`)

- **Before:** Dw i'n meddwl bod rhai 'da ni, ond bydd rhaid i chi edrych i fod yn siŵr.
- **After:** Dw i'n meddwl… bod rhai 'da ni,… ond bydd rhaid i chi edrych… i fod yn siŵr.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S92 (`cym_s_for_eng:pod-0:SC11-S006`)

- **Before:** Oes, ma hi'n edrych dros yr ardd.
- **After:** Oes… ma hi'n edrych dros yr ardd.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S90 (`cym_s_for_eng:pod-0:SC11-S004`)

- **Before:** Bendigedig. Ma'r stafell ar y trydydd llawr, stafell saith cant a naw.
- **After:** Bendigedig. Ma'r stafell ar… y trydydd llawr,… stafell saith cant a naw.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S82 (`cym_s_for_eng:pod-0:SC10-S006`)

- **Before:** Ma'r eli haul lawr fan'na ar y dde, a gewch chi hyd i'r past dannedd jyst rownd y gornel.
- **After:** Ma'r eli haul lawr fan'na… ar y dde,… a gewch chi hyd… i'r past dannedd… jyst rownd y gornel.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S93 (`cym_s_for_eng:pod-0:SC11-S007`)

- **Before:** Am faint o'r gloch ma brecwast yn ca'l ei weini?
- **After:** Am faint o'r gloch… ma brecwast yn… ca'l ei weini?
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S94 (`cym_s_for_eng:pod-0:SC11-S008`)

- **Before:** O hanner awr wedi saith tan ddeg o'r gloch. Ma 'da ni ffrwythau a grawnfwyd neu frecwast wedi'i goginio.
- **After:** O hanner awr wedi saith… tan ddeg o'r gloch. Ma 'da ni ffrwythau a grawnfwyd… neu frecwast… wedi'i goginio.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S100 (`cym_s_for_eng:pod-0:SC12-S001`)

- **Before:** Bore da. Dw i ddim yn teimlo'n dda iawn — allwch chi argymell rhywbeth?
- **After:** Bore da. Dw i ddim yn… teimlo'n dda iawn… — allwch chi argymell rhywbeth?
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S106 (`cym_s_for_eng:pod-0:SC12-S007`)

- **Before:** Ydy hi'n iawn eu cymryd nhw gyda bwyd?
- **After:** Ydy hi'n iawn eu… cymryd nhw gyda bwyd?
- **Reason:** LLM output failed text-fidelity check (changed more than '…' placement) — forced mechanical split applied instead

### S116 (`cym_s_for_eng:pod-0:SC13-S007`)

- **Before:** Fe welwch chi'r archfarchnad ar eich ochr chwith, jyst gyferbyn â'r safle bws.
- **After:** Fe welwch chi'r archfarchnad… ar eich ochr chwith,… jyst gyferbyn â'r… safle bws.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S124 (`cym_s_for_eng:pod-0:SC14-S004`)

- **Before:** Falle tua ugain munud, os byddwn ni ddim yn anlwcus gyda'r goleuadau traffig.
- **After:** Falle tua ugain munud,… os byddwn ni… ddim yn anlwcus… gyda'r goleuadau traffig.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S131 (`cym_s_for_eng:pod-0:SC15-S001`)

- **Before:** Fyddet ti'n meindio taswn i'n trio ymarfer siarad Cymraeg gyda ti? Dw i ddim wedi bod yn dysgu am amser hir iawn, a dw i'n dal i deimlo ychydig bach yn nerfus am siarad gyda phobl eraill.
- **After:** Fyddet ti'n meindio… taswn i'n trio ymarfer… siarad Cymraeg gyda ti? Dw i ddim wedi bod… yn dysgu am amser hir iawn… a dw i'n dal i deimlo… ychydig bach yn nerfus… am siarad gyda phobl eraill.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S136 (`cym_s_for_eng:pod-0:SC15-S006`)

- **Before:** Dw i'n meddwl dy fod ti'n gwneud yn dda iawn. Ti wedi creu argraff fawr arna i. Dw i'n meddwl dy fod ti'n barod i ddechrau siarad Cymraeg gydag unrhyw un sy'n siarad Cymraeg.
- **After:** Dw i'n meddwl… dy fod ti'n gwneud… yn dda iawn. Ti wedi creu argraff fawr… arna i. Dw i'n meddwl… dy fod ti'n barod… i ddechrau siarad Cymraeg… gydag unrhyw un… sy'n siarad Cymraeg.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S140 (`cym_s_for_eng:pod-0:SC15-S010`)

- **Before:** Dw i'n meddwl bod hynny'n normal. Mae dysgu iaith newydd yn anodd. Ond mae'n gymaint o hwyl pan wyt ti'n dechrau cael sgyrsiau, on'd yw e?
- **After:** Dw i'n meddwl… bod hynny'n normal. Mae dysgu iaith newydd… yn anodd. Ond mae'n gymaint o hwyl… pan wyt ti'n… dechrau cael sgyrsiau,… on'd yw e?
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S138 (`cym_s_for_eng:pod-0:SC15-S008`)

- **Before:** Dylet ti fod yn hyderus yn barod. Dw i'n meddwl dy fod ti'n gwneud yn llawer gwell nag wyt ti'n sylweddoli. Dw i'n teimlo'n gyfforddus yn siarad gyda ti, a dw i ddim yn siarad yn araf iawn.
- **After:** Dylet ti fod yn hyderus… yn barod. Dw i'n meddwl… dy fod ti'n gwneud… yn llawer gwell… nag wyt ti'n sylweddoli. Dw i'n… teimlo'n gyfforddus… yn siarad gyda ti,… a dw i ddim yn siarad… yn araf iawn.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

### S135 (`cym_s_for_eng:pod-0:SC15-S005`)

- **Before:** Wyt, diolch. Mae'n haws siarad gydag un person yn unig. Mae'n ychydig bach yn anodd meddwl am rywbeth i'w ddweud, cofia. Dw i ddim yn siŵr beth i'w ddweud, ond dw i'n teimlo fel alla i siarad digon i ddechrau cael sgyrsiau.
- **After:** Wyt, diolch. Mae'n haws siarad gydag… un person yn unig. Mae'n ychydig bach yn anodd meddwl am rywbeth i'w ddweud… cofia. Dw i ddim yn siŵr beth i'w ddweud… ond dw i'n teimlo fel alla i siarad digon i ddechrau cael sgyrsiau.
- **Reason:** LLM output failed text-fidelity check (changed more than '…' placement) — forced mechanical split applied instead

### S139 (`cym_s_for_eng:pod-0:SC15-S009`)

- **Before:** Dyma'r union fath o ymarfer sydd angen arna i. Dw i'n meddwl galla i deimlo fe'n newid fy ymennydd i tra bo ni'n siarad! Dw i'n gwerthfawrogi dy help di'n fawr iawn. Ond mae'n syndod pa mor flinedig dw i'n mynd pan dw i'n siarad mewn iaith dw i ddim yn ei siarad yn dda iawn.
- **After:** Dyma'r union fath… o ymarfer… sydd angen arna i. Dw i'n meddwl… galla i deimlo… fe'n newid fy ymennydd i… tra bo ni'n siarad! Dw i'n gwerthfawrogi… dy help di'n fawr iawn. Ond mae'n syndod… pa mor flinedig… dw i'n mynd… pan dw i'n siarad mewn iaith… dw i ddim yn ei siarad… yn dda iawn.
- **Reason:** a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear

