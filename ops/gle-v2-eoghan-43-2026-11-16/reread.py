# Live re-read after the applies: the same checks as check.py over every phrase under the touched seeds' LEGOs.
import sys; from ed import Ed; from check import check
E=Ed(sys.argv[1]); seeds=[7,36,38,61,69,77,102,142,147,148,159,166,178,228,247]
for k in E.P: 
    if E.P[k]['seed'] in seeds: E.cur[k]=list(E.cur[k])
r=check(E,seeds); [print(*x) for x in r]; print('findings',len(r))
import re
for pat in [r"dhícheall",r"\bcur isteach\b",r"timpeall seachtaine",r"réasúnta",r"\btá ionadh orm",r"neirbhíseach",r"an-fhoighneach",r"cé gur mhian",r"\bas cabhrú\b(?! liom)",r"arís beagán",r"an tráthnóna ar fad",r"\bam agam"]:
    h=[k for k,v in E.cur.items() if re.search(pat,v[1],re.I) and E.P[k]['phrase_role']!='component']
    print(pat,len(h),h[:5])
