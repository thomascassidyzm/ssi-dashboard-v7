#!/usr/bin/env python3
"""
Review Chinese language learning baskets for grammar and naturalness quality.
Seeds: S0101-S0150
"""

import json
import os
from pathlib import Path
from collections import defaultdict

# Base directory
BASE_DIR = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng/phase5_outputs")

# Track issues
issues = {
    'minor': [],
    'moderate': [],
    'major': []
}

# Statistics
stats = {
    'total_phrases': 0,
    'seeds_reviewed': 0,
    'by_complexity': defaultdict(int),
    'seeds_with_issues': set()
}

def categorize_issue(issue_type, complexity):
    """Categorize issue severity based on type and complexity."""
    # Issues in 4-5 LEGO phrases are more serious
    if complexity >= 4:
        if issue_type in ['unnatural_chinese', 'unnatural_english', 'grammar_error']:
            return 'major'
        else:
            return 'moderate'
    elif complexity == 3:
        return 'moderate'
    else:
        return 'minor'

def check_phrase(known, target, complexity, seed_id, lego_id):
    """Check a single practice phrase for issues."""
    phrase_issues = []

    # Check for specific patterns that are problematic

    # 1. Awkward Chinese word order patterns
    if complexity >= 4:
        # Check for "现在...更多" patterns that might be awkward
        if "现在" in target and target.index("现在") > 5:
            # 现在 appearing late in sentence can be awkward
            if "了解更多" in target or "做这个" in target:
                phrase_issues.append({
                    'type': 'unnatural_chinese',
                    'severity': 'moderate',
                    'known': known,
                    'target': target,
                    'complexity': complexity,
                    'seed': seed_id,
                    'lego': lego_id,
                    'issue': 'Awkward word order: 现在 placement sounds unnatural'
                })

        # Check for missing 的 in noun phrases
        if "这个语言" in target and "的" not in target.split("这个语言")[0][-5:]:
            if "关于" in target:
                # Should be 关于这个语言的 not 关于这个语言
                pass  # This one might be OK

        # Check for awkward "试图听" patterns
        if "试图听" in target:
            following = target.split("试图听", 1)[1] if "试图听" in target else ""
            if "你说" in following:
                # "试图听你说" is a bit awkward, better would be "试着听你说" or "想听你说"
                phrase_issues.append({
                    'type': 'unnatural_chinese',
                    'severity': 'moderate',
                    'known': known,
                    'target': target,
                    'complexity': complexity,
                    'seed': seed_id,
                    'lego': lego_id,
                    'issue': '试图听 + person + verb is awkward; better: 想听, 试着听, or 努力听'
                })

        # Check for 如果 without consequence clause
        if "如果" in target and complexity <= 5:
            # Single 如果 clause without consequence is a fragment
            if target.startswith("如果"):
                phrase_issues.append({
                    'type': 'grammar_error',
                    'severity': 'moderate',
                    'known': known,
                    'target': target,
                    'complexity': complexity,
                    'seed': seed_id,
                    'lego': lego_id,
                    'issue': '如果 clause without consequence - incomplete conditional'
                })

    # 2. Awkward English patterns
    if complexity >= 4:
        # "I'd like this language" is wrong - should be "I'd like to learn/speak this language"
        if known == "I'd like this language":
            phrase_issues.append({
                'type': 'unnatural_english',
                'severity': 'major',
                'known': known,
                'target': target,
                'complexity': complexity,
                'seed': seed_id,
                'lego': lego_id,
                'issue': '"I\'d like this language" is ungrammatical - needs verb (learn/speak/study)'
            })

        # "You shouldn't worry if it's not like that" is awkward
        if "shouldn't worry if" in known:
            phrase_issues.append({
                'type': 'unnatural_english',
                'severity': 'moderate',
                'known': known,
                'target': target,
                'complexity': complexity,
                'seed': seed_id,
                'lego': lego_id,
                'issue': '"worry if" is awkward; better: "worry about whether" or "worry that"'
            })

        # "I'm enjoying many more this language" is ungrammatical
        if "many more this language" in known or "many more about" in known:
            phrase_issues.append({
                'type': 'unnatural_english',
                'severity': 'major',
                'known': known,
                'target': target,
                'complexity': complexity,
                'seed': seed_id,
                'lego': lego_id,
                'issue': '"many more" without noun is incomplete or awkward'
            })

    # 3. Grammar errors in longer phrases (4-5 LEGOs)
    if complexity >= 4:
        # Check for missing articles in English
        if " language" in known and "this language" not in known and "a language" not in known:
            # Might need article
            pass

        # Check for Chinese grammar issues
        # "我想这个语言" is wrong - should be "我喜欢" or "我想学"
        if target == "我想这个语言":
            phrase_issues.append({
                'type': 'unnatural_chinese',
                'severity': 'major',
                'known': known,
                'target': target,
                'complexity': complexity,
                'seed': seed_id,
                'lego': lego_id,
                'issue': '我想这个语言 is wrong - 想 needs a verb phrase or clause, not just noun'
            })

        # "如果你想它不是那样的" - 想 should be 认为
        if "你想它" in target or "你想这" in target:
            phrase_issues.append({
                'type': 'unnatural_chinese',
                'severity': 'major',
                'known': known,
                'target': target,
                'complexity': complexity,
                'seed': seed_id,
                'lego': lego_id,
                'issue': '想 (want) should be 认为/觉得 (think) when followed by clause'
            })

        # Word order: "试图说它不是那样的" is OK but can check others
        # "准备好了只要你想就..." pattern check
        if "准备好了只要" in target:
            # This is a compressed conditional, check if it makes sense
            pass

        # "我需要多一点时间为了更多的" - awkward use of 为了
        if "为了更多的" in target and target.endswith("为了更多的"):
            phrase_issues.append({
                'type': 'unnatural_chinese',
                'severity': 'moderate',
                'known': known,
                'target': target,
                'complexity': complexity,
                'seed': seed_id,
                'lego': lego_id,
                'issue': '为了更多的 at end is incomplete - needs noun after 的'
            })

    return phrase_issues

