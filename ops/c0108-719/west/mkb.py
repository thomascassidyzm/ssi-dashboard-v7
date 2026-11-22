"""west shard (cs #770): the ADD-ON proposal b.ops.json for courses whose seed 108 never had a hope LEGO (hope was taught earlier),
so the new expect verb is untaught vocabulary after a.ops.json. b = one lego.insert (the short expect chunk, type A, next free
lego_index) + phrase.insert rows for its basket. STRUCTURAL: on a beta/released course the apply needs "tom_go" - held for the parent.
Outputs per course: b.ops.json, b.validate.json (validator on live vs a+b simulated), b.dry.json (edit-batch DRY RUN of b alone).
usage: mkb.py <course>..."""
import json, sys, os, copy, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "tools")); sys.path.insert(0, HERE)
import popty
from newlego import NEW
def build(c):
    sp = NEW[c]; d = popty.load(c, 108); idx = max(L["lego"]["lego_index"] for L in d["legos"].values()) + 1
    lid = f"S0108L{idx:02d}"; ops = [{"op": "lego.insert", "row": {"seed_number": 108, "lego_index": idx, "known_text": sp["lego"][0], "target_text": sp["lego"][1], "type": "A", "is_new": True, "status": "draft"}}]
    n = {"build": 0, "use": 0}
    for pos, (role, k, t) in enumerate(sp["rows"], 1):
        n[role] += 1
        ops.append({"op": "phrase.insert", "row": {"id": f"{c}:{lid}{role[0].upper()}{n[role]:02d}", "course_code": c, "seed_number": 108, "lego_index": idx, "position": pos,
            "known_text": k, "target_text": t, "phrase_role": role, "status": "draft", "introduce": True,
            "metadata": {"format": "build_use", "authored": "cs #770·AI C0108 hope->expect: new expect LEGO basket, 18 Nov 2026"},
            "connected_lego_ids": [], "lego_position": "middle", "word_count": len(t), "lego_count": len(t.split())}})
    f = f"{popty.ROOT}/{c}/b.ops.json"; json.dump({"ops": ops}, open(f, "w"), ensure_ascii=False, indent=1)
    # validate: live vs (a + b) simulated
    before = popty.validate_one(c, 108, popty.override_for(popty.popty_load_fresh(c, 108)))
    a_ops = json.load(open(f"{popty.ROOT}/{c}/a.ops.json"))["ops"]
    sim = popty.apply_ops(c, a_ops)[108]
    sim["legos"][lid] = {"lego": {"lego_index": idx, "lego_id": lid, "known_text": sp["lego"][0], "target_text": sp["lego"][1], "type": "A", "components": None, "seed_number": 108}, "is_new": True,
                         "phrases": [dict(o["row"]) for o in ops[1:]]}
    after = popty.validate_one(c, 108, popty.override_for(sim)); new = popty.regressions(before, after)
    json.dump({"108": {"before": before, "after": after, "new_issues": new}}, open(f"{popty.ROOT}/{c}/b.validate.json", "w"), ensure_ascii=False, indent=1)
    print(c, lid, len(ops), "ops | after:", after, "| NEW:", new, flush=True)
    popty.batch(c, f)
if __name__ == "__main__":
    for c in sys.argv[1:]: build(c); time.sleep(1)
