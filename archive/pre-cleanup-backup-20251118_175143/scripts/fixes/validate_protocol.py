#!/usr/bin/env python3
"""
Validate the entire course data protocol for known/target consistency

Checks:
1. seed_pairs.json - Are unlabeled arrays [English, Spanish]?
2. lego_pairs.json - Are labeled fields and unlabeled arrays consistent?
3. lego_baskets.json - Are all fields following [English, Spanish] convention?

This validates the ROOT PROTOCOL to catch issues before agent processing.
"""

import json
import sys
from pathlib import Path
from detect_all_swaps import LanguageDetector

def validate_seed_pairs(file_path: Path, detector: LanguageDetector) -> dict:
    """Validate seed_pairs.json - unlabeled arrays"""
    print(f"\n{'='*60}")
    print(f"VALIDATING: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    swaps = []

    if 'translations' in data:
        for seed_id, pair in data['translations'].items():
            if isinstance(pair, (list, tuple)) and len(pair) == 2:
                is_swapped, score1, score2 = detector.is_swapped(pair)
                if is_swapped:
                    swaps.append({
                        'seed_id': seed_id,
                        'pair': pair,
                        'scores': [score1, score2]
                    })

    total = len(data.get('translations', {}))
    print(f"  Total seed pairs: {total}")
    print(f"  Swapped pairs: {len(swaps)}")

    if swaps:
        print(f"\n  ❌ SWAPS FOUND - First 5 examples:")
        for swap in swaps[:5]:
            print(f"    {swap['seed_id']}: {swap['pair']}")
            print(f"      Scores: {swap['scores']}")
    else:
        print(f"  ✅ All seed pairs are [English, Spanish]")

    return {
        'file': file_path.name,
        'total': total,
        'swaps_found': len(swaps),
        'examples': swaps[:10]
    }

def validate_lego_pairs(file_path: Path, detector: LanguageDetector) -> dict:
    """Validate lego_pairs.json - both labeled and unlabeled"""
    print(f"\n{'='*60}")
    print(f"VALIDATING: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    seed_pair_swaps = []
    lego_swaps = []

    if 'seeds' in data:
        for seed in data['seeds']:
            seed_id = seed.get('seed_id', '?')

            # Check unlabeled seed_pair array
            seed_pair = seed.get('seed_pair', [])
            if isinstance(seed_pair, (list, tuple)) and len(seed_pair) == 2:
                is_swapped, score1, score2 = detector.is_swapped(seed_pair)
                if is_swapped:
                    seed_pair_swaps.append({
                        'seed_id': seed_id,
                        'pair': seed_pair,
                        'scores': [score1, score2]
                    })

            # Check labeled lego fields
            for lego in seed.get('legos', []):
                lego_id = lego.get('id', '?')
                known = lego.get('known', '')
                target = lego.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                # If known has higher Spanish score, it's swapped
                if known_score > target_score + 10:
                    lego_swaps.append({
                        'lego_id': lego_id,
                        'seed_id': seed_id,
                        'known': known,
                        'target': target,
                        'scores': [known_score, target_score]
                    })

    total_seeds = len(data.get('seeds', []))
    total_legos = sum(len(s.get('legos', [])) for s in data.get('seeds', []))

    print(f"  Total seeds: {total_seeds}")
    print(f"  Total legos: {total_legos}")
    print(f"  Swapped seed_pair arrays: {len(seed_pair_swaps)}")
    print(f"  Swapped lego fields: {len(lego_swaps)}")

    if seed_pair_swaps:
        print(f"\n  ❌ SEED_PAIR SWAPS - First 5 examples:")
        for swap in seed_pair_swaps[:5]:
            print(f"    {swap['seed_id']}: {swap['pair']}")
            print(f"      Scores: {swap['scores']}")
    else:
        print(f"  ✅ All seed_pair arrays are [English, Spanish]")

    if lego_swaps:
        print(f"\n  ❌ LEGO FIELD SWAPS - First 5 examples:")
        for swap in lego_swaps[:5]:
            print(f"    {swap['lego_id']} ({swap['seed_id']})")
            print(f"      known: '{swap['known']}'")
            print(f"      target: '{swap['target']}'")
            print(f"      Scores: {swap['scores']}")
    else:
        print(f"  ✅ All lego fields correctly labeled")

    return {
        'file': file_path.name,
        'total_seeds': total_seeds,
        'total_legos': total_legos,
        'seed_pair_swaps': len(seed_pair_swaps),
        'lego_field_swaps': len(lego_swaps),
        'seed_pair_examples': seed_pair_swaps[:10],
        'lego_examples': lego_swaps[:10]
    }

def validate_baskets(file_path: Path, detector: LanguageDetector) -> dict:
    """Validate lego_baskets.json - metadata and practice phrases"""
    print(f"\n{'='*60}")
    print(f"VALIDATING: {file_path.name}")
    print(f"{'='*60}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    metadata_swaps = []
    phrase_swaps = []

    if 'baskets' in data:
        for basket_id, basket in data['baskets'].items():
            # Check metadata seed_context
            if '_metadata' in basket and 'seed_context' in basket['_metadata']:
                sc = basket['_metadata']['seed_context']
                known = sc.get('known', '')
                target = sc.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                if known_score > target_score + 10:
                    metadata_swaps.append({
                        'basket_id': basket_id,
                        'known': known,
                        'target': target,
                        'scores': [known_score, target_score]
                    })

            # Check practice_phrases
            practice_phrases = basket.get('practice_phrases', [])
            if isinstance(practice_phrases, list):
                for i, phrase in enumerate(practice_phrases):
                    if isinstance(phrase, (list, tuple)) and len(phrase) >= 2:
                        pair = [phrase[0], phrase[1]]
                        is_swapped, score1, score2 = detector.is_swapped(pair)
                        if is_swapped:
                            phrase_swaps.append({
                                'basket_id': basket_id,
                                'phrase_index': i,
                                'pair': pair,
                                'scores': [score1, score2]
                            })

    total_baskets = len(data.get('baskets', {}))
    total_phrases = sum(
        len(b.get('practice_phrases', []))
        for b in data.get('baskets', {}).values()
    )

    print(f"  Total baskets: {total_baskets}")
    print(f"  Total practice phrases: {total_phrases}")
    print(f"  Metadata swaps: {len(metadata_swaps)}")
    print(f"  Practice phrase swaps: {len(phrase_swaps)}")

    if metadata_swaps:
        print(f"\n  ❌ METADATA SWAPS - First 5 examples:")
        for swap in metadata_swaps[:5]:
            print(f"    {swap['basket_id']}")
            print(f"      known: '{swap['known']}'")
            print(f"      target: '{swap['target']}'")
    else:
        print(f"  ✅ All basket metadata correctly labeled")

    if phrase_swaps:
        print(f"\n  ❌ PHRASE SWAPS - First 5 examples:")
        for swap in phrase_swaps[:5]:
            print(f"    {swap['basket_id']}[{swap['phrase_index']}]: {swap['pair']}")
    else:
        print(f"  ✅ All practice phrases are [English, Spanish]")

    return {
        'file': file_path.name,
        'total_baskets': total_baskets,
        'total_phrases': total_phrases,
        'metadata_swaps': len(metadata_swaps),
        'phrase_swaps': len(phrase_swaps),
        'metadata_examples': metadata_swaps[:10],
        'phrase_examples': phrase_swaps[:10]
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_protocol.py <course_directory>")
        print("\nExample:")
        print("  python3 validate_protocol.py public/vfs/courses/spa_for_eng")
        sys.exit(1)

    course_dir = Path(sys.argv[1])

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"PROTOCOL VALIDATION: {course_dir.name}")
    print(f"{'='*60}")
    print(f"\nExpected convention: [known, target] = [English, Spanish]")
    print(f"Files use BOTH labeled fields and unlabeled arrays")
    print(f"This validates BOTH are consistent")

    detector = LanguageDetector()
    results = []

    # Validate each file
    files = [
        ('seed_pairs.json', validate_seed_pairs),
        ('lego_pairs.json', validate_lego_pairs),
        ('lego_baskets.json', validate_baskets),
        ('lego_baskets_deduplicated.json', validate_baskets),
    ]

    for filename, validator_func in files:
        file_path = course_dir / filename
        if file_path.exists():
            result = validator_func(file_path, detector)
            results.append(result)
        else:
            print(f"\n⚠️  {filename} not found")

    # Overall summary
    print(f"\n{'='*60}")
    print(f"OVERALL PROTOCOL SUMMARY")
    print(f"{'='*60}")

    total_issues = 0

    for result in results:
        file = result['file']

        if 'swaps_found' in result:
            # seed_pairs
            if result['swaps_found'] > 0:
                print(f"❌ {file}: {result['swaps_found']} swaps")
                total_issues += result['swaps_found']
            else:
                print(f"✅ {file}: OK")

        elif 'seed_pair_swaps' in result:
            # lego_pairs
            issues = result['seed_pair_swaps'] + result['lego_field_swaps']
            if issues > 0:
                print(f"❌ {file}: {result['seed_pair_swaps']} seed_pair swaps, {result['lego_field_swaps']} lego field swaps")
                total_issues += issues
            else:
                print(f"✅ {file}: OK")

        elif 'metadata_swaps' in result:
            # baskets
            issues = result['metadata_swaps'] + result['phrase_swaps']
            if issues > 0:
                print(f"❌ {file}: {result['metadata_swaps']} metadata swaps, {result['phrase_swaps']} phrase swaps")
                total_issues += issues
            else:
                print(f"✅ {file}: OK")

    print(f"\n{'='*60}")
    if total_issues == 0:
        print(f"✅ PROTOCOL IS CONSISTENT!")
        print(f"   All files follow [English, Spanish] convention")
        print(f"   Safe to proceed with course generation")
        sys.exit(0)
    else:
        print(f"❌ PROTOCOL HAS {total_issues} INCONSISTENCIES!")
        print(f"   Mixed conventions detected - some files are backwards")
        print(f"   This will cause swaps to propagate through phases")
        print(f"\n💡 RECOMMENDATION:")
        print(f"   1. Check scaffolds - they may have swapped fields")
        print(f"   2. Run fix_all_swaps.py to correct existing data")
        print(f"   3. Fix scaffold templates before generating new data")
        sys.exit(1)

if __name__ == '__main__':
    main()
