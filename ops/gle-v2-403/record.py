# Writes the before/after record for Kai (markdown) from the three rounds' decisions files plus the kept/flagged lists.
# Usage: python3 record.py > $CS_SCRATCH/record.md   (needs a fresh $CS_SCRATCH/course.json for the live checks at the end)
import json,os,re,collections
c=json.load(open(os.path.join(os.environ['CS_SCRATCH'],'course.json')));S=c['S'];LA=c['LA'];R=c['rows']
D={r:json.load(open(f'decisions-{r}.json')) for r in('small','q11','q14','followup')}
it=lambda s:f"*{s}*" if s else ''

NEEDS=[
 "**The two “literally” notes are not in the course yet.** This draft has no presentation lines to edit (no audio), and Popty's route for marking a hand-written intro refused the write: it needs a database change that has not been applied (Tom's to run). The wording is saved in the job folder so it is not lost: on S0009L01, “The Irish for: 'I speak Irish' (literally, 'I have Irish'), is:”; and “literally, 'maybe he will be there'” for seed 456, which has no LEGOs at all yet (seeds past 300 are sentences only).",
 "**Q11, how the pieces are cut.** Seed 9 now teaches “I speak Irish | *tá Gaeilge agam*” and “a little | *beagán*”, which slots inside it (*tá beagán Gaeilge agam*). Seed 13 keeps “you speak Irish | *tá Gaeilge agat*” and gets a new third LEGO for the whole sentence, “you speak Irish very well | *tá Gaeilge an-mhaith agat*”. “very well | *go han-mhaith*” is still taught at 13, though it is no longer in the seed sentence, because 74 later rows use it. The note sits on seed 9's LEGO, the first to teach the form, so it reads 'I have Irish' rather than 'you have Irish'.",
 "**Q11, where “speak” means the act of speaking, *labhair* stays** (your taste-safe default). Seed 14 “do you speak Irish all day?” keeps *an labhraíonn tú*. Seeds 647 and 662 (“you speak it”) are untouched: they have no “Irish” in them and Eoghan rewrote both differently. The kept rows are listed at the end.",
 "**Q11, wording that is mine, for Eoghan:** “I speak Irish better than yesterday | *tá Gaeilge níos fearr agam ná inné*” (S0042L01U03, S0042L02U03).",
 "**Q14, wording that is mine, for Eoghan:** seed 106 “we don't need to feel happy | *Ní chaithfidh muid áthas a bheith orainn*” (his own sentence uses *riachtanach*, which we do not teach for “need”); the same *áthas a bheith ort* shape in three “to be happy” rows at 137. Both are questions in his list now.",
 "**Q14, “so happy that” is *tá an-áthas orm go bhfuil***, Eoghan's wording at 129, so “so happy” and “very happy” share one Irish form. Seed 599 leaves out his *an-* so plain “happy” stays plain.",
 "**Q14, rows that could not carry *áthas*.** Where the LEGO itself holds the pronoun (*ní raibh muid*, *tá sé*, *go raibh sí*, *mothaím* …), *áthas orm* cannot sit inside it, so 13 rows swapped “happy” for another taught word (tired, ready) in both languages, and a few were deleted. Nine early “she / they” rows became “he”, because *uirthi* and *orthu* are not taught that early. All are in the Q14 list with the reason.",
 "**Q14, *sásta* is kept only where the English is not “happy”:** satisfied, pleased, glad, proud, delighted (list at the end). Seed 426 “unhappy | *míshásta*” was not part of the ruling and is untouched; the question is already in Eoghan's list.",
 "**Q5.** Seed 391 still says *an duine* for “the one who” (it is Eoghan's own row), next to *an té* at 390. I added a question for him rather than change it.",
 "**Q1.** Only the *á … agat / agam* form was taken. “we hoped | *bhí muid ag súil*” and *cad a* for “what” are as they were; Eoghan's 107 also has *bhí súil againn* and *an rud a*, which you have not ruled.",
 "**Q8.** Four later rows still say *cad is ainm duit* (“know / forgotten what your name is”: S0160L01U06, S0201L02B04, S0205L01U04, S0231L01U04). It is correct Irish, but that chunk is no longer taught as its own LEGO before seed 465.",
 "**Q10.** “leave” is *imeacht* everywhere. Six rows use *fág* for “left” with nothing being left behind (list at the end). I did not change them: *d'imigh* is not taught in seeds 1 to 300, and two sit under the LEGO *gur fhág tú*.",
 "**Not from this job:** four taught LEGOs had no practice rows before I started and still have none (S0116L03, S0190L03, S0209L03, S0297L01).",
]
KEPTR=["Q3, seed 456: *b'fhéidir go mbeidh sé ann* (note pending, see above).","Q9, seed 53: *a litir*.","Q10, seed 139: *imeacht*.","Q12, seed 112: *ní raibh mé ag súil leis*.","Q13, *taitin*: held, nothing changed. The six seeds still show as waiting for you in Eoghan's list.","Q15, seeds 433 and 434: *féad-*."]
SECTIONS=[
 ("Q1. “what you were doing” (107, 174)",'small','Q1 á…agat',"Eoghan's *á … agat / agam* form, in both seeds and every phrase that used the old shape."),
 ("Q2. Future after “before” (281, 494, 533)",'small','Q2 future',"His future tense; our English."),
 ("Q4. “a moment ago” (384)",'small','Q4 bomaite',"One line."),
 ("Q5. “the one who” (390)",'small','Q5 an té',"One line."),
 ("Q6. “lose hope” (399)",'small','Q6 misneach',"One line."),
 ("Q7. “Saturday night” (154, and every other row)",'small','Q7 oíche Shathairn',"*leat* and *mian* kept; *Dé* dropped. The English at 154 is “where do you want to meet on Saturday night?”, checked. Seed 215 and its LEGO teach the same two words, so they moved too."),
 ("Q8. “what your name is” (150)",'small',"Q8 d'ainm","The third LEGO of 150 is now “your name | *d'ainm*” and its basket is rewritten."),
 ("Q11. “speak Irish” → “have Irish”, course-wide",'q11','Q11 have Irish',"Every row that states ability moved. Scan first: 251 rows had a finite form of *labhair*; 147 were reworded, 9 deleted, 17 added; the rest are the act of speaking, or “let's talk”, and are listed below."),
 ("Q14. “happy” → *áthas ar*, course-wide",'q14','Q14 happy = áthas ar',"Scan first: 238 rows had “happy” or *sásta*. The split follows the Finnish decisions: the English word is the learner's cue, and one Irish form answers it. “happy”, “very happy”, “happy to”, “happy that”, “happy about” are all *áthas ar*; “happy with” is *áthas … as* (Eoghan's 76 and 245); *sásta* answers only “satisfied” and its neighbours."),
]
out=[]; P=out.append
def fam_rows(d,fam):
    L=[]
    for n,s in d.get('seeds',{}).items():
        if s['family']==fam: L.append((int(n),0,f"**Seed {n}** “{s['known']}”",s['before']['target'],s['target'],s['before']['known'] if s['before']['known']!=s['known'] else None,s['why']))
    for k,l in d.get('legos',{}).items():
        if l['family']==fam:
            b=l['before']; a=dict(b); a.update(l['set'])
            L.append((int(k[1:5]),1,f"**LEGO {k}** “{a['known_text']}”"+(' (now taught here)' if l['set'].get('is_new') else ''),b['target_text'],a['target_text'],b['known_text'] if b['known_text']!=a['known_text'] else None,l['why']))
    for r in d.get('lego_inserts',[]): L.append((r['seed_number'],1,f"**New LEGO S{r['seed_number']:04d}L{r['lego_index']:02d}** “{r['known_text']}”",None,r['target_text'],None,'new'))
    for k,p in d.get('phrases',{}).items():
        if p['family']==fam:
            if p['action']=='del': L.append((int(k[1:5]),2,f"{k} “{p['before']['known']}”",p['before']['target'],None,None,p['why']))
            else: L.append((int(k[1:5]),2,f"{k} “{p['known']}”",p['before']['target'],p['target'],p['before']['known'] if p['before']['known']!=p['known'] else None,p['why']))
    for r in d.get('phrase_inserts',[]):
        if r['metadata'].get('family')==fam: L.append((r['seed_number'],3,f"{r['id'].split(':')[1]} “{r['known_text']}” (new row)",None,r['target_text'],None,''))
    return sorted(L,key=lambda x:(x[0],x[1],x[2]))
