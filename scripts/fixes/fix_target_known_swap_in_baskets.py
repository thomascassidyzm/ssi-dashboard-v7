#!/usr/bin/env python3
"""
Fix swapped target/known fields in lego_baskets_deduplicated.json

The issue: In _metadata.seed_context, the fields are backwards:
  - "target" contains English (should be Spanish)
  - "known" contains Spanish (should be English)

Convention (from Italian reference and lego_pairs.json):
  - "target" = Spanish (the language being learned)
  - "known" = English (the language the learner knows)
"""

import json
import sys
from pathlib import Path

def fix_baskets_metadata(input_file, output_file=None):
    """
    Fix swapped target/known in _metadata.seed_context

    Args:
        input_file: Path to lego_baskets_deduplicated.json
        output_file: Path for output (defaults to input_file with .fixed.json)
    """
    print(f"Reading: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    baskets = data.get('baskets', {})
    fixed_count = 0
    total_count = 0

    for basket_id, basket in baskets.items():
        if '_metadata' in basket and 'seed_context' in basket['_metadata']:
            total_count += 1
            seed_context = basket['_metadata']['seed_context']

            # Swap the fields
            old_target = seed_context.get('target', '')
            old_known = seed_context.get('known', '')

            # The "target" currently has English, "known" has Spanish
            # We need to swap them
            seed_context['target'] = old_known  # Spanish (was in 'known')
            seed_context['known'] = old_target   # English (was in 'target')

            fixed_count += 1

    print(f"\nFixed {fixed_count} out of {total_count} metadata entries")

    # Write output
    if output_file is None:
        output_file = input_file.replace('.json', '.fixed.json')

    print(f"Writing: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Done!")

    # Show sample of changes
    print("\n=== SAMPLE OF CHANGES ===")
    sample_keys = [k for k in baskets.keys() if k.startswith('S')][:3]
    for basket_id in sample_keys:
        if '_metadata' in baskets[basket_id]:
            sc = baskets[basket_id]['_metadata']['seed_context']
            print(f"\n{basket_id}:")
            print(f"  target (Spanish): {sc['target']}")
            print(f"  known (English):  {sc['known']}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 fix_target_known_swap_in_baskets.py <input_file> [output_file]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    fix_baskets_metadata(input_file, output_file)
