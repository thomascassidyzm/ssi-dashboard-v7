#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator for Seeds S0611-S0620
Mandarin Chinese for English Speakers (cmn_for_eng)

Generates practice phrases using linguistic intelligence with extended thinking.
Uses Claude Sonnet 4 with extended thinking for high-quality phrase generation.

Usage:
    python3 phase5_s0611_s0620_processor.py
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import time
from anthropic import Anthropic

# Initialize Anthropic client
client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# Configuration
COURSE_DIR = Path('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng')
SCAFFOLDS_DIR = COURSE_DIR / 'phase5_scaffolds'
OUTPUT_DIR = COURSE_DIR / 'phase5_outputs'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Model configuration for extended thinking
MODEL = 'claude-sonnet-4-20250514'
THINKING_BUDGET = 8000  # tokens for extended thinking

# Seeds to process: S0611-S0620 (but S0620 doesn't exist, so S0611-S0619)
SEED_RANGE = range(611, 620)  # S0611 to S0619


def build_vocabulary_context(scaffold: Dict) -> Tuple[set, str]:
    """
    Build vocabulary set from recent context and current seed's earlier LEGOs.
    Returns both a set of words and a formatted vocabulary list string.
    """
    vocab = set()
    vocab_list_lines = []

    # Add from recent context (S0601-S0610)
    recent_context = scaffold.get('recent_context', {})
    for seed_id, seed_data in sorted(recent_context.items()):
        if 'new_legos' in seed_data:
            for lego_entry in seed_data['new_legos']:
                # Format: [id, english, chinese]
                if len(lego_entry) >= 3:
                    english, chinese = lego_entry[1], lego_entry[2]
                    vocab.add(chinese)
                    vocab_list_lines.append(f"  {chinese} ({english})")

    vocab_str = '\n'.join(vocab_list_lines) if vocab_list_lines else "(Initial LEGOs - limited vocabulary)"
    return vocab, vocab_str


