#!/usr/bin/env python3
"""
Validate phase outputs to catch swaps BEFORE they propagate

Run this after EACH phase to catch issues early:
- After Phase 1: Check seed_pairs.json
- After Phase 3: Check lego_pairs.json
- After Phase 5: Check lego_baskets.json

This prevents swaps from propagating through the pipeline!
"""

import json
import sys
from pathlib import Path
from detect_all_swaps import LanguageDetector

def validate_seed_pairs(file_path: Path, detector: LanguageDetector, target_lang: str) -> int:
    """Validate seed_pairs.json - should be [known, target]"""
    print(f"\n{'='*60}")
    print(f"Validating: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    swaps_found = 0

    if 'translations' in data:
        for seed_id, pair in data['translations'].items():
            if isinstance(pair, (list, tuple)) and len(pair) == 2:
                is_swapped, score1, score2 = detector.is_swapped(pair)
                if is_swapped:
                    print(f"  ❌ {seed_id}: {pair}")
                    swaps_found += 1

    if swaps_found == 0:
        print(f"  ✅ All {len(data.get('translations', {}))} seed pairs correctly ordered")
    else:
        print(f"  ❌ Found {swaps_found} swapped pairs!")

    return swaps_found

def validate_lego_pairs(file_path: Path, detector: LanguageDetector, target_lang: str) -> int:
    """Validate lego_pairs.json - known should be English, target should be target language"""
    print(f"\n{'='*60}")
    print(f"Validating: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    swaps_found = 0

    if 'seeds' in data:
        for seed in data['seeds']:
            for lego in seed.get('legos', []):
                known = lego.get('known', '')
                target = lego.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                if known_score > target_score + 10:
                    print(f"  ❌ {lego['id']}: known='{known}', target='{target}'")
                    swaps_found += 1

    total_legos = sum(len(s.get('legos', [])) for s in data.get('seeds', []))

    if swaps_found == 0:
        print(f"  ✅ All {total_legos} legos correctly ordered")
    else:
        print(f"  ❌ Found {swaps_found} swapped legos!")

    return swaps_found

def validate_baskets(file_path: Path, detector: LanguageDetector, target_lang: str) -> int:
    """Validate lego_baskets.json - practice_phrases should be [known, target]"""
    print(f"\n{'='*60}")
    print(f"Validating: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    swaps_found = 0
    total_phrases = 0

    if 'baskets' in data:
        for basket_id, basket in data['baskets'].items():
            # Check metadata
            if '_metadata' in basket and 'seed_context' in basket['_metadata']:
                sc = basket['_metadata']['seed_context']
                known = sc.get('known', '')
                target = sc.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                if known_score > target_score + 10:
                    swaps_found += 1

            # Check practice_phrases
            practice_phrases = basket.get('practice_phrases', [])
            if isinstance(practice_phrases, list):
                for phrase in practice_phrases:
                    if isinstance(phrase, (list, tuple)) and len(phrase) >= 2:
                        total_phrases += 1
                        pair = [phrase[0], phrase[1]]
                        is_swapped, _, _ = detector.is_swapped(pair)
                        if is_swapped:
                            swaps_found += 1

    if swaps_found == 0:
        print(f"  ✅ All {total_phrases} practice phrases correctly ordered")
    else:
        print(f"  ❌ Found {swaps_found} swapped entries!")

    return swaps_found

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_phase_outputs.py <course_directory>")
        print("\nExample:")
        print("  python3 validate_phase_outputs.py public/vfs/courses/spa_for_eng")
        print("  python3 validate_phase_outputs.py public/vfs/courses/cmn_for_eng")
        print("\nRun this after EACH phase to catch swaps early!")
        sys.exit(1)

    course_dir = Path(sys.argv[1])

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    # Detect target language from directory name
    dir_name = course_dir.name
    target_lang = dir_name.split('_')[0] if '_' in dir_name else 'unknown'

    print(f"\n{'='*60}")
    print(f"VALIDATING COURSE: {course_dir.name}")
    print(f"Target language: {target_lang}")
    print(f"{'='*60}")

    detector = LanguageDetector()
    total_swaps = 0

    # Check each phase file
    files_to_check = [
        ('seed_pairs.json', validate_seed_pairs),
        ('lego_pairs.json', validate_lego_pairs),
        ('lego_baskets.json', validate_baskets),
        ('lego_baskets_deduplicated.json', validate_baskets),
    ]

    for filename, validator_func in files_to_check:
        file_path = course_dir / filename
        if file_path.exists():
            swaps = validator_func(file_path, detector, target_lang)
            total_swaps += swaps
        else:
            print(f"\n⚠️  {filename} not found (might not be generated yet)")

    # Summary
    print(f"\n{'='*60}")
    print(f"VALIDATION SUMMARY")
    print(f"{'='*60}")

    if total_swaps == 0:
        print(f"✅ ALL PHASE OUTPUTS ARE VALID!")
        print(f"   No swaps detected - safe to proceed to next phase")
        sys.exit(0)
    else:
        print(f"❌ FOUND {total_swaps} SWAPS!")
        print(f"   Run fix_all_swaps.py to fix them before proceeding")
        sys.exit(1)

if __name__ == '__main__':
    main()
