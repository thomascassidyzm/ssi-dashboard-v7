#!/usr/bin/env python3
"""
Comprehensive Phase 3 LEGO quality scanner.

Checks for:
1. Pragmatic FD violations (standalone pronouns, articles, particles)
2. GATE violations (Spanish words not in vocabulary whitelist)
3. Missing components on M-types
4. A-before-M ordering violations

Outputs list of seed IDs that need re-extraction.
"""

import json
import glob
import sys

# Pragmatic FD violation patterns
PRONOUNS = {
    'él', 'ella', 'yo', 'tú', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas',
    'he', 'she', 'i', 'you', 'we', 'they', 'it', 'lo', 'la', 'te', 'me', 'le', 'les', 'nos'
}

ARTICLES = {
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'the', 'a', 'an'
}

PARTICLES = {
    'de', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre',
    'of', 'to', 'in', 'with', 'for', 'without', 'on', 'about'
}

ALL_PRAGMATIC_FD = PRONOUNS | ARTICLES | PARTICLES


def load_whitelist():
    """Load Spanish vocabulary whitelist from course."""
    try:
        with open('public/vfs/courses/spa_for_eng/vocabulary_3category.json', 'r') as f:
            vocab = json.load(f)
            # Extract all Spanish words
            whitelist = set()
            for category in ['atomic_legos', 'molecular_legos', 'molecular_components']:
                for word in vocab.get(category, []):
                    whitelist.add(word.lower())
            return whitelist
    except FileNotFoundError:
        print("⚠️  Warning: vocabulary_3category.json not found - skipping GATE check")
        return None


def check_pragmatic_fd(seed):
    """Check for Pragmatic FD violations."""
    violations = []
    if not seed.get('legos'):
        return violations

    first_lego = seed['legos'][0]
    if first_lego.get('type') == 'A':
        target = first_lego.get('target', '').lower().strip()
        known = first_lego.get('known', '').lower().strip()

        if target in ALL_PRAGMATIC_FD or known in ALL_PRAGMATIC_FD:
            violation_type = None
            if target in PRONOUNS or known in PRONOUNS:
                violation_type = 'pronoun'
            elif target in ARTICLES or known in ARTICLES:
                violation_type = 'article'
            elif target in PARTICLES or known in PARTICLES:
                violation_type = 'particle'

            violations.append({
                'type': 'pragmatic_fd',
                'subtype': violation_type,
                'lego': f"{first_lego.get('target')} = {first_lego.get('known')}"
            })

    return violations


def check_gate_compliance(seed, whitelist):
    """Check if all Spanish words are in vocabulary whitelist."""
    if whitelist is None:
        return []

    violations = []
    for lego in seed.get('legos', []):
        target = lego.get('target', '').lower().strip()
        # Split multi-word targets
        words = target.split()
        for word in words:
            if word and word not in whitelist:
                violations.append({
                    'type': 'gate',
                    'word': word,
                    'lego': f"{lego.get('target')} = {lego.get('known')}"
                })

    return violations


def check_components(seed):
    """Check if all M-types have components."""
    violations = []
    for lego in seed.get('legos', []):
        if lego.get('type') == 'M' and not lego.get('components'):
            violations.append({
                'type': 'missing_components',
                'lego': f"{lego.get('target')} = {lego.get('known')}"
            })
    return violations


def check_a_before_m(seed):
    """Check A-before-M ordering."""
    types = [l.get('type') for l in seed.get('legos', [])]
    type_string = ''.join(types)

    # Check for M before A pattern
    if 'MA' in type_string or 'MAA' in type_string:
        return [{
            'type': 'a_before_m',
            'pattern': type_string
        }]
    return []


def main():
    print("🔍 Comprehensive Phase 3 Quality Scan")
    print("=" * 80)
    print()

    # Load whitelist
    print("Loading GATE vocabulary whitelist...")
    whitelist = load_whitelist()
    if whitelist:
        print(f"✅ Loaded {len(whitelist)} Spanish words")
    print()

    # Find all agent output files
    segment_files = glob.glob('public/vfs/courses/*/segments/segment_*/agent_*_output.json')
    print(f"Found {len(segment_files)} agent output files")
    print()

    all_violations = {}  # seed_id -> list of violations

    for file_path in sorted(segment_files):
        with open(file_path, 'r') as f:
            data = json.load(f)

        for seed in data.get('seeds', []):
            seed_id = seed.get('seed_id')
            violations = []

            # Check all violation types
            violations.extend(check_pragmatic_fd(seed))
            violations.extend(check_gate_compliance(seed, whitelist))
            violations.extend(check_components(seed))
            violations.extend(check_a_before_m(seed))

            if violations:
                all_violations[seed_id] = {
                    'seed_pair': seed.get('seed_pair', []),
                    'violations': violations
                }

    print("=" * 80)
    print(f"✅ Scan complete: Found {len(all_violations)} seeds with violations")
    print("=" * 80)
    print()

    if all_violations:
        # Group by violation type
        by_type = {}
        for seed_id, data in all_violations.items():
            for v in data['violations']:
                vtype = v['type']
                if vtype not in by_type:
                    by_type[vtype] = []
                by_type[vtype].append(seed_id)

        # Print summary
        print("📊 Violations by type:")
        for vtype, seeds in sorted(by_type.items()):
            print(f"  {vtype}: {len(set(seeds))} seeds")
        print()

        # Save detailed violations
        with open('quality_violations.json', 'w') as f:
            json.dump(all_violations, f, indent=2)
        print(f"💾 Saved detailed violations to: quality_violations.json")
        print()

        # Save seed ID list for re-extraction
        seed_ids = sorted(all_violations.keys())
        with open('seeds_to_reextract.txt', 'w') as f:
            f.write('\n'.join(seed_ids))
        print(f"📋 Saved seed ID list to: seeds_to_reextract.txt")
        print(f"   {len(seed_ids)} seeds need re-extraction")
        print()

        # Print first 10 examples
        print("📋 Example violations (first 10):")
        print()
        for i, (seed_id, data) in enumerate(list(all_violations.items())[:10]):
            print(f"  ❌ {seed_id}")
            print(f"     Sentence: {data['seed_pair'][1] if len(data['seed_pair']) > 1 else 'N/A'}")
            for v in data['violations']:
                print(f"     - {v['type']}: {v.get('lego') or v.get('word') or v.get('pattern')}")
            print()

    else:
        print("🎉 No violations found! Quality is excellent.")

    return 0 if not all_violations else 1


if __name__ == '__main__':
    sys.exit(main())
