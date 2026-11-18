#!/usr/bin/env python3
"""cs #758·AI READ-ONLY sizing over <course>/live/108.json (fetched by tools/popty.py fetch). No DB access.
Per course: LEGOs, phrases, rows whose ENGLISH side says hope/wake, audio slots on them. Writes sizing.json."""
import json, re, os, sys
H = re.compile(r"\bhop(e|ed|es|ing)\b|\bwake\b(?!\s+up)", re.I)
res = {}
for c in open("courses.txt").read().split():
    d = json.load(open(f"{c}/live/108.json")); en = "target_text" if c.startswith("eng_for_") else "known_text"
    sp = d["seed_pair"]; rows = []; legos = []
    for lid, L in d["legos"].items():
        l = L["lego"]; hope_lego = bool(re.search(r"\bhop", l[en] or "", re.I))
        legos.append({"id": lid, "new": L["is_new"], "known": l["known_text"], "target": l["target_text"], "n": len(L["phrases"]), "hope": hope_lego})
        for p in L["phrases"]:
            if H.search(p[en] or "") or hope_lego:
                rows.append({"id": p["id"], "known": p["known_text"], "target": p["target_text"], "ka": p.get("known_audio_id"), "t1": p.get("target1_audio_id"), "t2": p.get("target2_audio_id")})
    res[c] = {"seed": sp, "legos": legos, "rows": rows}
json.dump(res, open("sizing.json", "w"), ensure_ascii=False, indent=1)
for c, r in res.items():
    print(f"{c:22} legos {len(r['legos'])} rows {len(r['rows']):3} chars_en {sum(len(x['known' if not c.startswith('eng_for_') else 'target'] or '') for x in r['rows']):5} chars_tg {sum(len(x['target' if not c.startswith('eng_for_') else 'known'] or '') for x in r['rows']):5} audio {sum(1 for x in r['rows'] if x['t1'])} | " + " ; ".join(f"{l['id'][-3:]}{'*' if l['hope'] else ''}{'n' if l['new'] else 'r'} {l['known']}={l['target']}({l['n']})" for l in r['legos']))