def review_basket_file(filepath):
    """Review a single basket file."""
    seed_id = filepath.stem.replace('_baskets', '')

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    seed_issues = []

    for lego_id, lego_data in data.items():
        practice_phrases = lego_data.get('practice_phrases', [])

        for phrase in practice_phrases:
            if len(phrase) >= 4:
                known, target, metadata, complexity = phrase[0], phrase[1], phrase[2], phrase[3]
                stats['total_phrases'] += 1
                stats['by_complexity'][complexity] += 1

                # Check the phrase
                phrase_issues = check_phrase(known, target, complexity, seed_id, lego_id)

                if phrase_issues:
                    stats['seeds_with_issues'].add(seed_id)
                    seed_issues.extend(phrase_issues)

                    for issue in phrase_issues:
                        severity = issue['severity']
                        if severity == 'major':
                            issues['major'].append(issue)
                        elif severity == 'moderate':
                            issues['moderate'].append(issue)
                        else:
                            issues['minor'].append(issue)

    stats['seeds_reviewed'] += 1
    return seed_issues

def main():
    """Main review function."""
    print("=" * 80)
    print("Chinese Language Learning Baskets Review: Seeds S0101-S0150")
    print("=" * 80)
    print()

    # Find all basket files in range
    basket_files = []
    for i in range(101, 151):
        filepath = BASE_DIR / f"seed_S{i:04d}_baskets.json"
        if filepath.exists():
            basket_files.append(filepath)

    print(f"Found {len(basket_files)} basket files to review")
    print()

    # Review each file
    for filepath in sorted(basket_files):
        print(f"Reviewing {filepath.name}...", end='\r')
        review_basket_file(filepath)

    print("\n" + "=" * 80)
    print("REVIEW COMPLETE")
    print("=" * 80)
    print()

    # Statistics
    print("STATISTICS")
    print("-" * 80)
    print(f"Total seeds reviewed: {stats['seeds_reviewed']}")
    print(f"Total practice phrases: {stats['total_phrases']}")
    print(f"Seeds with issues: {len(stats['seeds_with_issues'])}")
    print()
    print("Phrases by complexity:")
    for complexity in sorted(stats['by_complexity'].keys()):
        count = stats['by_complexity'][complexity]
        print(f"  Complexity {complexity}: {count} phrases")
    print()

    # Issues summary
    total_issues = len(issues['minor']) + len(issues['moderate']) + len(issues['major'])
    print("ISSUES SUMMARY")
    print("-" * 80)
    print(f"Total issues found: {total_issues}")
    print(f"  Minor: {len(issues['minor'])}")
    print(f"  Moderate: {len(issues['moderate'])}")
    print(f"  Major: {len(issues['major'])}")
    print()

    # Overall quality
    if total_issues == 0:
        quality = "excellent"
    elif total_issues < 10:
        quality = "good"
    elif total_issues < 30:
        quality = "needs_work"
    else:
        quality = "needs_significant_work"

    print(f"Overall quality assessment: {quality.upper()}")
    print()

    # Top issues
    if total_issues > 0:
        print("=" * 80)
        print("TOP ISSUES FOUND")
        print("=" * 80)
        print()

        # Show major issues first
        if issues['major']:
            print("MAJOR ISSUES:")
            print("-" * 80)
            for i, issue in enumerate(issues['major'][:10], 1):
                print(f"{i}. [{issue['seed']}:{issue['lego']}] Complexity {issue['complexity']}")
                print(f"   English: {issue['known']}")
                print(f"   Chinese: {issue['target']}")
                print(f"   Problem: {issue['issue']}")
                print()

        # Then moderate
        if issues['moderate']:
            print("MODERATE ISSUES:")
            print("-" * 80)
            shown = min(10 - len(issues['major']), len(issues['moderate']))
            for i, issue in enumerate(issues['moderate'][:shown], 1):
                print(f"{i}. [{issue['seed']}:{issue['lego']}] Complexity {issue['complexity']}")
                print(f"   English: {issue['known']}")
                print(f"   Chinese: {issue['target']}")
                print(f"   Problem: {issue['issue']}")
                print()

        # Seeds with most issues
        print("=" * 80)
        print("SEEDS WITH MOST ISSUES")
        print("=" * 80)
        print()

        seed_issue_count = defaultdict(int)
        for severity in ['major', 'moderate', 'minor']:
            for issue in issues[severity]:
                seed_issue_count[issue['seed']] += 1

        sorted_seeds = sorted(seed_issue_count.items(), key=lambda x: x[1], reverse=True)
        for seed, count in sorted_seeds[:10]:
            print(f"  {seed}: {count} issues")
        print()

    # Write detailed report to file
    report_path = "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/basket_review_s0101_s0150_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump({
            'stats': {
                'seeds_reviewed': stats['seeds_reviewed'],
                'total_phrases': stats['total_phrases'],
                'seeds_with_issues': list(stats['seeds_with_issues']),
                'by_complexity': dict(stats['by_complexity'])
            },
            'issues': issues,
            'quality_assessment': quality
        }, f, ensure_ascii=False, indent=2)

    print(f"Detailed report written to: {report_path}")

if __name__ == '__main__':
    main()