def generate_phrases_for_lego(
    lego_id: str,
    english: str,
    chinese: str,
    lego_type: str,
    is_final_lego: bool,
    seed_english: str,
    seed_chinese: str,
    current_earlier_legos: List[Dict],
    recent_context: Dict
) -> Optional[List[List]]:
    """
    Generate 10 practice phrases for a single LEGO using Claude with extended thinking.

    Returns: List of 10 phrase entries in format [english, chinese, pattern_code, word_count]
    or None if generation fails.
    """

    # Build vocabulary context
    vocab, vocab_str = build_vocabulary_context({'recent_context': recent_context})

    # Add current seed's earlier LEGOs
    earlier_lego_str = ""
    if current_earlier_legos:
        earlier_lego_str = "\n\nEARLIER LEGOs IN THIS SEED (also available for use):\n"
        for i, lego in enumerate(current_earlier_legos, 1):
            earlier_lego_str += f"  {lego['target']} ({lego['known']})\n"

    # Build the prompt for extended thinking
    prompt = f"""You are a Mandarin Chinese language pedagogy expert specializing in creating natural, high-quality practice phrases.

TASK: Generate exactly 10 practice phrases for this LEGO (Language Element).

CRITICAL CONSTRAINTS:
1. Generate EXACTLY 10 phrases (no more, no less)
2. Distribution MUST be: 2 short (1-2 words) + 2 medium (3 words) + 2 longer (4-5 words) + 4 long (6+ words)
3. EVERY Chinese word MUST come ONLY from available vocabulary
4. All phrases must sound natural to native speakers
5. English and Chinese grammar must be perfect
6. Format: ["English phrase", "Chinese phrase"] - both in the exact format shown

LEGO DETAILS:
- ID: {lego_id}
- English: "{english}"
- Chinese: "{chinese}"
- Type: {lego_type} ({'atomic/single word' if lego_type == 'A' else 'molecular/multi-word phrase'})
- Seed context: "{seed_english}" / "{seed_chinese}"
- Is final LEGO in seed: {is_final_lego}

AVAILABLE VOCABULARY (from previous seeds):
{vocab_str}
{earlier_lego_str}

QUALITY REQUIREMENTS:
- Each phrase must demonstrate natural usage of the LEGO
- Build from simple to complex progressively
- Ensure semantic correctness
- No forced or unnatural constructions
- Consider the LEGO's grammatical role

PHRASE DISTRIBUTION REQUIRED:
- Phrases 1-2: Very short (1-2 words) - can be fragments showing the LEGO bare
- Phrases 3-4: Quite short (exactly 3 words) - complete thoughts
- Phrases 5-6: Longer (4-5 words) - building complexity
- Phrases 7-10: Long (6+ words) - natural conversational usage

{'FINAL LEGO RULE: Phrase #10 MUST be the complete seed sentence: "' + seed_english + '" / "' + seed_chinese + '"' if is_final_lego else ''}

Return ONLY a valid JSON array with exactly 10 items, each with [english, chinese]:
[
  ["short phrase", "短语"],
  ["another short phrase", "另一短语"],
  ... (total 10 items with the distribution above)
]"""

    try:
        # Call Claude with extended thinking
        response = client.messages.create(
            model=MODEL,
            max_tokens=12000,
            thinking={
                "type": "enabled",
                "budget_tokens": THINKING_BUDGET
            },
            temperature=1.0,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        # Extract text content from response
        json_text = None
        for block in response.content:
            if block.type == 'text':
                json_text = block.text
                break

        if not json_text:
            print(f"    ❌ No text response for {lego_id}")
            return None

        # Extract JSON from response (handle markdown code blocks)
        if not json_text.strip().startswith('['):
            # Try to extract from markdown code blocks
            import re
            match = re.search(r'\[[\s\S]*\]', json_text)
            if match:
                json_text = match.group(0)
            else:
                print(f"    ❌ No JSON array found in response for {lego_id}")
                return None

        # Parse JSON
        phrases = json.loads(json_text.strip())

        # Validate phrase count
        if not isinstance(phrases, list) or len(phrases) != 10:
            print(f"    ❌ Invalid phrase count for {lego_id}: got {len(phrases) if isinstance(phrases, list) else 'not a list'} phrases")
            return None

        # Format phrases with word count
        formatted_phrases = []
        for phrase_entry in phrases:
            if isinstance(phrase_entry, (list, tuple)) and len(phrase_entry) >= 2:
                eng, chn = phrase_entry[0], phrase_entry[1]
                word_count = len(eng.split())
                formatted_phrases.append([eng, chn, None, word_count])
            else:
                print(f"    ❌ Invalid phrase format in {lego_id}")
                return None

        print(f"    ✅ Generated 10 phrases for {lego_id}")
        return formatted_phrases

    except json.JSONDecodeError as e:
        print(f"    ❌ JSON parsing error for {lego_id}: {str(e)}")
        return None
    except Exception as e:
        print(f"    ❌ Error generating phrases for {lego_id}: {str(e)}")
        return None


def process_scaffold(seed_file: str) -> bool:
    """
    Process a single scaffold file and generate phrases for all LEGOs.
    Saves output to phase5_outputs directory.
    """
    scaffold_path = SCAFFOLDS_DIR / seed_file

    if not scaffold_path.exists():
        print(f"  [SKIP] {seed_file} - file not found")
        return False

    try:
        # Read scaffold
        with open(scaffold_path, 'r', encoding='utf-8') as f:
            scaffold = json.load(f)

        seed_id = scaffold.get('seed_id', 'UNKNOWN')
        print(f"\nProcessing {seed_file}:")
        print(f"  Seed ID: {seed_id}")

        # Get seed pair for context
        seed_pair = scaffold.get('seed_pair', {})
        seed_english = seed_pair.get('known', '')
        seed_chinese = seed_pair.get('target', '')

        # Get recent context
        recent_context = scaffold.get('recent_context', {})

        # Process each LEGO
        legos = scaffold.get('legos', {})
        lego_ids = sorted(legos.keys())

        print(f"  LEGOs to process: {len(lego_ids)}")
        processed = 0

        for lego_id in lego_ids:
            lego_data = legos[lego_id]

            # Extract LEGO info
            lego = lego_data.get('lego', [None, None])
            english, chinese = lego[0] or '', lego[1] or ''
            lego_type = lego_data.get('type', 'A')
            is_final_lego = lego_data.get('is_final_lego', False)
            current_earlier_legos = lego_data.get('current_seed_earlier_legos', [])

            print(f"  Processing {lego_id}: '{english}' / '{chinese}' ({lego_type})...", end=' ', flush=True)

            # Generate phrases
            phrases = generate_phrases_for_lego(
                lego_id=lego_id,
                english=english,
                chinese=chinese,
                lego_type=lego_type,
                is_final_lego=is_final_lego,
                seed_english=seed_english,
                seed_chinese=seed_chinese,
                current_earlier_legos=current_earlier_legos,
                recent_context=recent_context
            )

            if phrases and len(phrases) == 10:
                # Update LEGO data
                lego_data['practice_phrases'] = phrases

                # Calculate distribution
                distribution = {
                    'short_1_to_2_legos': 0,
                    'medium_3_legos': 0,
                    'longer_4_legos': 0,
                    'longest_5_legos': 0
                }

                for phrase in phrases:
                    word_count = phrase[3] if len(phrase) > 3 else 1
                    if word_count <= 2:
                        distribution['short_1_to_2_legos'] += 1
                    elif word_count == 3:
                        distribution['medium_3_legos'] += 1
                    elif word_count <= 5:
                        distribution['longer_4_legos'] += 1
                    else:
                        distribution['longest_5_legos'] += 1

                lego_data['phrase_distribution'] = distribution
                processed += 1
            else:
                print(f"❌ Failed to generate phrases")

            # Rate limiting - avoid hitting API limits
            time.sleep(0.5)

        # Update generation stage
        scaffold['generation_stage'] = 'PHRASES_GENERATED'

        # Save output
        output_path = OUTPUT_DIR / seed_file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)

        print(f"\n  ✅ Saved to: {output_path}")
        print(f"  Successfully processed: {processed}/{len(lego_ids)} LEGOs")
        return True

    except Exception as e:
        print(f"  ❌ Error processing {seed_file}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main processing function for S0611-S0620"""

    print("\n" + "="*80)
    print("Phase 5: Intelligent Phrase Generator")
    print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
    print(f"Seeds: S0611 - S0620")
    print("="*80)

    # Check API key
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("\n❌ Error: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    # Process seeds
    seed_files = [f"seed_s{seed_num:04d}.json" for seed_num in SEED_RANGE]

    successful = 0
    failed = []

    for seed_file in seed_files:
        if (SCAFFOLDS_DIR / seed_file).exists():
            if process_scaffold(seed_file):
                successful += 1
            else:
                failed.append(seed_file)
        else:
            print(f"\n[SKIP] {seed_file} - not found in scaffolds directory")

    # Summary
    print("\n" + "="*80)
    print("✅ PROCESSING COMPLETE")
    print(f"Successfully processed: {successful} seeds")
    if failed:
        print(f"Failed seeds: {', '.join(failed)}")
    print(f"Output directory: {OUTPUT_DIR}")
    print("="*80 + "\n")

    return 0 if len(failed) == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
