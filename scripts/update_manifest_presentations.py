#!/usr/bin/env python3
"""
Update course manifest with corrected presentations from introductions_v2.json

This script:
1. Reads the existing manifest
2. Reads the new introductions_v2.json
3. Matches by seed sentence + target text (not position-based)
4. Reconstructs the presentation string from v2 data
5. Writes updated manifest

Usage:
    python update_manifest_presentations.py
"""

import json
import re
from pathlib import Path

# Paths
COURSE_DIR = Path(__file__).parent.parent / "public/vfs/courses/cmn_for_eng"
MANIFEST_PATH = COURSE_DIR / "cmn_for_eng_course_manifest.json"
INTROS_V2_PATH = COURSE_DIR / "introductions_v2.json"
OUTPUT_PATH = COURSE_DIR / "cmn_for_eng_course_manifest_updated.json"


def extract_seed_sentence(text: str):
    """Extract the seed sentence from the 'as in' pattern in presentation text."""
    match = re.search(r"as in '([^']+)'", text)
    return match.group(1) if match else None


def build_presentation_string(v2_data: dict) -> str:
    """
    Reconstruct the presentation string from v2 structured data.

    A-type format:
        {text} ... '{target}' ... '{target}'

    M-type format:
        {text} ... '{target}' ... '{target}' - {target1}'{comp1_target}' means {comp1_known}, ...
    """
    text = v2_data["text"]
    target = v2_data["target_text"]
    lego_type = v2_data.get("type", "A")
    components = v2_data.get("components", [])

    # Base presentation
    presentation = f"{text} ... '{target}' ... '{target}'"

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
    print("Loading manifest...")
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    print("Loading introductions_v2.json...")
    with open(INTROS_V2_PATH) as f:
        intros_v2 = json.load(f)

    presentations = intros_v2.get("presentations", {})

    # Build index by (seed_sentence, target_text)
    # This is more robust than position-based matching
    v2_index = {}
    for lego_id, data in presentations.items():
        seed_sentence = extract_seed_sentence(data.get("text", ""))
        target_text = data["target_text"]
        if seed_sentence:
            key = (seed_sentence, target_text)
            v2_index[key] = data

    print(f"Built index with {len(v2_index)} entries (by sentence + target)")

    # Update manifest
    updated_count = 0
    not_found_count = 0
    total_items = 0

    for slice_data in manifest.get("slices", []):
        for seed in slice_data.get("seeds", []):
            seed_sentence = seed.get("seed_sentence", {}).get("canonical", "")

            for item in seed.get("introduction_items", []):
                total_items += 1
                target_text = item.get("node", {}).get("target", {}).get("text", "")

                key = (seed_sentence, target_text)
                if key in v2_index:
                    v2_data = v2_index[key]
                    new_presentation = build_presentation_string(v2_data)
                    old_presentation = item.get("presentation", "")

                    if new_presentation != old_presentation:
                        item["presentation"] = new_presentation
                        updated_count += 1
                else:
                    not_found_count += 1

    print(f"\nProcessed {total_items} introduction_items")
    print(f"Updated: {updated_count}")
    print(f"Not found in v2: {not_found_count}")

    # Save updated manifest
    print(f"\nWriting updated manifest to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("Done!")

    # Show sample changes
    print("\n=== Sample Changes ===")
    sample_count = 0
    for slice_data in manifest.get("slices", []):
        for seed in slice_data.get("seeds", []):
            seed_sentence = seed.get("seed_sentence", {}).get("canonical", "")
            for item in seed.get("introduction_items", []):
                target_text = item.get("node", {}).get("target", {}).get("text", "")
                key = (seed_sentence, target_text)
                if key in v2_index and sample_count < 3:
                    print(f"\n{seed_sentence[:50]}... - {target_text}")
                    print(f"  New: {item['presentation'][:100]}...")
                    sample_count += 1
                if sample_count >= 3:
                    break
            if sample_count >= 3:
                break
        if sample_count >= 3:
            break


if __name__ == "__main__":
    main()
