# Builds the published summary from the merged JSON. Top-20 list is hand-picked (see TOP below).
import json,os,re,collections
B=os.path.expanduser('~/.tmpbig')
d=json.load(open(B+'/south-phrase-review-2026-10-13.json'));F=d['flags'];L=d['lego_wide'];bulk=d['bulk']
NAMES={1:'Unnatural Welsh',2:'Mutation',3:'English ≠ Welsh',4:'LEGO not in phrase (HC block only)',5:'Northern form',6:'Odd sense / nonsense',7:'Exact duplicate'}
c=collections.Counter((x['cat'],x['sev']) for x in F)
o=[]
o.append("# South Welsh practice phrases (cym_sv2_for_eng): review flags, 2026-10-13\n")
o.append(f"A second pair of eyes on the list at popty.app/proof/phrases (South switch). The rows were read from the page's own endpoint and re-checked live at the end, with no edits in between, so **running numbers match the page** ({d['rows']:,} rows; the Hadau Creiddiol block is #1,637–#14,142). **{len(F)} flags on {len({x['n'] for x in F})} rows**, plus **{len(L)} LEGO-wide issues**. High = clearly wrong; Check = worth your look. These are machine-assisted judgements, so read a Check as a question.\n")
o.append("Not flagged, per your rulings: missing LEGO on old-course rows (only checked inside Hadau Creiddiol), 'yn y Gymraeg', earlier-taught words, near-miss LEGOs, 'am dipyn', 'trwy'r …', unmutated 'tipyn bach' after a verb-noun, and South forms (moyn, gyda fi, nawr, so, 'sa i' …).\n")
o.append("## Counts by category\n\n| Category | High | Check |\n|---|---:|---:|")
for k in range(1,8): o.append(f"| {k}. {NAMES[k]} | {c[(k,'High')]} | {c[(k,'Check')]} |")
o.append(f"| **Total** | **{sum(v for (k,s),v in c.items() if s=='High')}** | **{sum(v for (k,s),v in c.items() if s=='Check')}** |\n")
seg=collections.Counter('old #1–1,636' if x['n']<1637 else ('Hadau Creiddiol' if x['n']<=14142 else 'old #14,143+') for x in F)
o.append("By position: "+", ".join(f"{k}: {v}" for k,v in seg.items())+". The course is clean on missing LEGOs (3 in the whole Hadau Creiddiol block) and on Northern forms (2, both 'dydy' for 'dyw').\n")
o.append("## Bulk questions (counted over every row, not flagged one by one)\n")
o.append(f"- **Lower-case English**: {len(bulk['english_lower_i'])} rows have a lower-case 'i' / 'i'm' as the pronoun in the English, and {len(bulk['english_lower_proper'])} have a lower-case 'welsh', day, or place name. One bulk fix; kept off the review pages.")
o.append(f"- **'unrhywbeth'** is written as one word in {len(bulk['unrhywbeth'])} rows (standard spelling 'unrhyw beth'). House style or fix?")
o.append(f"- **'gytre'** ({len(bulk['gytre'])} rows) and **'dwlid'/'twlid'** ({len(bulk['dwlid'])} rows) were left alone as deliberate South dialect forms. **'draw fanco'** ({len(bulk['draw_fanco'])} rows) was queried once as possibly Northern and not flagged.\n")
m=[l for l in L if re.search(r'mutat',l['reason'],re.I)]
o.append("## LEGO-wide issues\n")
o.append(f"**A. LEGOs stored soft-mutated with no trigger ({len(m)} LEGOs, ~{sum(l.get('rows',0) for l in m)} phrases).** Under your display rule a LEGO alone is unmutated. Most of their phrases are fine, because a trigger comes before the LEGO. Where a fragment phrase *opens* with the mutated word it is wrong, and those rows are flagged one by one. Three are High because the phrases are wrong as well: **fwcio→bwcio**, **gadw bwrdd→cadw bwrdd**, **fyd mawr→byd mawr**. The full list:\n")
for l in sorted(m,key=lambda l:l.get('first_n',0)): o.append(f"- #{l.get('first_n')} **{l['lego']}** ({l.get('lego_en','')}, {l.get('rows','?')} rows) → {l.get('fix') or '—'}")
o.append("\n**B. Other LEGO-wide issues** (wrong or tense-locked gloss, calque, garbled LEGO):\n")
for l in sorted([l for l in L if l not in m],key=lambda l:l.get('first_n',0)):
  o.append(f"- #{l.get('first_n')} **{l['lego']}** ('{l.get('lego_en','')}', {l.get('rows','?')} rows) [{l['sev']}]: {l['reason']}"+(f" → *{l['fix']}*" if l.get('fix') else ''))
o.append("\nA recurring gloss theme: 'bod' clauses (bo' nhw…, fod e'n…, bod hi'n…) are tenseless in Welsh, but about eight LEGOs gloss them in the past, so phrases after a present verb ('dw i'n credu…') get past-tense English. One decision fixes all of them.\n")
TOP=[15186,10751,8922,9016,10268,15504,15509,10651,11657,4076,4211,1519,8625,381,747,5934,6373,7727,11491,14445]
byn={}
for x in F: byn.setdefault(x['n'],x)
o.append("## The 20 most important\n")
for i,n in enumerate(TOP,1):
  x=byn.get(n)
  if n==15186: o.append(f"{i}. **#15,186+ LEGO 'fy i arian nôl'** (11 rows) is garbled; should be 'fy arian i nôl'. Its phrases are fine."); continue
  if n==10751: o.append(f"{i}. **#10,751–10,759 'ddishgled gryf o obaith'** ('a strong cup of hope'): all 9 phrases are nonsense, and the LEGO is stored mutated. Suggest 'o goffi' or new phrases."); continue
  o.append(f"{i}. **#{n:,}** [{x['sev']} · {NAMES[x['cat']]}] *{x['welsh']}*: {x['reason']}"+(f" → **{x['fix']}**" if x['fix'] else ''))
o.append(f"\n## Every flag\n\nIn running order, also on your review pages (Accept = use the wording shown). The full JSON is at ~/.tmpbig/south-phrase-review-2026-10-13.json.\n")
for x in F: o.append(f"- #{x['n']} [{'High' if x['sev']=='High' else 'check'} · {NAMES[x['cat']]}] *{x['welsh']}* / {x['english']}: {x['reason']}"+(f" → **{x['fix']}**" if x['fix'] else ''))
open(os.path.expanduser('~/.tmpbig/spr/doc.md'),'w').write('\n'.join(o)+'\n')
print(len(o))