def table(L,why=True):
    for n,_,label,b,a,bk,w in L:
        line=f"- {label}: "
        if b is None: line+=f"added {it(a)}"
        elif a is None: line+=f"deleted (was {it(b)})"
        elif b==a: line+=f"Irish unchanged, {it(a)}"
        else: line+=f"{it(b)} → {it(a)}"
        if bk: line+=f". English was “{bk}”"
        if why and w and not re.fullmatch(r'Q\d+',w): line+=f". {re.sub(r'^Q\\d+: ?','',w)}"
        P(line)
P("# Irish draft (gle_v2): Kai's 12 Nov rulings applied (job #403)\n")
P("All 15 questions from the #253 list are dealt with. Everything below is live in the hidden draft course. No audio was made. I am not a native speaker; wording that is mine rather than Eoghan's is marked.\n")
P("## What changed, in short\n")
tot=collections.Counter()
for r,d in D.items():
    tot['seeds']+=len(d.get('seeds',{})); tot['LEGOs changed']+=len(d.get('legos',{})); tot['LEGOs added']+=len(d.get('lego_inserts',[]))
    tot['phrases reworded']+=sum(1 for p in d.get('phrases',{}).values() if p['action']=='upd'); tot['phrases deleted']+=sum(1 for p in d.get('phrases',{}).values() if p['action']=='del'); tot['phrases added']+=len(d.get('phrase_inserts',[]))
