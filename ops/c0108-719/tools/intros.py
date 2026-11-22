"""cs #374·AI (Kai 22 Nov: no silent slots): the NEW intro text for every LEGO the C0108 change touches, per course, from
the nightly-copy snapshot (copy-read.cjs snap, which carries each LEGO's intro clip text) and the course's changeset.
Files only; no database.

Which LEGOs:
  - re-cut (lego.update changing known_text): the DB trigger unlinks an intro that no longer names the LEGO's words;
  - inserted (lego.insert): a new LEGO has no intro at all;
  - any other LEGO of a touched seed whose intro quotes text this changeset rewrites (the 'as in' context is very often
    the old seed sentence 'We didn't hope to wake in the middle of the night').
New text = the old intro with every old->new text pair of this changeset substituted (longest first: seed, LEGOs,
phrases), so each course keeps its own intro FORMAT (Charlotte splice shape, Tom-006 whole shape with break tags,
known-language shapes of the eng_for_* courses); the route decides how it is voiced. A LEGO with no old intro gets the
course's own bare template (the commonest intro of the course whose only quoted words are its LEGO's known text, with
that text swapped); a course with no such template is listed, not guessed. An intro that would still quote the old
words, or that did not change at all, is listed, never rendered.
  python3 intros.py <snapDir> [course ...]   -> <course>/changesets/intros-374.json
     [{lego_id, why, old_text, new_text, needs_op}]  needs_op = changeset op index that must be applied first
"""
import json, os, re, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP = sys.argv[1]
OLDWORDS = re.compile(r"\bdidn't hope\b|\bhope to wake\b|\bto wake in\b", re.I)


def lid_of(o):
    if o["op"] in ("lego.insert", "phrase.insert"): return f"S{int(o['row']['seed_number']):04d}L{int(o['row']['lego_index']):02d}"
    return o.get("lego_id") or (o["phrase_id"].split(":")[1][:8] if "phrase_id" in o else None)


def variants(t):
    """the same six spellings of a sentence, in a FIXED order, so old and new variants pair up (case and full stop kept)"""
    t = t.strip()
    up, lo = t[:1].upper() + t[1:], t[:1].lower() + t[1:]
    return [t, t.rstrip(".!?"), up, up.rstrip(".!?"), lo, lo.rstrip(".!?")]


