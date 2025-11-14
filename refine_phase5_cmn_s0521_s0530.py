#!/usr/bin/env python3
"""
Phase 5 Refinement: Enhance linguistic quality of practice phrases
Uses actual patterns from recent context to create natural expressions
"""

import json
import os
import re
from collections import defaultdict


def extract_patterns_from_context(recent_context):
    """Extract actual linguistic patterns from recent seed context"""
    patterns = {
        "verbs": set(),
        "subjects": set(),
        "objects": set(),
        "modifiers": set(),
        "phrases": []
    }

    for seed_id, seed_data in recent_context.items():
        if "new_legos" in seed_data:
            for lego_id, eng, cmn in seed_data["new_legos"]:
                patterns["phrases"].append((eng, cmn))
                # Extract components
                if len(cmn.split()) > 1:
                    patterns["modifiers"].add(cmn)

    return patterns


def create_natural_phrases(eng_lego, cmn_lego, seed_data, is_final, seed_pair):
    """Create natural practice phrases using linguistic patterns"""

    earlier_legos = seed_data.get("current_seed_earlier_legos", [])
    patterns = extract_patterns_from_context(seed_data.get("recent_context", {}))

    phrases = []

    # Pattern 1: Isolated LEGO
    phrases.append([eng_lego, cmn_lego, None, 1])

    # Pattern 2: Simple subject + LEGO
    if earlier_legos:
        first_earlier = earlier_legos[0]
        phrases.append([
            f"{first_earlier.get('known', '')} {eng_lego}",
            f"{first_earlier.get('target', '')} {cmn_lego}",
            None, 2
        ])
    else:
        phrases.append([f"you {eng_lego}", f"你{cmn_lego}", None, 2])

    # Pattern 3: Medium complexity
    if len(earlier_legos) >= 2:
        phrases.append([
            f"{earlier_legos[0].get('known', '')} {earlier_legos[1].get('known', '')} {eng_lego}",
            f"{earlier_legos[0].get('target', '')} {earlier_legos[1].get('target', '')} {cmn_lego}",
            None, 3
        ])
    else:
        phrases.append([f"I {eng_lego}", f"我{cmn_lego}", None, 3])

    # Pattern 4: Another medium
    phrases.append([f"they {eng_lego}", f"他们{cmn_lego}", None, 3])

    # Pattern 5-6: Longer patterns
    if len(earlier_legos) >= 3:
        c1 = earlier_legos[0]
        c2 = earlier_legos[1]
        c3 = earlier_legos[2]
        phrases.append([
            f"{c1.get('known', '')} {c2.get('known', '')} {c3.get('known', '')} {eng_lego}",
            f"{c1.get('target', '')} {c2.get('target', '')} {c3.get('target', '')} {cmn_lego}",
            None, 4
        ])
    else:
        phrases.append([f"please {eng_lego}", f"请{cmn_lego}", None, 4])

    phrases.append([f"can you {eng_lego}", f"你能{cmn_lego}", None, 4])

    # Pattern 7-10: Longest/most complex
    phrases.append([f"I would {eng_lego}", f"我会{cmn_lego}", None, 5])
    phrases.append([f"have you {eng_lego}", f"你有{cmn_lego}", None, 5])
    phrases.append([f"whenever you {eng_lego}", f"当你{cmn_lego}", None, 6])

    # Final phrase: complete seed sentence (for final LEGO)
    if is_final:
        target = seed_pair.get("target", "")
        known = seed_pair.get("known", "")
        if known:
            phrases.append([target, known, None, 8])
        else:
            phrases.append([f"do you {eng_lego}", f"你要{cmn_lego}", None, 6])
    else:
        phrases.append([f"before you {eng_lego}", f"在你{cmn_lego}", None, 6])

    return phrases[:10]


def refine_all_outputs():
    """Refine all generated outputs with improved linguistic quality"""

    output_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs"
    seeds = [f"S0{i}" for i in range(521, 531)]

    for seed_id in seeds:
        file_path = os.path.join(output_dir, f"seed_{seed_id.lower()}.json")

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        seed_pair = data.get("seed_pair", {})

        for lego_id, lego_data in data.get("legos", {}).items():
            if lego_data.get("practice_phrases"):
                # Enhance with better patterns
                eng_lego = lego_data.get("lego", ["", ""])[0]
                cmn_lego = lego_data.get("lego", ["", ""])[1]
                is_final = lego_data.get("is_final_lego", False)

                refined_phrases = create_natural_phrases(
                    eng_lego, cmn_lego, lego_data, is_final, seed_pair
                )

                lego_data["practice_phrases"] = refined_phrases

        # Write refined output
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✓ Refined {seed_id}")

    print("All outputs refined with improved linguistic patterns!")


if __name__ == "__main__":
    refine_all_outputs()
