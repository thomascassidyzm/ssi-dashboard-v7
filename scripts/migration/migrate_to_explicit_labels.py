#!/usr/bin/env python3
"""
Migrate existing course data from position-based arrays to explicit labels

Converts:
- seed_pairs.json: array → object with language labels
- lego_pairs.json: seed_pair arrays → objects
- lego_baskets.json: practice_phrases arrays → objects with 12 slots

This is a ONE-TIME migration for existing courses (Spanish, Chinese).
New courses will use v9 format from the start.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any

def detect_languages(course_dir: Path) -> tuple:
    """Detect source and target languages from directory name"""
    dir_name = course_dir.name

    # Map ISO 639-3 codes to full names
    lang_map = {
        'spa': 'spanish',
        'fra': 'french',
        'deu': 'german',
        'cmn': 'mandarin',
        'ita': 'italian',
        'jpn': 'japanese',
        'kor': 'korean',
        'eng': 'english',
        'por': 'portuguese',
        'rus': 'russian'
    }

    # Expected format: xxx_for_yyy (e.g., spa_for_eng)
    parts = dir_name.split('_for_')
    if len(parts) != 2:
        raise ValueError(f"Invalid directory format: {dir_name}. Expected: xxx_for_yyy")

    target_code = parts[0]
    source_code = parts[1]

    target_lang = lang_map.get(target_code)
    source_lang = lang_map.get(source_code)

    if not target_lang or not source_lang:
        raise ValueError(f"Unknown language code: {target_code} or {source_code}")

    return source_lang, target_lang

def migrate_seed_pairs(file_path: Path, source_lang: str, target_lang: str, dry_run: bool = False) -> int:
    """Migrate seed_pairs.json from arrays to explicit labels"""
    print(f"\n{'='*60}")
    print(f"Migrating: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    migrated = 0

    if 'translations' in data:
        new_translations = {}
        for seed_id, pair in data['translations'].items():
            if isinstance(pair, (list, tuple)) and len(pair) == 2:
                # Convert [English, Spanish] → {english: "...", spanish: "..."}
                new_translations[seed_id] = {
                    source_lang: pair[0],
                    target_lang: pair[1]
                }
                migrated += 1
            else:
                # Already in object format
                new_translations[seed_id] = pair

        data['translations'] = new_translations

    if not dry_run:
        # Backup
        backup_path = file_path.with_suffix('.json.backup_v7')
        with open(backup_path, 'w', encoding='utf-8') as f:
            with open(file_path, 'r', encoding='utf-8') as orig:
                f.write(orig.read())

        # Update version
        data['version'] = '9.0.0'

        # Write migrated
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  Migrated {migrated} seed pairs to explicit labels")
    return migrated

def migrate_lego_pairs(file_path: Path, source_lang: str, target_lang: str, dry_run: bool = False) -> int:
    """Migrate lego_pairs.json seed_pair arrays and lego fields"""
    print(f"\n{'='*60}")
    print(f"Migrating: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    seed_pairs_migrated = 0
    lego_fields_migrated = 0

    if 'seeds' in data:
        for seed in data['seeds']:
            # Migrate seed_pair array
            if 'seed_pair' in seed and isinstance(seed['seed_pair'], (list, tuple)):
                if len(seed['seed_pair']) == 2:
                    seed['seed_pair'] = {
                        source_lang: seed['seed_pair'][0],
                        target_lang: seed['seed_pair'][1]
                    }
                    seed_pairs_migrated += 1

            # Migrate lego fields from known/target to language names
            for lego in seed.get('legos', []):
                if 'known' in lego and 'target' in lego:
                    lego[source_lang] = lego.pop('known')
                    lego[target_lang] = lego.pop('target')
                    lego_fields_migrated += 1

                # Migrate components for M-type LEGOs
                if lego.get('type') == 'M' and 'components' in lego:
                    new_components = []
                    for comp in lego['components']:
                        if isinstance(comp, (list, tuple)) and len(comp) == 2:
                            new_components.append({
                                target_lang: comp[0],
                                source_lang: comp[1]
                            })
                        else:
                            new_components.append(comp)
                    lego['components'] = new_components

    if not dry_run:
        # Backup
        backup_path = file_path.with_suffix('.json.backup_v7')
        with open(backup_path, 'w', encoding='utf-8') as f:
            with open(file_path, 'r', encoding='utf-8') as orig:
                f.write(orig.read())

        # Update version
        data['version'] = '9.0.0'

        # Write migrated
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  Migrated {seed_pairs_migrated} seed_pair arrays")
    print(f"  Migrated {lego_fields_migrated} lego field sets")
    return seed_pairs_migrated + lego_fields_migrated

def migrate_baskets(file_path: Path, source_lang: str, target_lang: str, dry_run: bool = False) -> int:
    """Migrate baskets: metadata fields + practice_phrases to 12 slots with labels"""
    print(f"\n{'='*60}")
    print(f"Migrating: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    baskets_migrated = 0
    phrases_migrated = 0

    if 'baskets' in data:
        for basket_id, basket in data['baskets'].items():
            basket_modified = False

            # Migrate metadata seed_context
            if '_metadata' in basket and 'seed_context' in basket['_metadata']:
                sc = basket['_metadata']['seed_context']
                if 'known' in sc and 'target' in sc:
                    basket['_metadata']['seed_context'] = {
                        source_lang: sc['known'],
                        target_lang: sc['target']
                    }
                    basket_modified = True

            # Migrate practice_phrases to 12-slot explicit format
            practice_phrases = basket.get('practice_phrases', [])
            if isinstance(practice_phrases, list) and len(practice_phrases) > 0:
                new_phrases = []

                # Convert existing phrases
                for phrase in practice_phrases:
                    if isinstance(phrase, (list, tuple)) and len(phrase) >= 2:
                        new_phrases.append({
                            source_lang: phrase[0],
                            target_lang: phrase[1],
                            'notes': ''
                        })
                        phrases_migrated += 1
                    elif isinstance(phrase, dict):
                        # Already in object format, just ensure it has notes
                        if 'notes' not in phrase:
                            phrase['notes'] = ''
                        new_phrases.append(phrase)

                # Pad to 12 slots with empty entries
                while len(new_phrases) < 12:
                    new_phrases.append({
                        source_lang: '',
                        target_lang: '',
                        'notes': ''
                    })

                basket['practice_phrases'] = new_phrases
                basket_modified = True

            if basket_modified:
                baskets_migrated += 1

    if not dry_run:
        # Backup
        backup_path = file_path.with_suffix('.json.backup_v7')
        with open(backup_path, 'w', encoding='utf-8') as f:
            with open(file_path, 'r', encoding='utf-8') as orig:
                f.write(orig.read())

        # Update version
        data['version'] = '9.0.0'

        # Write migrated
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  Migrated {baskets_migrated} baskets")
    print(f"  Migrated {phrases_migrated} practice phrases to explicit labels")
    print(f"  All baskets now have 12 phrase slots")
    return baskets_migrated

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 migrate_to_explicit_labels.py <course_directory> [--dry-run]")
        print("\nExample:")
        print("  python3 migrate_to_explicit_labels.py public/vfs/courses/spa_for_eng")
        print("  python3 migrate_to_explicit_labels.py public/vfs/courses/cmn_for_eng --dry-run")
        print("\nThis migrates:")
        print("  - seed_pairs.json: arrays → objects")
        print("  - lego_pairs.json: seed_pair arrays → objects, known/target → language names")
        print("  - lego_baskets.json: practice_phrases → 12-slot explicit format")
        sys.exit(1)

    course_dir = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")

    # Detect languages
    try:
        source_lang, target_lang = detect_languages(course_dir)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"MIGRATION: {course_dir.name}")
    print(f"{'='*60}")
    print(f"Languages: {source_lang} → {target_lang}")
    print(f"Format: v7 (arrays) → v9 (explicit labels)")
    print(f"")

    total_items = 0

    # Migrate each file
    files = [
        ('seed_pairs.json', migrate_seed_pairs),
        ('lego_pairs.json', migrate_lego_pairs),
        ('lego_baskets.json', migrate_baskets),
        ('lego_baskets_deduplicated.json', migrate_baskets),
    ]

    for filename, migrator_func in files:
        file_path = course_dir / filename
        if file_path.exists():
            count = migrator_func(file_path, source_lang, target_lang, dry_run)
            total_items += count
        else:
            print(f"\n⚠️  {filename} not found - skipping")

    # Summary
    print(f"\n{'='*60}")
    print(f"MIGRATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total items migrated: {total_items}")

    if dry_run:
        print("\n⚠️  This was a DRY RUN - no files were modified")
        print("Run without --dry-run to apply migration")
    else:
        print("\n✅ Migration complete!")
        print(f"   All files backed up as *.json.backup_v7")
        print(f"   All data now uses explicit labels:")
        print(f"     - {source_lang} (source language)")
        print(f"     - {target_lang} (target language)")
        print(f"   Practice phrases have 12 slots with labeled fields")

if __name__ == '__main__':
    main()
