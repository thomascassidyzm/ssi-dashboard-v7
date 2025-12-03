#!/usr/bin/env python3
"""
Rebuild course manifest presentations from lego_pairs.json (SSoT)

This script:
1. Reads lego_pairs.json as the Single Source of Truth
2. Reads the existing manifest
3. Matches by seed sentence + target text
4. Rebuilds the presentation string from lego_pairs data
5. Writes updated manifest

The presentation format is:
  A-type: {intro_text} ... '{target}' ... '{target}'
  M-type: {intro_text} ... '{target}' ... '{target}' - {target1}'{comp1}' means {known1}, ...

Usage:
    python rebuild_manifest_from_lego_pairs.py
"""

import json
from pathlib import Path

# Paths
COURSE_DIR = Path(__file__).parent.parent / "public/vfs/courses/cmn_for_eng"
MANIFEST_PATH = COURSE_DIR / "cmn_for_eng_course_manifest.json"
LEGO_PAIRS_PATH = COURSE_DIR / "lego_pairs.json"
OUTPUT_PATH = COURSE_DIR / "cmn_for_eng_course_manifest_rebuilt.json"


def build_presentation_string(seed_sentence: str, lego_data: dict) -> str:
    """
    Build the presentation string from lego_pairs data.

    A-type format:
        The Chinese for '{known}', as in '{seed}', is: ... '{target}' ... '{target}'

    M-type format:
        The Chinese for '{known}', as in '{seed}', is: ... '{target}' ... '{target}' - {target1}'{comp1}' means {known1}, ...
    """
    known = lego_data["known"]
    target = lego_data["target"]
    lego_type = lego_data.get("type", "A")
    components = lego_data.get("components", [])

    # Build intro text
    intro = f"The Chinese for '{known}', as in '{seed_sentence}', is:"

    # Base presentation
    presentation = f"{intro} ... '{target}' ... '{target}'"

    # Add component breakdown for M-type
    if lego_type == "M" and components:
        component_parts = []
        for comp in components:
            comp_target = comp.get("target", "")
            comp_known = comp.get("known", "")
            component_parts.append(f"{{target1}}'{comp_target}' means {comp_known}")

        if component_parts:
            presentation += " - " + ", ".join(component_parts)

    return presentation


def main():
    print("Loading lego_pairs.json (SSoT)...")
    with open(LEGO_PAIRS_PATH) as f:
        lego_pairs = json.load(f)

    print("Loading manifest...")
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    # Build index from lego_pairs by (seed_sentence, target_text)
    lp_index = {}
    for seed_data in lego_pairs["seeds"]:
        seed_sentence = seed_data["seed_pair"]["known"]
        for lego in seed_data["legos"]:
            target_text = lego["lego"]["target"]
            key = (seed_sentence, target_text)
            lp_index[key] = {
                "lego_id": lego["id"],
                "type": lego["type"],
                "known": lego["lego"]["known"],
                "target": target_text,
                "components": lego.get("components", []),
            }

    print(f"Built lego_pairs index with {len(lp_index)} entries")

    # Update manifest
    updated_count = 0
    unchanged_count = 0
    not_found_count = 0
    total_items = 0

    for slice_data in manifest.get("slices", []):
        for seed in slice_data.get("seeds", []):
            seed_sentence = seed.get("seed_sentence", {}).get("canonical", "")

            for item in seed.get("introduction_items", []):
                total_items += 1
                target_text = item.get("node", {}).get("target", {}).get("text", "")

                key = (seed_sentence, target_text)
                if key in lp_index:
                    lego_data = lp_index[key]
                    new_presentation = build_presentation_string(seed_sentence, lego_data)
                    old_presentation = item.get("presentation", "")

                    if new_presentation != old_presentation:
                        item["presentation"] = new_presentation
                        updated_count += 1
                    else:
                        unchanged_count += 1
                else:
                    not_found_count += 1

    print(f"\nProcessed {total_items} introduction_items")
    print(f"Updated: {updated_count}")
    print(f"Unchanged: {unchanged_count}")
    print(f"Not found in lego_pairs: {not_found_count}")

    # Save updated manifest
    print(f"\nWriting rebuilt manifest to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("Done!")

    # Show sample comparisons
    print("\n=== Sample Presentations ===")
    sample_count = 0
    for slice_data in manifest.get("slices", []):
        for seed in slice_data.get("seeds", []):
            seed_sentence = seed.get("seed_sentence", {}).get("canonical", "")
            for item in seed.get("introduction_items", []):
                target_text = item.get("node", {}).get("target", {}).get("text", "")
                key = (seed_sentence, target_text)
                if key in lp_index and sample_count < 5:
                    lego_data = lp_index[key]
                    print(f"\n[{lego_data['lego_id']}] {lego_data['known']} -> {target_text}")
                    print(f"  Type: {lego_data['type']}")
                    if lego_data["components"]:
                        comps = ", ".join(
                            f"{c['known']}={c['target']}" for c in lego_data["components"]
                        )
                        print(f"  Components: {comps}")
                    print(f"  Presentation: {item['presentation'][:100]}...")
                    sample_count += 1
                if sample_count >= 5:
                    break
            if sample_count >= 5:
                break
        if sample_count >= 5:
            break


if __name__ == "__main__":
    main()
