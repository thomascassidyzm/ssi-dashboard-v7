#!/usr/bin/env python3
"""
Fix basket distributions to match 2-2-2-4 requirement
Also ensures final seed sentence is included for last LEGO of each seed
"""

import json
from typing import List, Dict, Tuple

def count_legos_in_phrase(spanish: str) -> int:
    """Estimate LEGO count based on word count"""
    words = spanish.split()
    return len(words)

def select_best_distribution(phrases: List[List], is_final_lego: bool = False, seed_sentence: Tuple[str, str] = None) -> List[List]:
    """
    Select 10 phrases with distribution 2-2-2-4
    If is_final_lego, ensure last phrase is the seed sentence
    """
    # Group phrases by count
    by_count = {}
    for phrase in phrases:
        count = phrase[3]
        if count not in by_count:
            by_count[count] = []
        by_count[count].append(phrase)

    selected = []

    # Select 2 phrases with 1-2 LEGOs
    for count in [1, 2]:
        if count in by_count:
            selected.extend(by_count[count][:2-len([p for p in selected if p[3] <= 2])])

    # Select 2 phrases with 3 LEGOs
    if 3 in by_count:
        selected.extend(by_count[3][:2])

    # Select 2 phrases with 4-5 LEGOs
    for count in [4, 5]:
        if count in by_count:
            selected.extend(by_count[count][:2-len([p for p in selected if 4 <= p[3] <= 5])])

    # Select 4 phrases with 6+ LEGOs
    for count in sorted([c for c in by_count.keys() if c >= 6]):
        if count in by_count:
            selected.extend(by_count[count][:4-len([p for p in selected if p[3] >= 6])])

    # If we still need phrases, fill from what we have
    while len(selected) < 9 and len(phrases) > len(selected):
        for phrase in phrases:
            if phrase not in selected and len(selected) < 9:
                selected.append(phrase)

    # Add seed sentence as final phrase if this is the final LEGO
    if is_final_lego and seed_sentence:
        # Estimate count for seed sentence
        count = count_legos_in_phrase(seed_sentence[1])
        selected.append([seed_sentence[0], seed_sentence[1], None, count])
    else:
        # Add one more phrase to reach 10
        for phrase in phrases:
            if phrase not in selected:
                selected.append(phrase)
                break

    return selected[:10]

def fix_baskets(input_file: str, output_file: str):
    """Fix distributions in basket file"""
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Track fixes
    fixes = []

    # Process each seed
    for seed_key in [k for k in data.keys() if k.startswith('S0')]:
        seed_data = data[seed_key]
        seed_pair = seed_data.get('seed_pair', {})
        legos = seed_data.get('legos', {})

        lego_ids = list(legos.keys())

        for idx, lego_id in enumerate(lego_ids):
            is_final = (idx == len(lego_ids) - 1)
            lego_data = legos[lego_id]

            original_phrases = lego_data['practice_phrases']
            original_dist = lego_data['phrase_distribution']

            # Fix distribution
            if is_final:
                seed_sentence = (seed_pair['known'], seed_pair['target'])
                fixed_phrases = select_best_distribution(original_phrases, True, seed_sentence)
            else:
                fixed_phrases = select_best_distribution(original_phrases, False)

            # Update
            lego_data['practice_phrases'] = fixed_phrases

            # Recalculate distribution
            new_dist = {
                "really_short_1_2": sum(1 for p in fixed_phrases if p[3] <= 2),
                "quite_short_3": sum(1 for p in fixed_phrases if p[3] == 3),
                "longer_4_5": sum(1 for p in fixed_phrases if 4 <= p[3] <= 5),
                "long_6_plus": sum(1 for p in fixed_phrases if p[3] >= 6)
            }
            lego_data['phrase_distribution'] = new_dist

            # Track if we made changes
            if original_dist != new_dist or len(original_phrases) != len(fixed_phrases):
                fixes.append(f"{lego_id}: {original_dist} -> {new_dist}")

    # Save fixed version
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Fixed {len(fixes)} LEGOs")
    for fix in fixes[:10]:  # Show first 10
        print(f"  {fix}")
    if len(fixes) > 10:
        print(f"  ... and {len(fixes) - 10} more")

def main():
    import os
    base_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300"
    input_file = os.path.join(base_path, "batch_output/agent_11_baskets.json")
    output_file = os.path.join(base_path, "batch_output/agent_11_baskets.json")

    fix_baskets(input_file, output_file)
    print(f"\nFixed baskets saved to: {output_file}")

if __name__ == "__main__":
    main()
