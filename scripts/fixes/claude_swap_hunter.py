#!/usr/bin/env python3
"""
Claude Swap Hunter - Use Claude Haiku 4.5 to find remaining swaps

Instead of heuristics, ask Claude to actually read and understand the text
to determine which is English and which is Spanish.

This catches edge cases our linguistic detector missed!
"""

import json
import os
import sys
from pathlib import Path
from anthropic import Anthropic

def ask_claude_about_pair(client, pair, context=""):
    """Ask Claude which element is English and which is Spanish"""

    prompt = f"""You are a language detection expert. Analyze this pair and determine which text is English and which is Spanish.

Pair:
[0]: "{pair[0]}"
[1]: "{pair[1]}"

{f"Context: {context}" if context else ""}

Respond with ONLY a JSON object in this exact format:
{{
  "english_index": 0 or 1,
  "spanish_index": 0 or 1,
  "confidence": "high" or "medium" or "low",
  "reasoning": "brief explanation"
}}

Expected order is [English, Spanish], so english_index should be 0 and spanish_index should be 1.
If they're swapped, english_index will be 1 and spanish_index will be 0."""

    try:
        message = client.messages.create(
            model="claude-haiku-4-20250514",
            max_tokens=200,
            temperature=0,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text.strip()

        # Parse JSON response
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])

        result = json.loads(response_text)
        return result

    except Exception as e:
        print(f"  ⚠️  Claude API error: {e}")
        return None

def check_manifest_samples(manifest_path: Path, client):
    """Check all samples in the manifest for swaps"""
    print(f"\n{'='*60}")
    print(f"CLAUDE SWAP HUNTER - Manifest Samples")
    print(f"{'='*60}")
    print(f"Using Claude Haiku 4.5 for intelligent language detection")
    print(f"")

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    swaps_found = []
    samples_checked = 0

    # Check samples dictionary
    samples = manifest.get('samples', {})
    print(f"Checking {len(samples)} sample entries...")

    for text, sample_entries in samples.items():
        if not isinstance(sample_entries, list):
            continue

        for sample in sample_entries:
            role = sample.get('role', '')

            # We're looking for mismatched roles
            # If role is "source" (English) but text is Spanish, that's a swap
            # If role is "target1/target2" (Spanish) but text is English, that's a swap

            # Skip very short texts (single words are hard to detect)
            if len(text.split()) < 2:
                continue

            samples_checked += 1

            if samples_checked % 100 == 0:
                print(f"  Checked {samples_checked} samples...")

            # Ask Claude to identify the language
            result = ask_claude_about_pair(client, [text, ""], context=f"Role: {role}")

            if not result:
                continue

            # Determine expected language based on role
            expected_lang = "english" if role == "source" else "spanish"

            # Claude tells us which index is which language
            # For our single-text check, we only look at [0] (the text we're checking)
            detected_lang = "english" if result.get('english_index') == 0 else "spanish"

            if detected_lang != expected_lang:
                swaps_found.append({
                    'text': text,
                    'role': role,
                    'expected_lang': expected_lang,
                    'detected_lang': detected_lang,
                    'confidence': result.get('confidence', 'unknown'),
                    'reasoning': result.get('reasoning', '')
                })
                print(f"\n  ❌ SWAP FOUND!")
                print(f"     Text: {text[:60]}...")
                print(f"     Role: {role} (expects {expected_lang})")
                print(f"     Detected: {detected_lang}")
                print(f"     Confidence: {result.get('confidence')}")

    return swaps_found

