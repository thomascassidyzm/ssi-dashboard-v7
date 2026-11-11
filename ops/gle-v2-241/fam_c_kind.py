# Family C: kind = cineálta (Eoghan 142, 147, 478). deas stays "nice".
from lib import *
F='kind'
seed(142,target='Tá sé sin an-chineálta uait agus tá mé buíoch díot as cabhrú',fam=F,why="Eoghan's adjective in the taught frame (his own line recasts the whole sentence)")
seed(147,target='bhí sí an-chineálta nuair a chonaic sí go raibh mé neirbhíseach',fam=F,why="Eoghan's adjective in the taught frame")
lego('S0142L02',fam=F,target_text='an-chineálta',components=[{"known":"very","target":"an-"},{"known":"kind","target":"chineálta"}])
for k,r in R.items():
    if 'an-deas' in r['target_text'] and re.search(r'\bkind\b',r['known_text']) and not re.search(r'kind of (thing|a)',r['known_text']): sub(k,[('an-deas','an-chineálta')],fam=F)
