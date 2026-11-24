#!/usr/bin/env python3
"""handread.py <verdicts.jsonl> <out handread.json> — the hand-read decisions of cs #253·AL (24 Nov) over the
full run's 521 flagged unique pairs. Index = position in verdicts sorted by (course, seed) — stable for that file.
Anything flagged and not listed below was read and judged FINE (P14 odd-but-sayable, P7 fragments, or a
non-meaning defect the model mistook). These numbers are the hand-confirmed ones; the model's labels are not."""
import json, sys
C = {277,278,282,283,284,291,293,295,296,302,306,311,313,317,318,322,323,325,333,334,335,337,338,414,  # South
     137,138,139,144,146,151,152,162,163,203,204,                                                      # North
     33,54,60,75,77,79,83,84,87,88,89,91,92,109}                                                      # Yoruba-known
B = {268,269,270,273,274,275,276,279,280,281,285,286,287,288,289,290,292,294,297,298,299,300,301,303,304,308,309,310,
     312,314,315,316,319,320,328,330,375,376,378,393,410,413,424,426,427,431,433,434,436,437,463,486,493,497,502,504,506,507,514,
     120,121,123,136,140,142,143,145,147,148,149,150,153,154,155,156,158,159,161,164,183,184,189,193,200,205,207,209,210,
     214,215,216,222,224,226,228,237,238,241,243,244,246,248,
     9,12,13,19,20,21,22,25, 0,1,2,3,4,5,6,7,8,
     26,29,30,34,35,36,39,41,42,44,45,46,53,55,56,57,58,59,61,62,63,64,65,68,71,72,73,74,76,78,80,81,82,85,86,90,94,95,96,
     97,98,99,100,103,104,105,107,108,110}
# Taste-safe default (brief): senseless on ONE side only -> BORDERLINE, never CLEAR.
ONE_SIDE = {**{i: 'known side only (Welsh sound)' for i in (0,1,2,3,4,5,6,7,8,44,45,46,71,72,73,80,81,82,97,98)},
     **{i: 'English ungrammatical, Welsh sound' for i in (276, 312)}}
DELETED = {322}  # S0328L01B06, Kai's amendment 17:56Z
V = [json.loads(l) for l in open(sys.argv[1])]
V.sort(key=lambda v: (v['unit']['course'], v['unit']['seed']))
assert not (C & B)
out = []
for i, v in enumerate(V):
    d = 'CLEAR' if i in C else 'BORDERLINE' if i in B else 'FINE'
    out.append({'i': i, 'uid': v['id'], 'model': v['v'], 'model_reason': v['r'], 'hand': d, 'deleted': i in DELETED,
                'note': ONE_SIDE.get(i), 'unit': v['unit']})
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
print({k: sum(o['hand'] == k for o in out) for k in ('CLEAR', 'BORDERLINE', 'FINE')})
