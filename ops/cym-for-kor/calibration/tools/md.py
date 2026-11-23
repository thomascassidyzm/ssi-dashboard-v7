import json,collections
d=json.load(open('seeds-1-30.json')); R=d['rows']
def cnt(f): return sum(1 for r in R if f(r))
L=[r for r in R if r['kind']=='lego']; Ph=[r for r in R if r['kind']=='phrase']
lsame=cnt(lambda r:r['kind']=='lego' and r['same_or_changed']=='same'); lch=len(L)-lsame
pk=cnt(lambda r:r['kind']=='phrase' and r['reuse'].startswith('existing')); pn=len(Ph)-pk
sw=cnt(lambda r:r['kind']=='phrase_dropped')
sk=cnt(lambda r:r['kind']=='seed' and r['reuse'].startswith('existing'))
lk=cnt(lambda r:r['kind']=='lego' and r['reuse'].startswith('existing'))
l10=[r for r in L if r['seed']<=10]
ko10=10+len(l10)*2+len(Ph)  # seed + lego gloss + intro + phrases
ko30=20+len([r for r in L if r['seed']>10])*2
o=[]
o.append("# Welsh for Korean speakers — calibration slice, seeds 1-30 (23 Nov)\n")
o.append("Text only. Nothing written to Popty, no audio. **No native speaker has read any of the Korean yet.**\n")
o.append("## Counts\n")
o.append(f"- **LEGOs:** {len(L)} new LEGOs in seeds 1-30. **{lsame} same** split as the source course, **{lch} changed** (each with a reason below)")
o.append(f"- **Phrases (seeds 1-10 only):** {len(Ph)} written. **{pk} kept** (same Welsh as a source phrase that has audio), **{pn} new**, {sw} source phrases swapped out")
o.append(f"- **Welsh clips:** seeds {sk}/30 reuse the source seed clip. LEGOs {lk} reuse a clip, {len(L)-lk} need new Welsh. Phrases (1-10) {pk} reuse, {pn} need new Welsh. Seeds 11-30 phrases: **unknown** (not built)")
o.append(f"- **Korean lines to record:** all new. Seeds 1-10 ≈ {ko10} (10 seeds, {len(l10)} LEGO prompts, {len(l10)} intros, {len(Ph)} phrases). Seeds 11-30 so far ≈ {ko30} (seeds, LEGO prompts, intros; phrases still to come)\n")
o.append("## Questions for you (one word each)\n")
o.append("1. **Changed splits where the source course leaves a gap.** The source (cym_nv2_for_eng) built HC 1-668 on top of 316 older seeds, so words like *efo*, *trio*, *dw i’n*, *licio*, *’fory* are not split out in HC 1-30. We have to teach them. I added the shortest LEGO each time. That accounts for most of the 23 changed splits; the rest are Korean-pairing merges such as *rhywun arall* = 다른 사람. **OK?** Recommend **yes**: without them the phrases use untaught words.")
o.append("2. **Build the weave-dropped seeds 2 and 13?** Recommend **yes**: there are no older seeds in this course to cover them. I took their splits from the source's old seeds S0002, S0032 and S0034. All of those have clips.")
o.append("3. **One Welsh form, two Korean wordings?** The Korean seeds say *siarad Cymraeg* two ways: 웨일스어로 이야기하다 (seed 1) and the more natural 웨일스어를 하다 (seeds 9, 13, 14). In both cases each Korean prompt still has one Welsh answer. Recommend **allow**, and to keep that true I keep 웨일스어로 for *yn y Gymraeg* and never put *siarad* and *yn y Gymraeg* in the same phrase.")
o.append("4. **Intro voice:** one polite 해요 line per LEGO, e.g. ‘‘너와’는 웨일스어로 이렇게 말해요.’ **OK?** Recommend **yes**: it is short, polite to the learner, and the same template every time, so it can be checked by eye.")
o.append("5. **Verb-frame prompts:** Korean puts the verb last. So a LEGO like *dw i isio* has the prompt ‘나는 ~고 싶어’, with the gap shown. **OK?** Recommend **yes**: it is the same stand-in idea you already approved for “it” frames.\n")
o.append("## Where everything came from\n")
o.append("- **Welsh source:** cym_nv2_for_eng S1001-S1030. Its Welsh matches HC 1-30 word for word. It was read live through Popty on 23 Nov. Its older seeds 1-316 supplied the LEGOs and phrases it relies on.")
o.append("- **Korean seeds:** branch cs/780 @9a68ac155. #780 was still running when I took it. For seeds 1-30 it is identical to cs/764 (none of #780's 7 fixes touch 1-30). I did not change any seed Korean.")
o.append("- **Reuse:** ‘reuse’ means the source row has both Welsh voices linked. It is not a check that the clip still plays.\n")
o.append("## Gaps (honest)\n")
o.append("- **Seeds 11-30 have no phrases yet.** The LEGOs, Korean prompts and reuse are done. Phrases were not built in the time box. For each seed I list how many source phrases pass the vocabulary check, so you can see what is there to reuse.")
o.append("- The vocabulary check that picks reusable source phrases is my own text matcher run over Popty's seed listing, so some edge cases may be wrong. It is not the course-builder validator. Nothing was submitted, so the validator has not run.")
o.append("- LEGO splits for 11-30 are a first pass. The ‘changed’ rows there need the same care seeds 1-10 got.\n")
o.append("## Seed by seed\n")
for n in range(1,31):
  rs=[r for r in R if r['seed']==n]; s=rs[0]
  o.append(f"### {n}. {s['welsh']}" + ("  *(weave-dropped in source; built)*" if s.get('weave_dropped') else ""))
  o.append(f"- 🇰🇷 {s['korean']}")
  o.append(f"- 🇬🇧 {s['english']}")
  o.append(f"- Welsh clip: {'♻ reuse' if s['reuse'].startswith('existing') else '🆕 new'}")
  o.append("\n**LEGOs**")
  for r in rs:
    if r['kind']=='lego':
      m='♻' if r['reuse'].startswith('existing') else '🆕'
      line=f"- {m} **{r['welsh']}** = {r['korean']} — " + ('same' if r['same_or_changed']=='same' else f"*changed:* {r['reason']}")
      o.append(line); o.append(f"  - intro: {r['intro_ko']}")
  ph=[r for r in rs if r['kind']=='phrase']
  if ph:
    o.append("\n**Phrases** (♻ = reuses a Welsh clip, 🆕 = new Welsh)")
    for r in ph: o.append(f"- {'♻' if r['reuse'].startswith('existing') else '🆕'} {r['welsh']} → {r['korean']}")
  for r in rs:
    if r['kind']=='phrase_dropped': o.append(f"- ✂ dropped *{r['welsh']}*: {r['reason']}")
    if r['kind']=='phrase_note': o.append(f"\n*Phrases not built yet; {r['reason'].split('; ')[1]}.*")
  o.append("")
open('calibration.md','w').write('\n'.join(o))
print('\n'.join(o[:30]))
