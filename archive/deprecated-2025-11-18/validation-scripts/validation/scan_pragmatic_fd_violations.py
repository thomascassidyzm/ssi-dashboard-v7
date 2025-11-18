#!/usr/bin/env python3
"""
Scan Phase 3 extraction outputs for Pragmatic FD violations.

Identifies seeds where first LEGO is a standalone:
- Pronoun (él, ella, yo, he, she, I, etc.)
- Article (el, la, un, una, the, a, an)
- Particle (de, a, en, of, to, in, etc.)
"""

import json
import subprocess
import sys

# Define violation patterns
PRONOUNS = {
    'él', 'ella', 'yo', 'tú', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas',
    'he', 'she', 'i', 'you', 'we', 'they', 'it'
}

ARTICLES = {
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'the', 'a', 'an'
}

PARTICLES = {
    'de', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre',
    'of', 'to', 'in', 'with', 'for', 'without', 'on', 'about'
}

ALL_VIOLATIONS = PRONOUNS | ARTICLES | PARTICLES


def get_segment_branches():
    """Get all Phase 3 segment branches from git."""
    result = subprocess.run(
        ['git', 'branch', '-r'],
        capture_output=True,
        text=True
    )
    branches = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if 'phase3-lego-extraction-segment' in line or 'phase3-segment' in line.lower():
            branches.append(line)
    return branches


def get_agent_files_from_branch(branch):
    """Get all agent output JSON files from a branch."""
    result = subprocess.run(
        ['git', 'ls-tree', '-r', branch, '--name-only'],
        capture_output=True,
        text=True
    )
    files = []
    for line in result.stdout.splitlines():
        if '/segments/segment_' in line and 'agent_' in line and line.endswith('.json'):
            files.append(line)
    return files


def get_file_content(branch, file_path):
    """Get file content from a specific branch."""
    result = subprocess.run(
        ['git', 'show', f'{branch}:{file_path}'],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def check_seed_for_violations(seed):
    """Check if a seed has Pragmatic FD violations."""
    violations = []

    if not seed.get('legos'):
        return violations

    # Check first LEGO only (most common violation)
    first_lego = seed['legos'][0]

    if first_lego.get('type') == 'A':
        target = first_lego.get('target', '').lower().strip()
        known = first_lego.get('known', '').lower().strip()

        if target in ALL_VIOLATIONS or known in ALL_VIOLATIONS:
            violation_type = None
            if target in PRONOUNS or known in PRONOUNS:
                violation_type = 'pronoun'
            elif target in ARTICLES or known in ARTICLES:
                violation_type = 'article'
            elif target in PARTICLES or known in PARTICLES:
                violation_type = 'particle'

            violations.append({
                'seed_id': seed['seed_id'],
                'lego_id': first_lego.get('id'),
                'violation_type': violation_type,
                'target': first_lego.get('target'),
                'known': first_lego.get('known'),
                'seed_pair': seed.get('seed_pair', [])
            })

    return violations


def main():
    print("🔍 Scanning Phase 3 extractions for Pragmatic FD violations...")
    print()

    # Get all segment branches
    branches = get_segment_branches()
    print(f"Found {len(branches)} segment branches")
    print()

    all_violations = []

    for branch in branches:
        print(f"📂 Checking {branch}...")

        # Get agent files from this branch
        agent_files = get_agent_files_from_branch(branch)

        for file_path in agent_files:
            # Get file content
            data = get_file_content(branch, file_path)
            if not data or 'seeds' not in data:
                continue

            # Check each seed
            for seed in data['seeds']:
                violations = check_seed_for_violations(seed)
                if violations:
                    all_violations.extend(violations)

    print()
    print("=" * 80)
    print(f"✅ Scan complete: Found {len(all_violations)} violations")
    print("=" * 80)
    print()

    if all_violations:
        # Group by type
        by_type = {}
        for v in all_violations:
            vtype = v['violation_type']
            if vtype not in by_type:
                by_type[vtype] = []
            by_type[vtype].append(v)

        # Print summary
        print("📊 Violations by type:")
        for vtype, items in sorted(by_type.items()):
            print(f"  {vtype}: {len(items)}")
        print()

        # Print details
        print("📋 Detailed violations:")
        print()
        for v in all_violations:
            print(f"  ❌ {v['seed_id']} ({v['violation_type']})")
            print(f"     First LEGO: [{v['target']}] = [{v['known']}]")
            print(f"     Sentence: {v['seed_pair'][1] if len(v['seed_pair']) > 1 else 'N/A'}")
            print()

        # Save to file
        with open('pragmatic_fd_violations.json', 'w') as f:
            json.dump(all_violations, f, indent=2)

        print(f"💾 Saved violations to: pragmatic_fd_violations.json")
        print()
        print(f"🔧 Next step: Re-extract {len(all_violations)} seeds with updated Pragmatic FD prompt")
    else:
        print("🎉 No Pragmatic FD violations found!")

    return 0 if not all_violations else 1


if __name__ == '__main__':
    sys.exit(main())
