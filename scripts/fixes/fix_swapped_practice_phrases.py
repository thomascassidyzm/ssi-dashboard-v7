#!/usr/bin/env python3
"""
Fix swapped practice_phrases arrays in lego_baskets_deduplicated.json

The issue: practice_phrases have [Spanish, English] but should be [English, Spanish]

Convention:
  - practice_phrases[0] = English (known language)
  - practice_phrases[1] = Spanish (target language)

We can verify by checking against the lego_pairs data.
"""

import json
import sys
from pathlib import Path

def fix_practice_phrases(baskets_file, lego_pairs_file, output_file=None):
    """
    Fix swapped practice_phrases in baskets

    Args:
        baskets_file: Path to lego_baskets_deduplicated.json
        lego_pairs_file: Path to lego_pairs.json (for verification)
        output_file: Path for output (defaults to baskets_file with .fixed.json)
    """
    print(f"Reading baskets: {baskets_file}")
    with open(baskets_file, 'r', encoding='utf-8') as f:
        basket_data = json.load(f)

    print(f"Reading lego pairs: {lego_pairs_file}")
    with open(lego_pairs_file, 'r', encoding='utf-8') as f:
        lego_data = json.load(f)

    # Index legos by ID for verification
    legos = {}
    for seed in lego_data.get('seeds', []):
        for lego in seed.get('legos', []):
            legos[lego['id']] = lego

    baskets = basket_data.get('baskets', {})
    fixed_count = 0
    verified_count = 0
    total_phrases = 0

    for basket_id, basket in baskets.items():
        practice_phrases = basket.get('practice_phrases', [])
        if not practice_phrases:
            continue

        # Skip if practice_phrases is not a list
        if not isinstance(practice_phrases, list):
            continue

        # Get corresponding lego for verification
        lego = legos.get(basket_id)
        if not lego:
            # Skip baskets without matching legos (some may be orphaned)
            continue

        lego_known = lego['known']  # English
        lego_target = lego['target']  # Spanish

        # Check if phrases are swapped
        # The practice phrases should have English first
        # We can check the first phrase to detect the swap
        first_phrase = practice_phrases[0]

        # Skip if first phrase is not a list/array
        if not isinstance(first_phrase, (list, tuple)) or len(first_phrase) < 2:
            continue

        # If first element contains Spanish content from the lego, it's swapped
        # Simple heuristic: check if the lego's target appears in first element
        if first_phrase[0] == lego_target or lego_target in first_phrase[0]:
            # Phrases are swapped! Swap all of them
            fixed_phrases = []
            for phrase in practice_phrases:
                # Swap: [Spanish, English] -> [English, Spanish]
                fixed_phrases.append([phrase[1], phrase[0]])

            basket['practice_phrases'] = fixed_phrases
            fixed_count += 1
            total_phrases += len(fixed_phrases)
        else:
            verified_count += 1

    print(f"\nFixed {fixed_count} baskets ({total_phrases} phrases)")
    print(f"Verified {verified_count} baskets were already correct")

    # Write output
    if output_file is None:
        output_file = baskets_file.replace('.json', '.fixed.json')

    print(f"Writing: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(basket_data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Done!")

    # Show sample of changes
    print("\n=== SAMPLE OF FIXES ===")
    sample_count = 0
    for basket_id, basket in baskets.items():
        if basket_id in legos:
            lego = legos[basket_id]
            practice_phrases = basket.get('practice_phrases', [])
            if practice_phrases and sample_count < 3:
                print(f"\n{basket_id}:")
                print(f"  Lego: known='{lego['known']}', target='{lego['target']}'")
                print(f"  Practice phrases (first 2):")
                for i, phrase in enumerate(practice_phrases[:2]):
                    print(f"    [{phrase[0]}, {phrase[1]}]")
                sample_count += 1

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 fix_swapped_practice_phrases.py <baskets_file> <lego_pairs_file> [output_file]")
        print("\nExample:")
        print("  python3 fix_swapped_practice_phrases.py public/vfs/courses/spa_for_eng/lego_baskets_deduplicated.json public/vfs/courses/spa_for_eng/lego_pairs.json")
        sys.exit(1)

    baskets_file = sys.argv[1]
    lego_pairs_file = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else None

    fix_practice_phrases(baskets_file, lego_pairs_file, output_file)
