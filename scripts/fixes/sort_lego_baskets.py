#!/usr/bin/env python3
"""
Sort lego_baskets.json by LEGO ID

After multiple merges, baskets can get out of order.
This sorts them back to canonical order: S0001L01, S0001L02, ... S0668L05
"""

import json
import sys
from pathlib import Path
from collections import OrderedDict

def extract_lego_number(lego_id: str) -> tuple:
    """Extract seed and lego numbers from S0001L01 -> (1, 1)"""
    try:
        parts = lego_id.split('L')
        seed_num = int(parts[0][1:])  # S0001 -> 1
        lego_num = int(parts[1])      # L01 -> 1
        return (seed_num, lego_num)
    except:
        # Fallback for malformed IDs
        return (9999, 9999)

def sort_lego_baskets(file_path: Path, dry_run: bool = False):
    """Sort lego_baskets.json by LEGO ID"""
    print(f"\n{'='*60}")
    print(f"SORTING: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    baskets = data.get('baskets', {})
    print(f"  Total baskets: {len(baskets)}")

    # Get current order
    original_order = list(baskets.keys())
    print(f"  First 10 (before): {original_order[:10]}")
    print(f"  Last 10 (before):  {original_order[-10:]}")

    # Sort by LEGO ID
    sorted_basket_ids = sorted(baskets.keys(), key=extract_lego_number)

    # Create new ordered dict
    sorted_baskets = OrderedDict()
    for basket_id in sorted_basket_ids:
        sorted_baskets[basket_id] = baskets[basket_id]

    # Check if order changed
    new_order = list(sorted_baskets.keys())

    if original_order == new_order:
        print(f"\n  ✅ Baskets already in correct order!")
        return 0

    print(f"\n  First 10 (after):  {new_order[:10]}")
    print(f"  Last 10 (after):   {new_order[-10:]}")

    # Count how many positions changed
    changes = sum(1 for i in range(len(original_order)) if original_order[i] != new_order[i])
    print(f"\n  Positions changed: {changes}/{len(baskets)}")

    data['baskets'] = sorted_baskets

    if not dry_run:
        # Backup original
        backup_path = file_path.with_suffix('.json.backup_unsorted')
        with open(backup_path, 'w', encoding='utf-8') as f:
            with open(file_path, 'r', encoding='utf-8') as orig:
                f.write(orig.read())
        print(f"\n  Backup saved: {backup_path.name}")

        # Write sorted version
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Sorted version written")

    return changes

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 sort_lego_baskets.py <course_directory> [--dry-run]")
        print("\nExample:")
        print("  python3 sort_lego_baskets.py public/vfs/courses/spa_for_eng")
        print("  python3 sort_lego_baskets.py public/vfs/courses/spa_for_eng --dry-run")
        print("\nSorts both:")
        print("  - lego_baskets.json")
        print("  - lego_baskets_deduplicated.json")
        sys.exit(1)

    course_dir = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")

    total_changes = 0

    # Sort both basket files
    basket_files = [
        'lego_baskets.json',
        'lego_baskets_deduplicated.json'
    ]

    for filename in basket_files:
        file_path = course_dir / filename
        if file_path.exists():
            changes = sort_lego_baskets(file_path, dry_run)
            total_changes += changes
        else:
            print(f"\n⚠️  {filename} not found - skipping")

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total basket positions changed: {total_changes}")

    if dry_run:
        print("\n⚠️  This was a DRY RUN - no files were modified")
        print("Run without --dry-run to apply sorting")
    else:
        print("\n✅ Sorting complete!")
        print("Backups saved as *.json.backup_unsorted")
        print("\nAll baskets now in canonical order:")
        print("  S0001L01, S0001L02, ... S0668L05")

if __name__ == '__main__':
    main()
