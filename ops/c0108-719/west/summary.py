"""west shard: writes ops/c0108-719/plans-west.md, one line per course, from the a./b. outputs + the verb notes below."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, "tools"))
import popty
from specs import SPECS
V = {
 "afr_for_eng": "gehoop -> verwag (HAT / Pharos)", "dan_for_eng": "håbede (på) -> forventede (Den Danske Ordbog)",
 "deu_for_eng": "gehofft -> erwartet (Duden); hope LEGO re-cut 'have expected' = 'haben erwartet'",
 "deu_at_for_eng": "ghofft -> erwartet (Österreichisches Wörterbuch)", "deu_ch_for_eng": "ghofft -> erwartet (Idiotikon / Zürichdeutsches Wörterbuch)",
 "fry_for_eng": "hopen -> ferwachten (Frysk Hânwurdboek / taalweb.frl); LEGO re-cut 'we didn't expect' = 'wy ferwachten net'; 'om' dropped",
 "isl_for_eng": "vonuðum -> bjuggumst við (ISLEX: búast við)", "nld_for_eng": "hoopten -> verwachtten (Van Dale)",
 "nor_for_eng": "håpet -> forventet (Bokmålsordboka)", "pdc_for_eng": "ghofft -> erwaart (Beam, Revised Pennsylvania German Dictionary)",
 "swe_for_eng": "hoppades på -> förväntade oss (Svensk ordbok / SAOL)", "yid_for_eng": "געהאָפֿט -> זיך געריכט (Beinfeld & Bochner: ריכטן זיך)",
 "gla_for_eng": "an dòchas -> dùil (Am Faclair Beag / LearnGaelic); LEGO re-cut 'we didn't expect' = 'cha robh dùil againn'",
 "cor_for_eng": "govenek -> gwaytya (Gerlyver Kernewek); LEGO re-cut 'we didn't expect' = 'nyns esen ni ow kwaytya'; wake LEGO 'dhe dhifuna' (M) -> 'difuna' (A)",
 "bre_for_eng": "spi -> gortoz (Favereau / Ménard): ne c'hortozemp ket dihuniñ",
 "fra_for_eng": "espérions -> nous attendions à (Larousse / Le Robert); LEGO re-cut 'we didn't expect to' = 'nous ne nous attendions pas à'",
 "fra_ca_for_eng": "espérait -> s'attendait à (Usito); LEGO re-cut 'we didn't expect to' = 'on s'attendait pas à'",
 "ita_for_eng": "speravamo -> ci aspettavamo (Treccani); LEGO re-cut 'we didn't expect to wake up' = 'non ci aspettavamo di svegliarci'",
 "ron_for_eng": "am sperat -> ne așteptam (DEX)", "mlt_for_eng": "ttamajniex -> stennejniex + li (Aquilina); LEGO re-cut 'we didn't expect' = 'ma stennejniex'",
 "fur_for_eng": "speravin -> si spietavin (Grant Dizionari Bilengâl, ARLeF)", "lmo_for_eng": "speravom -> se speciavom (Cherubini)",
 "nap_for_eng": "speràvemo -> ce aspettàvemo (D'Ascoli)", "rgn_for_eng": "sperémi -> s'aspitémi (Ercolani)", "roh_for_eng": "sperà -> spetgà (Pledari Grond)",
 "scn_for_eng": "spiràvamu -> n'aspittàvamu (Piccitto)", "vec_for_eng": "speràvimo -> se spetàvimo (Boerio)",
 "eng_for_deu": "known hofften -> erwarteten (Duden); LEGO re-cut 'erwarteten nicht aufzuwachen' = 'didn't expect to wake up'",
 "eng_for_fra": "known espérions -> nous attendions à (Larousse); LEGO re-cut 'nous ne nous attendions pas à' = 'we didn't expect to'",
 "eng_for_ita": "known speravamo -> ci aspettavamo (Treccani); LEGO re-cut 'non ci aspettavamo di' = 'we didn't expect to'; wake LEGO English -> 'wake up'",
}
HELD = {
 "eng_for_deu": "L01 'wir hofften' = 'we hoped' (not-new reference LEGO, no rows) no longer matches the seed; left untouched, deleting it is structural",
 "fry_for_eng": "nothing held; 10 rows become Auke re-takes (human voice)",
 "cor_for_eng": "nothing held; 2 component rows of the old M wake LEGO are deleted (A LEGO has none); course parked for audio",
 "bre_for_eng": "nothing held; verb is dictionary-sourced best effort, unread by a native",
}
SEEDONLY = {"yid_for_eng", "bre_for_eng", "fur_for_eng", "lmo_for_eng", "nap_for_eng", "rgn_for_eng", "roh_for_eng", "scn_for_eng", "vec_for_eng"}
lines = ["# C0108 hope -> expect: plans, shard west (cs #770·AI). Nothing applied; every ops file is dry-run only.",
 "", "a = the commissioned plan (seed pair, hope LEGO re-cut, rows). b = add-on proposal for courses whose seed 108 never had a hope LEGO:",
 "one lego.insert (short expect chunk, type A, next free index) + 9 phrase.insert rows, so the new verb is taught. b is STRUCTURAL (apply needs tom_go on beta/released) and must go in WITH or BEFORE a, otherwise a leaves the verb untaught.",
 "Natural positive rows ('we hoped to wake up in time', 'she hoped not to wake up...') keep hope; only wake -> wake up there.",
 "", "course | verb choice + source | ops | new validator issues | dry-run ok | held"]
for c in SPECS:
    a = json.load(open(f"{ROOT}/{c}/a.ops.json"))["ops"]; v = json.load(open(f"{ROOT}/{c}/a.validate.json"))["108"]["new_issues"]; dr = json.load(open(f"{ROOT}/{c}/a.dry.json"))
    ok = "yes" if dr.get("status") == 200 and dr.get("ok") else f"NO ({dr.get('status')})"
    ops = f"a: {len(a)}"; held = HELD.get(c, "nothing held")
    if os.path.exists(f"{ROOT}/{c}/b.ops.json"):
        b = json.load(open(f"{ROOT}/{c}/b.ops.json"))["ops"]; bv = json.load(open(f"{ROOT}/{c}/b.validate.json"))["108"]["new_issues"]; bd = json.load(open(f"{ROOT}/{c}/b.dry.json"))
        ops += f" + b: {len(b)} (new LEGO '{b[0]['row']['known_text']}' = '{b[0]['row']['target_text']}')"
        iss = f"a alone: {len(v)} (verb untaught: tiling + vocab); a+b: {'none' if not bv else bv}"
        ok += " / b " + ("yes" if bd.get("status") == 200 and bd.get("ok") else f"NO ({bd.get('status')})")
        held = "b held: lego.insert needs tom_go on apply" + ("" if c not in HELD else "; " + HELD[c])
    elif c in SEEDONLY: iss = "1, acceptable: 'vocabulary not covered by LEGOs' lists the whole seed because this draft has no LEGOs at all (same state as live; the check only fires when a target is simulated)"
    else: iss = "none" if not v else str(v)
    lines.append(f"{c} | {V[c]} | {ops} | {iss} | {ok} | {held}")
open(f"{ROOT}/plans-west.md", "w").write("\n".join(lines) + "\n"); print(len(lines) - 7, "courses")
# leftover audit: English still saying hope / bare wake in seed 108 after a
import re
for c in SPECS:
    sim = popty.apply_ops(c, json.load(open(f"{ROOT}/{c}/a.ops.json"))["ops"]).get(108) or popty.load(c, 108)
    side = "known_text" if c.endswith("_for_eng") else "target_text"
    for L in sim["legos"].values():
        for p in L["phrases"]:
            if re.search(r"\bhop(e|ed|ing)\b|\b(wake|waking)\b(?! up)", p[side], re.I): print("  left:", c, p["id"].split(":")[1], p["known_text"], "|", p["target_text"])
