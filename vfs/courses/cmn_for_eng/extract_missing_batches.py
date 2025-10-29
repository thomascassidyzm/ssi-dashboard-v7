#!/usr/bin/env python3
"""
Intelligently extract missing LEGO pairs in batches of 70.
Automatically retries until each batch is complete.
"""

import json
import sys

def load_data():
    """Load seed_pairs.json and lego_pairs.tmp.json"""
    with open('seed_pairs.json', 'r', encoding='utf-8') as f:
        seed_data = json.load(f)

    with open('lego_pairs.tmp.json', 'r', encoding='utf-8') as f:
        lego_data = json.load(f)

    return seed_data, lego_data

def get_existing_seed_ids(lego_data):
    """Extract all existing seed IDs from lego data"""
    return set(seed[0] for seed in lego_data['seeds'])

def find_missing_batches():
    """Find all missing seed batches (groups of 70)"""
    seed_data, lego_data = load_data()
    existing = get_existing_seed_ids(lego_data)

    # Define batches (each 70 seeds)
    batches = [
        (1, 70, "Batch 1: Basic phrases"),
        (71, 140, "Batch 2: Intermediate"),
        (141, 210, "Batch 3: Conditionals"),
        (211, 280, "Batch 4: Questions & Statements"),
        (281, 350, "Batch 5: Verbs & Actions"),
        (351, 420, "Batch 6: Descriptions"),
        (421, 490, "Batch 7: Advanced verbs"),
        (491, 560, "Batch 8: Complex actions"),
        (561, 630, "Batch 9: Thinking verbs"),
        (631, 668, "Batch 10: Polite forms (partial)")
    ]

    missing_batches = []
    for start, end, desc in batches:
        missing_in_batch = []
        for i in range(start, end + 1):
            seed_id = f"S{i:04d}"
            if seed_id not in existing:
                missing_in_batch.append(seed_id)

        if missing_in_batch:
            missing_batches.append({
                'start': start,
                'end': end,
                'description': desc,
                'missing': missing_in_batch,
                'total_missing': len(missing_in_batch)
            })

    return missing_batches

def main():
    print("=" * 70)
    print("MISSING LEGO BATCHES ANALYZER")
    print("=" * 70)
    print()

    missing_batches = find_missing_batches()

    if not missing_batches:
        print("✓ All batches complete! No missing seeds.")
        return

    print(f"Found {len(missing_batches)} incomplete batches:\n")

    for i, batch in enumerate(missing_batches, 1):
        print(f"{i}. {batch['description']}")
        print(f"   Range: S{batch['start']:04d}-S{batch['end']:04d}")
        print(f"   Missing: {batch['total_missing']} seeds")

        # Show first few missing if there are many
        if batch['total_missing'] <= 10:
            print(f"   IDs: {', '.join(batch['missing'])}")
        else:
            first_few = ', '.join(batch['missing'][:5])
            print(f"   IDs: {first_few}, ... and {batch['total_missing'] - 5} more")
        print()

    print("=" * 70)
    print("\nRECOMMENDATION:")
    print("Run extract_batch_with_retry.py for each incomplete batch")
    print("Example: python3 extract_batch_with_retry.py 1 70")
    print("=" * 70)

if __name__ == "__main__":
    main()