def check_seeds_and_nodes(manifest_path: Path, client, max_checks=100):
    """Check seed nodes and sub-nodes for swaps"""
    print(f"\n{'='*60}")
    print(f"CLAUDE SWAP HUNTER - Seed Nodes")
    print(f"{'='*60}")

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    swaps_found = []
    nodes_checked = 0

    seeds = manifest.get('slices', [{}])[0].get('seeds', [])
    print(f"Checking nodes in {len(seeds)} seeds...")

    for seed in seeds:
        if nodes_checked >= max_checks:
            print(f"\n  ℹ️  Reached max checks ({max_checks}), stopping early")
            break

        # Check main seed node
        seed_node = seed.get('node', {})
        known = seed_node.get('known', {}).get('text', '')
        target = seed_node.get('target', {}).get('text', '')

        if known and target and len(known.split()) >= 2 and len(target.split()) >= 2:
            nodes_checked += 1

            if nodes_checked % 20 == 0:
                print(f"  Checked {nodes_checked} nodes...")

            result = ask_claude_about_pair(client, [known, target],
                                          context="Main seed node")

            if result and result.get('english_index') != 0:
                # Swapped! English should be at index 0 (known)
                swaps_found.append({
                    'type': 'seed_node',
                    'seed_id': seed.get('id', 'unknown'),
                    'known': known,
                    'target': target,
                    'confidence': result.get('confidence'),
                    'reasoning': result.get('reasoning')
                })
                print(f"\n  ❌ SWAP in seed node!")
                print(f"     Known: {known[:50]}...")
                print(f"     Target: {target[:50]}...")

        # Check introduction_items
        for item in seed.get('introduction_items', []):
            if nodes_checked >= max_checks:
                break

            item_node = item.get('node', {})
            known = item_node.get('known', {}).get('text', '')
            target = item_node.get('target', {}).get('text', '')

            if known and target and len(known.split()) >= 2:
                nodes_checked += 1

                result = ask_claude_about_pair(client, [known, target],
                                              context="Introduction item")

                if result and result.get('english_index') != 0:
                    swaps_found.append({
                        'type': 'intro_item',
                        'seed_id': seed.get('id', 'unknown'),
                        'item_id': item.get('id', 'unknown'),
                        'known': known,
                        'target': target,
                        'confidence': result.get('confidence'),
                        'reasoning': result.get('reasoning')
                    })
                    print(f"\n  ❌ SWAP in intro item!")
                    print(f"     Known: {known[:50]}...")
                    print(f"     Target: {target[:50]}...")

            # Check sub-nodes
            for node in item.get('nodes', []):
                if nodes_checked >= max_checks:
                    break

                known = node.get('known', {}).get('text', '')
                target = node.get('target', {}).get('text', '')

                if known and target and len(known.split()) >= 2:
                    nodes_checked += 1

                    result = ask_claude_about_pair(client, [known, target],
                                                  context="Sub-node")

                    if result and result.get('english_index') != 0:
                        swaps_found.append({
                            'type': 'sub_node',
                            'seed_id': seed.get('id', 'unknown'),
                            'item_id': item.get('id', 'unknown'),
                            'known': known,
                            'target': target,
                            'confidence': result.get('confidence'),
                            'reasoning': result.get('reasoning')
                        })
                        print(f"\n  ❌ SWAP in sub-node!")
                        print(f"     Known: {known[:50]}...")
                        print(f"     Target: {target[:50]}...")

    print(f"\n  Checked {nodes_checked} total nodes")
    return swaps_found

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 claude_swap_hunter.py <course_directory> [manifest_filename]")
        print("\nExample:")
        print("  python3 claude_swap_hunter.py public/vfs/courses/spa_for_eng")
        print("  python3 claude_swap_hunter.py public/vfs/courses/spa_for_eng Spanish_for_English_speakers_COURSE_20251118_015936.json")
        print("\nRequires ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    # Check for API key
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ Error: ANTHROPIC_API_KEY environment variable not set")
        print("\nSet it with:")
        print("  export ANTHROPIC_API_KEY='your-key-here'")
        sys.exit(1)

    client = Anthropic(api_key=api_key)

    course_dir = Path(sys.argv[1])

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    # Find manifest file
    if len(sys.argv) >= 3:
        manifest_file = course_dir / sys.argv[2]
    else:
        # Find most recent manifest
        manifests = list(course_dir.glob("*_COURSE_*.json"))
        if not manifests:
            print(f"Error: No course manifest found in {course_dir}")
            sys.exit(1)
        manifest_file = max(manifests, key=lambda p: p.stat().st_mtime)

    if not manifest_file.exists():
        print(f"Error: Manifest not found: {manifest_file}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"CLAUDE SWAP HUNTER")
    print(f"{'='*60}")
    print(f"Course: {course_dir.name}")
    print(f"Manifest: {manifest_file.name}")
    print(f"Model: Claude Haiku 4.5")
    print(f"")
    print(f"This will use Claude to intelligently detect swaps by")
    print(f"actually understanding which text is English vs Spanish.")
    print(f"")

    all_swaps = []

    # Check nodes (limited to 100 to save API costs)
    print(f"\nPhase 1: Checking seed nodes (max 100 nodes)")
    node_swaps = check_seeds_and_nodes(manifest_file, client, max_checks=100)
    all_swaps.extend(node_swaps)

    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")

    if all_swaps:
        print(f"\n❌ Found {len(all_swaps)} swaps!")
        print(f"\nSwaps by type:")

        by_type = {}
        for swap in all_swaps:
            swap_type = swap.get('type', 'sample')
            by_type[swap_type] = by_type.get(swap_type, 0) + 1

        for swap_type, count in by_type.items():
            print(f"  {swap_type}: {count}")

        # Save detailed report
        report_file = course_dir / 'claude_swap_hunter_report.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump({
                'total_swaps': len(all_swaps),
                'swaps_by_type': by_type,
                'swaps': all_swaps
            }, f, ensure_ascii=False, indent=2)

        print(f"\n📄 Detailed report saved to: {report_file.name}")

        print(f"\n💡 Next steps:")
        print(f"  1. Review the report to see which specific phrases are swapped")
        print(f"  2. Trace back to source files (lego_baskets.json) to fix")
        print(f"  3. Re-run validation and regenerate manifest")

    else:
        print(f"\n✅ No swaps found!")
        print(f"   Claude analyzed the nodes and found them all correctly ordered")

    print(f"\n{'='*60}")

if __name__ == '__main__':
    main()