def plan(course):
    cf = os.path.join(ROOT, course, "changesets", "c0108-374.changeset.jsonl")
    if not os.path.exists(cf): return None
    ops = [json.loads(l) for l in open(cf)][1:]
    d = json.load(open(os.path.join(SNAP, f"{course}.json")))
    clips = d.get("clips", {})
    legos = {l["lego_id"]: l for l in d["legos"]}
    phr = {p["id"]: p for p in d["phrases"]}
    seeds = {s["seed_number"]: s for s in d["seeds"]}
    # old -> new KNOWN-side pairs (an intro speaks the known side)
    pairs, recut, inserted, seed_op = {}, {}, {}, {}
    for i, o in enumerate(ops):
        if o["op"] == "seed.update" and "known_text" in o["set"]:
            seed_op[int(o["seed_number"])] = i
            for v_old, v_new in zip(variants(o["expect"]["known_text"]), variants(o["set"]["known_text"])): pairs[v_old] = v_new
        elif o["op"] in ("lego.update", "phrase.update") and "known_text" in o["set"]:
            pairs[o["expect"]["known_text"]] = o["set"]["known_text"]
            if o["op"] == "lego.update": recut[o["lego_id"]] = i
        elif o["op"] == "lego.insert": inserted[lid_of(o)] = (i, o["row"])
        elif o["op"] == "lego.update" and "target_text" in o["set"]: recut.setdefault(o["lego_id"], i)
    seed_pairs = {k: v for k, v in pairs.items() if any(k in variants(o["expect"]["known_text"]) for o in ops if o["op"] == "seed.update" and "known_text" in o["set"])}
    lego_rows = collections.defaultdict(dict)   # phrase pairs per LEGO: a context is re-said only from the seed or its own LEGO's rows
    for o in ops:
        if o["op"] == "phrase.update" and "known_text" in o["set"]: lego_rows[lid_of(o)][o["expect"]["known_text"]] = o["set"]["known_text"]
    def sub(t, prs):
        keys = sorted(prs, key=len, reverse=True)
        if not keys: return t
        rx = re.compile("(?<![\\w])(" + "|".join(re.escape(k) for k in keys) + ")(?![\\w])")   # whole words only
        return re.sub(r"\b(to|up) \1\b", r"\1", rx.sub(lambda m: prs[m.group(1)], t))   # 'expect to' + 'to finish' never says 'to to'
    Q = re.compile(r"(['「“])(.+?)(['」”])")
    STD = re.compile(r"^(?P<head>.*?\bfor:?\s*)'(?P<x>.*?)'(?P<asin>,?\s+as in\s*[—–-]?\s*'(?P<ctx>.*)')?(?P<tail>,?\s+is\b.*)$", re.S)
    def rewrite(old, old_x, new_x, lid):
        prs = {**seed_pairs, **lego_rows.get(lid, {})}
        m = STD.match(old)
        if m:   # an English 'The <Language> for: 'X'[, as in — 'ctx'], is:' intro (apostrophes inside X/ctx are fine)
            x = m.group("x")
            if new_x is not None and new_x != old_x: x = new_x   # a re-cut LEGO's intro names its NEW words, whatever the old intro said
            asin = m.group("asin") or ""
            if asin:
                ctx = sub(m.group("ctx"), prs)
                asin = "" if x.strip().lower() not in ctx.lower() else asin.replace(m.group("ctx"), ctx)
            return m.group("head") + "'" + x + "'" + asin + m.group("tail")
        # a known-language intro (eng_for_*): swap the exactly-quoted LEGO words, then re-say what follows them
        t = old; cut = 0
        if old_x and new_x is not None and old_x != new_x:
            for qo, qc in (("'", "'"), ("「", "」"), ("“", "”")):
                k = t.find(qo + old_x + qc)
                if k >= 0: t = t[:k] + qo + new_x + qc + t[k + len(qo + old_x + qc):]; cut = k + len(qo + new_x + qc); break
            else:
                k = t.find(old_x)
                if k >= 0: t = t[:k] + new_x + t[k + len(old_x):]; cut = k + len(new_x)
        else:
            x = old_x or ""; k = t.find(x) if x else -1; cut = k + len(x) if k >= 0 else 0
        return t[:cut] + sub(t[cut:], prs)
    # the course's bare template: intros whose text quotes exactly its LEGO's known text and nothing else;
    # else, for an English-known course, "The <Language> for: '{X}', is:" with the language its own intros name
    tmpl = collections.Counter(); named = collections.Counter()
    for l in d["legos"]:
        t = (clips.get(l.get("pres") or "") or {}).get("text")
        if not t: continue
        nm = re.match(r"^\s*The\s+(.+?)\s+for:", t)
        if nm: named[nm.group(1)] += 1
        if not l["known_text"] or t.count(l["known_text"]) != 1: continue
        rest = t.replace(l["known_text"], "{X}")
        if len(Q.findall(rest)) <= 1 and "as in" not in rest and "{X}" in rest: tmpl[rest] += 1
    template = tmpl.most_common(1)[0][0] if tmpl else (f"The {named.most_common(1)[0][0]} for: '{{X}}', is:" if named else None)
    out, skipped, kept = [], [], []
    cand = {lid for lid, l in legos.items() if l["seed_number"] == 108} | set(recut) | set(inserted)
    for lid in sorted(cand):
        l = legos.get(lid)
        if lid in inserted:
            i, row = inserted[lid]
            if not template: skipped.append({"lego_id": lid, "why": "new LEGO; the course has no intro at all to take a template from"}); continue
            out.append({"lego_id": lid, "why": "new LEGO (add-on)", "old_text": None, "new_text": template.replace("{X}", row["known_text"]), "needs_op": i}); continue
        old = (clips.get(l.get("pres") or "") or {}).get("text") if l.get("pres") else None
        new_known = next((o["set"].get("known_text") for o in ops if o["op"] == "lego.update" and o["lego_id"] == lid and "known_text" in o["set"]), None)
        if lid in recut:
            if old: new = rewrite(old, l["known_text"], new_known or l["known_text"], lid)
            elif new_known and template: new = template.replace("{X}", new_known)
            elif not new_known: kept.append({"lego_id": lid, "why": "known words unchanged; it had no intro before"}); continue
            else: skipped.append({"lego_id": lid, "why": "re-cut LEGO that had no intro, in a course with no intros at all"}); continue
            why, need = "re-cut LEGO", recut[lid]
        else:
            if not old: continue
            new = rewrite(old, l["known_text"], None, lid)
            why, need = "intro quotes the old seed sentence (as-in context)", seed_op.get(108, len(ops) - 1)
        if new == old: kept.append({"lego_id": lid, "why": "intro still names the LEGO's known words"}); continue
        if OLDWORDS.search(new) and course.endswith("_for_eng"): skipped.append({"lego_id": lid, "why": "new intro would still quote the old words", "old_text": old, "new_text": new}); continue
        out.append({"lego_id": lid, "why": why, "old_text": old, "new_text": new, "needs_op": need})
    res = {"course": course, "template": template, "intros": out, "skipped": skipped, "kept": kept}
    json.dump(res, open(os.path.join(ROOT, course, "changesets", "intros-374.json"), "w"), ensure_ascii=False, indent=1)
    return res


courses = sys.argv[2:] or sorted(c for c in os.listdir(ROOT) if os.path.exists(os.path.join(ROOT, c, "changesets", "c0108-374.changeset.jsonl")))
tot, sk = 0, 0
for c in courses:
    r = plan(c)
    if not r: continue
    tot += len(r["intros"]); sk += len(r["skipped"])
    print(c, len(r["intros"]), "intros", f"skipped {len(r['skipped'])}" if r["skipped"] else "")
print("TOTAL", tot, "intros,", sk, "skipped")
