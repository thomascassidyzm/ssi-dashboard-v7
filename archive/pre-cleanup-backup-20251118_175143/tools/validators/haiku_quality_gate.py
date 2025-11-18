#!/usr/bin/env python3
"""
Haiku Quality Gate - Final validation before manifest generation

Uses Claude Haiku 4.5 to perform intelligent validation of lego_baskets.json:
- Grammar errors in English
- Grammar errors in Spanish
- Swapped [Spanish, English] pairs
- Malformed text
- Nonsense phrases
- Any other quality issues

This runs BEFORE Phase 7 manifest generation to catch issues early.

Usage:
  python3 haiku_quality_gate.py <course_directory> [--fix] [--sample-size N]

Examples:
  # Audit only (report issues)
  python3 haiku_quality_gate.py public/vfs/courses/spa_for_eng

  # Audit + fix automatically
  python3 haiku_quality_gate.py public/vfs/courses/spa_for_eng --fix

  # Sample first 100 seeds only (faster, cheaper)
  python3 haiku_quality_gate.py public/vfs/courses/spa_for_eng --sample-size 100
"""

import json
import os
import sys
from pathlib import Path
from anthropic import Anthropic

def create_validation_prompt(baskets_sample: dict, target_lang: str, source_lang: str) -> str:
    """Create validation prompt for Haiku"""

    basket_count = len(baskets_sample)

    return f"""You are a quality validator for language learning course data.

TASK: Validate {basket_count} practice phrase baskets for grammar, swaps, and quality issues.

EXPECTED FORMAT:
- Each basket has practice_phrases: arrays of [English, Spanish] pairs
- English should be grammatically correct
- Spanish should be grammatically correct
- Order MUST be [English, Spanish] (NOT [Spanish, English])

DATA TO VALIDATE:
{json.dumps(baskets_sample, ensure_ascii=False, indent=2)}

CHECK FOR:
1. ❌ Grammar errors in English (e.g., "I to can", "would to have", "to to")
2. ❌ Grammar errors in Spanish
3. ❌ Swapped pairs [Spanish, English] instead of [English, Spanish]
4. ❌ Malformed text, nonsense, or placeholder text
5. ❌ Empty or null values
6. ❌ Any other quality issues

RESPOND WITH JSON:
{{
  "total_baskets_checked": {basket_count},
  "total_phrases_checked": <count>,
  "issues_found": [
    {{
      "basket_id": "S0001L01",
      "phrase_index": 0,
      "issue_type": "grammar_error" | "swap" | "malformed" | "other",
      "current_value": ["broken text", "texto roto"],
      "suggested_fix": ["fixed text", "texto corregido"],
      "severity": "high" | "medium" | "low",
      "explanation": "brief explanation"
    }}
  ],
  "summary": {{
    "grammar_errors": <count>,
    "swaps": <count>,
    "malformed": <count>,
    "total_issues": <count>
  }}
}}

Be thorough and flag EVERY issue you find!"""

def validate_with_haiku(client, baskets_sample: dict, target_lang: str = "spanish",
                       source_lang: str = "english") -> dict:
    """Send baskets to Haiku for validation"""

    prompt = create_validation_prompt(baskets_sample, target_lang, source_lang)

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            temperature=0,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join([l for l in lines if not l.startswith('```')])

        result = json.loads(response_text)
        return result

    except Exception as e:
        print(f"❌ Error calling Haiku: {e}")
        return None

def sample_baskets(baskets: dict, sample_size: int = None) -> dict:
    """Sample baskets for validation (all or subset)"""
    if sample_size is None:
        return baskets

    basket_ids = sorted(baskets.keys())[:sample_size]
    return {bid: baskets[bid] for bid in basket_ids}

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Haiku Quality Gate for lego_baskets.json')
    parser.add_argument('course_dir', help='Course directory path')
    parser.add_argument('--fix', action='store_true',
                       help='Automatically fix issues (not just report)')
    parser.add_argument('--sample-size', type=int,
                       help='Validate only first N baskets (default: all)')

    args = parser.parse_args()

    course_dir = Path(args.course_dir)

    if not course_dir.exists():
        print(f"❌ Error: Directory not found: {course_dir}")
        sys.exit(1)

    # Check for API key
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ Error: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    client = Anthropic(api_key=api_key)

    # Load baskets
    baskets_file = course_dir / 'lego_baskets_deduplicated.json'
    if not baskets_file.exists():
        print(f"❌ Error: {baskets_file} not found")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"HAIKU QUALITY GATE - Phase 5 Validation")
    print(f"{'='*60}")
    print(f"Course: {course_dir.name}")
    print(f"Model: Claude Haiku 4.5")
    print(f"Mode: {'FIX' if args.fix else 'AUDIT'}")

    with open(baskets_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    baskets = data.get('baskets', {})

    # Sample if requested
    if args.sample_size:
        print(f"Sample: First {args.sample_size} baskets")
        baskets_to_check = sample_baskets(baskets, args.sample_size)
    else:
        print(f"Sample: ALL {len(baskets)} baskets")
        baskets_to_check = baskets

    print(f"\nValidating {len(baskets_to_check)} baskets...")

    # Validate with Haiku
    result = validate_with_haiku(client, baskets_to_check)

    if not result:
        print("\n❌ Validation failed")
        sys.exit(1)

    # Report results
    print(f"\n{'='*60}")
    print(f"VALIDATION RESULTS")
    print(f"{'='*60}")

    summary = result.get('summary', {})
    print(f"Baskets checked: {result.get('total_baskets_checked', 0)}")
    print(f"Phrases checked: {result.get('total_phrases_checked', 0)}")
    print(f"")
    print(f"Issues found:")
    print(f"  Grammar errors: {summary.get('grammar_errors', 0)}")
    print(f"  Swaps: {summary.get('swaps', 0)}")
    print(f"  Malformed: {summary.get('malformed', 0)}")
    print(f"  Total: {summary.get('total_issues', 0)}")

    issues = result.get('issues_found', [])

    if issues:
        print(f"\n⚠️  QUALITY GATE: FAILED")
        print(f"\nFirst 10 issues:")
        for issue in issues[:10]:
            print(f"\n  {issue['basket_id']} [{issue['issue_type']}]")
            print(f"    Current: {issue['current_value']}")
            print(f"    Suggested: {issue['suggested_fix']}")
            print(f"    Reason: {issue['explanation']}")

        # Save full report
        report_file = course_dir / 'haiku_quality_gate_report.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n📄 Full report saved: {report_file.name}")

        if args.fix:
            print(f"\n🔧 FIX mode enabled - but auto-fix not implemented yet")
            print(f"   Use the report to manually fix or run a separate Haiku fix script")

        print(f"\n❌ Quality gate FAILED - fix issues before generating manifest")
        sys.exit(1)
    else:
        print(f"\n✅ QUALITY GATE: PASSED")
        print(f"   All baskets validated successfully")
        print(f"   Safe to proceed to Phase 7 manifest generation")
        sys.exit(0)

if __name__ == '__main__':
    main()
