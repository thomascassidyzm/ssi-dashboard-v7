#!/usr/bin/env python3
"""
Phase 5 Practice Phrase Generation for cmn_for_eng
Processes seeds S0391-S0400 using Claude to generate practice phrases
following Phase 5 Intelligence v7.0 methodology.
"""

import json
import os
from pathlib import Path
from anthropic import Anthropic

# Configuration
COURSE_PATH = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
SCAFFOLDS_DIR = COURSE_PATH / "phase5_scaffolds"
OUTPUTS_DIR = COURSE_PATH / "phase5_outputs"
SEED_RANGE = range(391, 401)  # S0391 to S0400
MODEL = "claude-opus-4-1-20250805"  # Use latest Opus for complex reasoning
BATCH_SIZE = 2  # Process 2 seeds at a time to manage tokens

client = Anthropic()

def extract_vocabulary(scaffold):
    """Extract available Chinese vocabulary from scaffold"""
    vocab = {}

    # Extract from recent context (10 prior seeds)
    for seed_id, context in scaffold.get("recent_context", {}).items():
        for lego_id, known, target in context.get("new_legos", []):
            # Store as Chinese word -> [English, LEGO_ID]
            chinese_words = target.split()
            for word in chinese_words:
                if word not in vocab:
                    vocab[word] = []
                vocab[word].append((known, lego_id))

    return vocab

def get_available_vocabulary(scaffold, current_lego_index):
    """Get all vocabulary available for a specific LEGO"""
    vocab_sources = {}

    # Source 1: Recent context (10 prior seeds)
    for seed_id, context in scaffold.get("recent_context", {}).items():
        for lego_id, known, target in context.get("new_legos", []):
            vocab_sources[f"recent_{seed_id}"] = {
                "english": known,
                "chinese": target,
                "lego_id": lego_id
            }

    # Source 2: Earlier LEGOs in current seed
    legos = list(scaffold["legos"].keys())
    for i in range(current_lego_index):
        earlier_lego_id = legos[i]
        lego_data = scaffold["legos"][earlier_lego_id]
        vocab_sources[earlier_lego_id] = {
            "english": lego_data["lego"][0],
            "chinese": lego_data["lego"][1],
            "lego_id": earlier_lego_id
        }

    # Source 3: Current LEGO
    current_lego_id = legos[current_lego_index]
    current_lego_data = scaffold["legos"][current_lego_id]
    vocab_sources[current_lego_id] = {
        "english": current_lego_data["lego"][0],
        "chinese": current_lego_data["lego"][1],
        "lego_id": current_lego_id
    }

    return vocab_sources

def build_context_for_lego(scaffold, lego_id, lego_index):
    """Build comprehensive context for a LEGO"""
    lego_data = scaffold["legos"][lego_id]
    vocab_sources = get_available_vocabulary(scaffold, lego_index)

    # Format vocabulary for Claude
    vocab_list = "\n".join([
        f"- {src_id}: \"{v['english']}\" = \"{v['chinese']}\""
        for src_id, v in vocab_sources.items()
    ])

    context = {
        "seed_id": scaffold["seed_id"],
        "lego_id": lego_id,
        "lego": lego_data["lego"],
        "type": lego_data["type"],
        "is_final_lego": lego_data["is_final_lego"],
        "seed_pair": scaffold["seed_pair"],
        "earlier_legos": lego_data["current_seed_earlier_legos"],
        "vocab_sources": vocab_list,
        "is_first_lego": lego_index == 0
    }

    return context

def generate_phrases_for_seed(scaffold):
    """Generate practice phrases for all LEGOs in a scaffold"""
    seed_id = scaffold["seed_id"]
    print(f"\n--- Processing {seed_id} ---")

    lego_ids = list(scaffold["legos"].keys())

    # Check which LEGOs need phrases
    legos_to_process = []
    for lego_index, lego_id in enumerate(lego_ids):
        lego_data = scaffold["legos"][lego_id]
        if not lego_data["practice_phrases"]:
            legos_to_process.append((lego_index, lego_id))
        else:
            print(f"  {lego_id}: Already has {len(lego_data['practice_phrases'])} phrases (skipping)")

    if not legos_to_process:
        print(f"  All LEGOs already have phrases")
        return scaffold

    # Generate all phrases at once with Claude
    all_phrases = generate_all_phrases_with_claude(scaffold, legos_to_process)

    # Store results
    for lego_id, phrases in all_phrases.items():
        scaffold["legos"][lego_id]["practice_phrases"] = phrases
        print(f"  {lego_id}: Generated {len(phrases)} phrases")

    return scaffold