P(", ".join(f"{v} {k}" for k,v in tot.items())+". 126 seeds had their word tiles recomputed afterwards.\n")
P("## Needs your eye\n")
for l in NEEDS: P("- "+l)
P("")
P("## Kept as they are, by your ruling\n")
for l in KEPTR: P("- "+l)
P("")
for title,rd,fam,intro in SECTIONS:
    L=fam_rows(D[rd],fam)
    if rd=='q14': L+=fam_rows(D['followup'],fam); L.sort(key=lambda x:(x[0],x[1],x[2]))
    P(f"## {title}\n"); P(intro+"\n"); table(L); P("")

Pl={k:r for k,r in R.items() if r['phrase_role']!='component'}
P("## Lists\n")
P("### Q11: rows kept on *labhair* (the act of speaking)\n")
for k,r in sorted(Pl.items()):
    if re.search(r'labhraím\b|labhraíonn',r['target_text']): P(f"- {k} “{r['known_text']}” {it(r['target_text'])}")
P("\nAlso kept, not listed row by row: about 700 rows with “to speak (Irish)”, “speaking”, “want you to speak Irish with me” (*labhairt*, *go labhrófá*), and the “let's talk” rows (*labhraímis*).\n")
P("### Q14: rows where *sásta* stays\n")
for k,r in sorted(Pl.items()):
    if re.search(r'sh?ásta',r['target_text']): P(f"- {k} “{r['known_text']}” {it(r['target_text'])}")
for n in sorted(S,key=int):
    if re.search(r'sh?ásta',S[n]['target']): P(f"- Seed {n} “{S[n]['known']}” {it(S[n]['target'])}")
P("\n### Q10: “left” with *fág* and nothing left behind (not changed)\n")
for k in ['S0185L02B01','S0185L02U03','S0279L01B05','S0279L01U08','S0279L02U07','S0279L02U10']:
    if k in R: P(f"- {k} “{R[k]['known_text']}” {it(R[k]['target_text'])}")
P("\n## Checks at the end (read back through Popty)\n")
seeds_with={int(k[1:5]) for k in Pl}
P(f"- Seeds 1 to 300 with no phrases: {len([n for n in range(1,301) if n not in seeds_with])}.")
P(f"- “happy” rows or seeds still on *sásta*: {len([k for k,r in Pl.items() if re.search(r'\bhapp(y|ier)\b',r['known_text'],re.I) and re.search(r'sh?ásta',r['target_text'],re.I)])+len([n for n in S if re.search(r'\bhappy\b',S[n]['known']) and 'sásta' in S[n]['target']])}.")
P(f"- “who speak(s) Irish” rows still on *a labhraíonn Gaeilge*, outside the act-of-speaking rows listed above (quickly, with you, with me, every day): {len([k for k,r in Pl.items() if re.search(r'a labhraíonn [Gg]aeilge',r['target_text']) and not re.search(r'quickly|with you|with me|every day',r['known_text'])])}.")
P(f"- Rows still on *oíche Dé Sathairn*, *sula dtosaíonn tú*: {len([k for k,r in Pl.items() if re.search(r'oíche [Dd]é [Ss]athairn|sula dtosaíonn tú',r['target_text'])])}.")
P("- Every decision is live (verify.py on each round: nothing missing).")
P("- The two “literally” notes: **not present** (see the top).")
P("\n## Eoghan's seed list (still a draft, not sent)\n")
P("Rebuilt from the live course. 6 seeds now wait for you (the *taitin* ones). Questions added or reworded: 119 (*faoi* or *maidir le*), 99 (*faoin bhfáth*), 154 (*leat* for one person; spelling of *oíche Shathairn*), 112 (*ní raibh mé ag súil leis*, with the idiom offered for listening), 139 (*fág* throughout?), 27 (*taitin*, already there), 433 / 434 / 659 (*féad-*). Also new, from this job: 9, 14, 283, 297 (have Irish), 106, 129 (happy), 107, 391.\n")
P("## Undo\n")
P("19 undo files, one per chunk, are in the job folder (ops/gle-v2-403/undo on Popty main). Posting them back newest first reverts the lot.")
print("\n".join(out))
