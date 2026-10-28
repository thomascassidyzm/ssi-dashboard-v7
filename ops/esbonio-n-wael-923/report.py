"""Builds the step-2 read-only report (job #923) from scan.py output. Changes nothing."""
import json,sys,collections
o=json.load(open(sys.argv[1]))
ART={'y','yr'}
POSS={'ei','eu','ein','fy','dy'}
AMBIG_NEXT={'gymraeg':'yn Gymraeg ("in Welsh", preposition) - not contractible, listed because Gymraeg is also sometimes an adverbial predicate','ystod':'yn ystod "during" (fixed preposition)','lle':'yn lle "instead of" (fixed preposition)','hytrach':'yn hytrach (na) "rather than" (fixed)','fan':'yn fan hyn "in this place" (preposition)','rhywle':'yn rhywle "somewhere" (preposition + rhywle)','ôl':'yn ôl "back / ago / according to" (idiom: usually written yn ôl; \'n ôl is also common - Aran\'s call)','anffodus':'yn anffodus "unfortunately" (sentence adverb, mid-clause here)'}
NUM={'ddeg','bump','bymtheg'}
VN={'gweithio','gadael','dod','nabod','edrych','dishgwl','cael','digwydd','arfer','chwarae','cyfri’','gwylio’r'}
def cls(nx):
    if nx in ART: return 'X'
    if nx in POSS: return 'P'
    if nx in AMBIG_NEXT: return 'A'
    if nx in NUM: return 'N'
    if nx in VN: return 'V'
    return 'M'
G=collections.defaultdict(list); art=0
for x in o:
    c=cls(x['next']); n1,n2=len(x['nv2']),len(x['sv2'])
    if c=='X': art+=n1+n2; continue
    G[c].append(x)
def line(x):
    rows=[('nv2',)+tuple(r) for r in x['nv2']]+[('sv2',)+tuple(r) for r in x['sv2']]
    ex='; '.join(f"{c} {k} {i}" for c,k,i,t in rows[:2])
    return f"- **{x['prev']} yn {x['next']}** - {len(rows)} (nv2 {len(x['nv2'])}, sv2 {len(x['sv2'])}) - e.g. {ex}: \"{rows[0][3]}\""
T={'M':'A. Adverb / adjective / predicate after a vowel-final word (the contractible pattern, e.g. codi yn gynnar -> codi\'n gynnar)',
 'V':'B. Progressive "yn" + verb-noun after a vowel-final subject (e.g. ein mab ni yn gweithio -> ni\'n gweithio)',
 'N':'C. Age / number predicate (honna yn bump -> honna\'n bump)',
 'A':'D. Probably NOT contractible, or Aran\'s call (preposition, fixed phrase, sentence adverb)',
 'P':'E. yn + possessive (ei/eu/ein/fy/dy): ambiguous - "in his/her..." (preposition) or progressive + object pronoun'}
tot=lambda xs:sum(len(x['nv2'])+len(x['sv2']) for x in xs)
out=['# Vowel-final word + separate "yn" in cym_nv2_for_eng / cym_sv2_for_eng (read-only, job #923)\n',
 'Scanned every seed, LEGO and practice-phrase Welsh text in both courses (distinct rows; a row with the pattern twice counts once per pair). Nothing was changed. Rows already contracted (\'n) are not here. "yn y / yn yr" ('+str(art)+' rows) is the preposition "in" and is left out of the list.',
 'Vowel = a e i o u w y incl. accents. "Clause-initial yn" is excluded because punctuation sits between it and the previous word.\n',
 f'Totals: A {tot(G["M"])} rows, B {tot(G["V"])}, C {tot(G["N"])}, D {tot(G["A"])}, E {tot(G["P"])}. Pairs are sorted by count.\n',
 'Ids: seed S####, LEGO S####L##, phrase S####L##(B|U|C)## (course prefix dropped).\n']
for k in ['M','V','N','A','P']:
    xs=sorted(G[k],key=lambda x:-(len(x['nv2'])+len(x['sv2'])))
    out.append(f'\n## {T[k]}\n({len(xs)} distinct pairs, {tot(xs)} rows)\n')
    if k=='A':
        for nx,d in AMBIG_NEXT.items(): out.append(f'- _{d}_')
        out.append('')
    if k=='M':
        # group by prev for the headline view
        pass
    out+= [line(x) for x in xs]
open(sys.argv[2],'w').write('\n'.join(out))
print(len('\n'.join(out)),{k:tot(v) for k,v in G.items()},art)
