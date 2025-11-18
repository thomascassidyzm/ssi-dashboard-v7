#!/usr/bin/env python3
"""
Sort lego_pairs.json by seed ID and LEGO ID

After multiple merges, the LEGOs can get out of order.
This sorts them back to canonical order: S0001, S0002, ... S0001L01, S0001L02, etc.
"""

import json
import sys
from pathlib import Path

def extract_seed_number(seed_id: str) -> int:
    """Extract numeric part from S0001 -> 1"""
    return int(seed_id[1:])

def extract_lego_number(lego_id: str) -> tuple:
    """Extract seed and lego numbers from S0001L01 -> (1, 1)"""
    parts = lego_id.split('L')
    seed_num = int(parts[0][1:])
    lego_num = int(parts[1])
    return (seed_num, lego_num)

def sort_lego_pairs(file_path: Path, dry_run: bool = False):
    """Sort lego_pairs.json by seed ID and LEGO ID"""
    print(f"\n{'='*60}")
    print(f"SORTING: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    seeds = data.get('seeds', [])
    print(f"  Total seeds: {len(seeds)}")

    # Sort seeds by seed_id
    seeds.sort(key=lambda s: extract_seed_number(s['seed_id']))

    # Sort LEGOs within each seed
    legos_sorted = 0
    for seed in seeds:
        if 'legos' in seed:
            original_order = [l['id'] for l in seed['legos']]
            seed['legos'].sort(key=lambda l: extract_lego_number(l['id']))
            new_order = [l['id'] for l in seed['legos']]

            if original_order != new_order:
                legos_sorted += 1
                print(f"  Sorted LEGOs in {seed['seed_id']}")
                print(f"    Was: {original_order}")
                print(f"    Now: {new_order}")

    data['seeds'] = seeds

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

    print(f"\n  Seeds with reordered LEGOs: {legos_sorted}")
    return legos_sorted

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 sort_lego_pairs.py <course_directory> [--dry-run]")
        print("\nExample:")
        print("  python3 sort_lego_pairs.py public/vfs/courses/spa_for_eng")
        print("  python3 sort_lego_pairs.py public/vfs/courses/spa_for_eng --dry-run")
        sys.exit(1)

    course_dir = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")

    lego_pairs_file = course_dir / 'lego_pairs.json'

    if not lego_pairs_file.exists():
        print(f"Error: {lego_pairs_file} not found")
        sys.exit(1)

    sorted_count = sort_lego_pairs(lego_pairs_file, dry_run)

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Seeds with reordered LEGOs: {sorted_count}")

    if dry_run:
        print("\n⚠️  This was a DRY RUN - no files were modified")
        print("Run without --dry-run to apply sorting")
    else:
        print("\n✅ Sorting complete!")
        print("Backup saved as lego_pairs.json.backup_unsorted")
        print("\nAll seeds and LEGOs now in canonical order:")
        print("  - Seeds: S0001, S0002, S0003, ...")
        print("  - LEGOs: S0001L01, S0001L02, S0001L03, ...")

if __name__ == '__main__':
    main()
