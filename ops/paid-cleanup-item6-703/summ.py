import json,sys
d=json.load(sys.stdin)
print('seeds',len(d['touchedSeeds']),'ops',d['ops']);print('ERR',d['errors'])
print('NEW');[print('  ',x) for x in d['newIssues']]
print('FIXED');[print('  ',x) for x in d['fixedIssues']]
print('ZUT new');[print('  ',json.dumps(z,ensure_ascii=False)) for z in d['zut'] if not z['preexisting']]
print('ZUT preexisting',sum(1 for z in d['zut'] if z['preexisting']))
print('DUPS',d['dups'])
