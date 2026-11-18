# merge.py <chunk.tsv> <corrections...> <out.tsv> : the proposal column, overridden row by row by my hand-read corrections (idx<TAB>roman, idx = 1-based row in chunk)
import sys
chunk, corr, out = sys.argv[1], sys.argv[2:-1], sys.argv[-1]
rows = [l.rstrip('\n').split('\t') for l in open(chunk)][1:]
C = {}
for f in corr:
    for l in open(f):
        if l.strip():
            i, r = l.rstrip('\n').split('\t'); C[int(i)] = r
with open(out, 'w') as f:
    f.write('key\troman\n')
    for i, r in enumerate(rows, 1): f.write(f"{r[1]}\t{C.get(i, r[5])}\n")
print(len(C), 'corrections over', len(rows), 'rows')
