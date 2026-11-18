# cs #696·AI — split <course>.apply.ops.json into chunks of ~N ops (a lego.update stays with its audio.link), because one
# 299-op transaction (fra, ~4.5 min) coincided with a db-freeze on the shared DB and a long request dies in a Popty redeploy.
import json, sys
C, N = sys.argv[1], int(sys.argv[2])
ops = json.load(open(f'{C}.apply.ops.json')); chunks = [[]]
for i, o in enumerate(ops):
    if len(chunks[-1]) >= N and o['op'] != 'audio.link': chunks.append([])
    chunks[-1].append(o)
for k, c in enumerate(chunks): json.dump(c, open(f'out/{C}.chunk{k:02d}.ops.json', 'w'), ensure_ascii=False, indent=1)
print(C, len(chunks), 'chunks')