def generate_all_phrases_with_claude(scaffold, legos_to_process):
    """Use Claude to generate practice phrases for all LEGOs in a seed"""
    seed_id = scaffold["seed_id"]
    seed_pair = scaffold["seed_pair"]
    lego_ids = list(scaffold["legos"].keys())

    # Build vocabulary list from all sources
    all_vocab = {}

    # Recent context
    for ctx_seed_id, context in scaffold.get("recent_context", {}).items():
        for lego_id, known, target in context.get("new_legos", []):
            all_vocab[lego_id] = {
                "english": known,
                "chinese": target,
                "source": f"seed {ctx_seed_id}"
            }

    # All earlier LEGOs in current seed
    for idx in range(len(legos_to_process)):
        if idx > 0:
            earlier_lego_id = lego_ids[legos_to_process[idx - 1][0]]
            earlier_lego_data = scaffold["legos"][earlier_lego_id]
            all_vocab[earlier_lego_id] = {
                "english": earlier_lego_data["lego"][0],
                "chinese": earlier_lego_data["lego"][1],
                "source": f"{seed_id} earlier"
            }

    # Format vocabulary
    vocab_lines = []
    for lego_id, v in all_vocab.items():
        vocab_lines.append(f"- {lego_id}: \"{v['english']}\" / \"{v['chinese']}\" ({v['source']})")
    vocab_text = "\n".join(vocab_lines)

    # Build LEGO specifications
    lego_specs = []
    for lego_index, lego_id in legos_to_process:
        lego_data = scaffold["legos"][lego_id]
        lego_specs.append(f"""
LEGO {lego_id}:
- English: "{lego_data['lego'][0]}"
- Chinese: "{lego_data['lego'][1]}"
- Type: {lego_data['type']}
- Is Final LEGO: {lego_data['is_final_lego']}
""")

    # Build prompt
    prompt = f"""You are generating practice phrases for Phase 5 of a Mandarin Chinese language course.

SEED CONTEXT:
- Seed ID: {seed_id}
- Complete English: "{seed_pair['known']}"
- Complete Chinese: "{seed_pair['target']}"

AVAILABLE VOCABULARY (ONLY VALID SOURCE FOR CHINESE WORDS):
{vocab_text}

LEGO UNITS TO TEACH:
{''.join(lego_specs)}

YOUR TASK:
Generate exactly 10 practice phrases for EACH LEGO following Phase 5 Intelligence v7.0 methodology.

CRITICAL REQUIREMENTS:
1. EVERY Chinese word must come ONLY from the available vocabulary list (ZERO EXCEPTIONS)
2. Distribution for each LEGO: 2×(1-2 words), 2×3 words, 2×4 words, 4×(5+ words)
3. Phrases must be natural and grammatical in BOTH English and Chinese
4. Build progressively from simple to complex combinations
5. For final LEGOs, the 10th phrase MUST be the complete seed sentence
6. Each phrase format: [english_phrase, chinese_phrase, null, word_count]

VOCABULARY VALIDATION:
- Before using any Chinese word, check it exists in the available vocabulary
- Combine words from vocabulary as needed, but no new words
- If insufficient vocabulary, reduce phrase complexity rather than inventing words

OUTPUT FORMAT (valid JSON only):
{{
  "LEGO_ID": [
    ["English", "Chinese", null, 1],
    ["English", "Chinese", null, 2],
    ...
  ],
  ...
}}

Generate the phrases now."""

    # Call Claude with extended thinking using streaming
    result_text = ""
    with client.messages.stream(
        model=MODEL,
        max_tokens=16000,
        thinking={
            "type": "enabled",
            "budget_tokens": 8000
        },
        messages=[{
            "role": "user",
            "content": prompt
        }]
    ) as stream:
        for text in stream.text_stream:
            result_text += text

    # Parse JSON
    try:
        # Extract JSON object
        if "{" in result_text:
            json_start = result_text.index("{")
            json_end = result_text.rindex("}") + 1
            json_str = result_text[json_start:json_end]
            result = json.loads(json_str)

            # Normalize results
            phrases_by_lego = {}
            for lego_id in result:
                phrases = result[lego_id]
                if len(phrases) > 10:
                    phrases = phrases[:10]
                phrases_by_lego[lego_id] = phrases

            return phrases_by_lego
        else:
            print(f"  ERROR: No JSON object found in response")
            return {}
    except json.JSONDecodeError as e:
        print(f"  ERROR: Failed to parse JSON: {e}")
        print(f"  Response preview: {result_text[:500]}")
        return {}

def process_all_seeds():
    """Process all seeds in range"""
    print("=" * 70)
    print("Phase 5 Practice Phrase Generation - cmn_for_eng")
    print(f"Seeds: S{SEED_RANGE.start:04d} to S{SEED_RANGE.stop-1:04d}")
    print("=" * 70)

    for seed_num in SEED_RANGE:
        seed_id = f"S{seed_num:04d}"
        scaffold_path = SCAFFOLDS_DIR / f"seed_{seed_id.lower()}.json"
        output_path = OUTPUTS_DIR / f"seed_{seed_id.lower()}.json"

        if not scaffold_path.exists():
            print(f"\n✗ {seed_id}: Scaffold file not found")
            continue

        # Load scaffold
        with open(scaffold_path, 'r', encoding='utf-8') as f:
            scaffold = json.load(f)

        # Check if output already exists
        if output_path.exists():
            with open(output_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
                # Check if all LEGOs have phrases
                all_complete = all(
                    lego_data.get("practice_phrases", [])
                    for lego_data in existing["legos"].values()
                )
                if all_complete:
                    print(f"\n✓ {seed_id}: Already complete ({len(existing['legos'])} LEGOs)")
                    continue
                scaffold = existing  # Use existing to preserve any partial work

        # Process scaffold
        try:
            updated_scaffold = generate_phrases_for_seed(scaffold)

            # Save output
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(updated_scaffold, f, ensure_ascii=False, indent=2)

            print(f"✓ {seed_id}: Saved to {output_path.name}")
        except Exception as e:
            print(f"✗ {seed_id}: Error - {e}")
            continue

if __name__ == "__main__":
    process_all_seeds()
    print("\n" + "=" * 70)
    print("Phase 5 processing complete!")
    print("=" * 70)
