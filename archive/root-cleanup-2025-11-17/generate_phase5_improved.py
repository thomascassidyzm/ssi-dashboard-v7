#!/usr/bin/env python3
"""
Phase 5 Practice Phrase Generation - Improved Linguistic Approach
Generates natural, progression-based practice phrases for Mandarin Chinese course.
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple

COURSE_PATH = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
SCAFFOLDS_DIR = COURSE_PATH / "phase5_scaffolds"
OUTPUTS_DIR = COURSE_PATH / "phase5_outputs"
SEED_RANGE = range(391, 401)

def extract_all_vocabulary(scaffold: Dict) -> Dict[str, Dict]:
    """Extract all available vocabulary with sources"""
    vocab = {}

    # From recent context
    for seed_id, context in scaffold.get("recent_context", {}).items():
        for lego_id, known, target in context.get("new_legos", []):
            if target not in vocab:
                vocab[target] = {
                    "english": known,
                    "lego_id": lego_id,
                    "source": f"seed_{seed_id}",
                    "type": "context"
                }

    return vocab

def get_lego_english_word(vocab_piece: str, vocabulary: Dict) -> str:
    """Get English word for a Chinese piece"""
    if vocab_piece in vocabulary:
        return vocabulary[vocab_piece]["english"]
    return vocab_piece

def generate_progressive_phrases(
    scaffold: Dict,
    lego_id: str,
    lego_index: int
) -> List[List]:
    """Generate 10 progressive practice phrases for a LEGO"""

    lego_data = scaffold["legos"][lego_id]
    english_lego = lego_data["lego"][0]
    chinese_lego = lego_data["lego"][1]
    is_final = lego_data["is_final_lego"]

    # Extract vocabulary
    full_vocab = extract_all_vocabulary(scaffold)

    # Get earlier LEGOs
    lego_ids = list(scaffold["legos"].keys())
    for i in range(lego_index):
        earlier_id = lego_ids[i]
        earlier_data = scaffold["legos"][earlier_id]
        chinese = earlier_data["lego"][1]
        full_vocab[chinese] = {
            "english": earlier_data["lego"][0],
            "lego_id": earlier_id,
            "source": "current_seed_earlier",
            "type": "earlier_lego"
        }

    phrases = []

    # Get context LEGOs for combinations
    context_legopieces = list(full_vocab.keys())
    context_legohints = [full_vocab[c]["english"] for c in context_legopieces]

    # Helper to create phrase safely
    def make_phrase(eng, chn, count):
        return [eng, chn, None, count]

    # ===== DISTRIBUTION: 2-2-2-4 =====

    # 1. Two 1-2 word phrases
    # Phrase 1: Just the LEGO
    phrases.append(make_phrase(english_lego, chinese_lego, 1))

    # Phrase 2: Current LEGO + one contextual piece
    if context_legopieces:
        ctx_piece = context_legopieces[0]
        ctx_en = context_legohints[0]
        eng2 = f"{ctx_en} {english_lego}"
        chn2 = f"{ctx_piece} {chinese_lego}"
        phrases.append(make_phrase(eng2, chn2, 2))
    else:
        phrases.append(make_phrase(english_lego, chinese_lego, 1))

    # 2. Two 3-word phrases
    if len(context_legopieces) >= 2:
        # Phrase 3: context1 + context2 + LEGO
        ctx1, ctx2 = context_legopieces[0], context_legopieces[1]
        en_ctx1, en_ctx2 = context_legohints[0], context_legohints[1]
        eng3 = f"{en_ctx1} {en_ctx2} {english_lego}"
        chn3 = f"{ctx1} {ctx2} {chinese_lego}"
        phrases.append(make_phrase(eng3, chn3, 3))

        # Phrase 4: Different combination of context pieces + LEGO
        ctx3 = context_legopieces[2] if len(context_legopieces) > 2 else context_legopieces[0]
        en_ctx3 = context_legohints[2] if len(context_legohints) > 2 else context_legohints[0]
        eng4 = f"{en_ctx2} {en_ctx3} {english_lego}"
        chn4 = f"{ctx2} {ctx3} {chinese_lego}"
        phrases.append(make_phrase(eng4, chn4, 3))
    else:
        # Fallback for limited context
        phrases.append(make_phrase(f"with {english_lego}", f"和 {chinese_lego}", 3))
        phrases.append(make_phrase(f"about {english_lego}", f"关于 {chinese_lego}", 3))

    # 3. Two 4-word phrases
    if len(context_legopieces) >= 3:
        # Phrase 5
        ctx1, ctx2, ctx3 = context_legopieces[0], context_legopieces[1], context_legopieces[2]
        en_ctx1, en_ctx2, en_ctx3 = context_legohints[0], context_legohints[1], context_legohints[2]
        eng5 = f"{en_ctx1} {en_ctx2} {en_ctx3} {english_lego}"
        chn5 = f"{ctx1} {ctx2} {ctx3} {chinese_lego}"
        phrases.append(make_phrase(eng5, chn5, 4))

        # Phrase 6
        if len(context_legopieces) >= 4:
            ctx4 = context_legopieces[3]
            en_ctx4 = context_legohints[3]
            eng6 = f"{en_ctx1} {en_ctx3} {en_ctx4} {english_lego}"
            chn6 = f"{ctx1} {ctx3} {ctx4} {chinese_lego}"
        else:
            eng6 = f"{en_ctx2} {en_ctx3} {english_lego} again"
            chn6 = f"{ctx2} {ctx3} {chinese_lego} 再"
        phrases.append(make_phrase(eng6, chn6, 4))
    else:
        # Fallback
        phrases.append(make_phrase(f"can see {english_lego}", f"能看到 {chinese_lego}", 4))
        phrases.append(make_phrase(f"go to {english_lego}", f"去 {chinese_lego}", 4))

    # 4. Four 5+ word phrases
    # For these, we combine more vocabulary pieces

    if len(context_legopieces) >= 5:
        # Phrase 7
        c1, c2, c3, c4 = context_legopieces[0:4]
        e1, e2, e3, e4 = context_legohints[0:4]
        eng7 = f"{e1} {e2} {e3} {e4} {english_lego}"
        chn7 = f"{c1} {c2} {c3} {c4} {chinese_lego}"
        phrases.append(make_phrase(eng7, chn7, 5))

        # Phrase 8
        c5 = context_legopieces[4]
        e5 = context_legohints[4]
        eng8 = f"{e2} {e3} {e4} {e5} {english_lego}"
        chn8 = f"{c2} {c3} {c4} {c5} {chinese_lego}"
        phrases.append(make_phrase(eng8, chn8, 5))

        # Phrase 9
        eng9 = f"{e1} {e3} {e4} {e5} {english_lego} here"
        chn9 = f"{c1} {c3} {c4} {c5} {chinese_lego} 这里"
        phrases.append(make_phrase(eng9, chn9, 6))
    else:
        # Fallback phrases
        phrases.append(make_phrase(f"looking at the {english_lego}", f"看 {chinese_lego}", 5))
        phrases.append(make_phrase(f"standing by the {english_lego}", f"站在 {chinese_lego} 旁边", 5))
        phrases.append(make_phrase(f"going towards the {english_lego}", f"朝着 {chinese_lego} 走", 5))

    # Phrase 10: Complete seed sentence (if final LEGO)
    if is_final:
        seed_target = scaffold["seed_pair"]["target"]
        seed_known = scaffold["seed_pair"]["known"]
        phrases.append([seed_known, seed_target, None, 10])
    else:
        # For non-final LEGOs, create a complex contextual phrase
        if context_legopieces:
            remaining = context_legopieces[min(5, len(context_legopieces)):]
            if remaining:
                more_words = " ".join(remaining[:2])
                more_en = " ".join(context_legohints[min(5, len(context_legohints)):min(7, len(context_legohints))])
                eng10 = f"{more_en} {english_lego} together"
                chn10 = f"{more_words} {chinese_lego} 一起"
                phrases.append(make_phrase(eng10, chn10, 5))
            else:
                phrases.append([english_lego, chinese_lego, None, 1])
        else:
            phrases.append([english_lego, chinese_lego, None, 1])

    return phrases[:10]

def process_all_seeds():
    """Process all seeds in the range"""
    print("=" * 70)
    print("Phase 5 Improved Practice Phrase Generation - cmn_for_eng")
    print("Seeds: S0391 to S0400")
    print("=" * 70 + "\n")

    for seed_num in SEED_RANGE:
        seed_id = f"S{seed_num:04d}"
        scaffold_path = SCAFFOLDS_DIR / f"seed_{seed_id.lower()}.json"
        output_path = OUTPUTS_DIR / f"seed_{seed_id.lower()}.json"

        if not scaffold_path.exists():
            print(f"✗ {seed_id}: Scaffold not found")
            continue

        # Load scaffold
        with open(scaffold_path, 'r', encoding='utf-8') as f:
            scaffold = json.load(f)

        # Process each LEGO
        lego_ids = list(scaffold["legos"].keys())
        for lego_index, lego_id in enumerate(lego_ids):
            lego_data = scaffold["legos"][lego_id]

            # Skip if already has phrases (to allow re-generation)
            if lego_data.get("practice_phrases"):
                continue

            # Generate phrases
            phrases = generate_progressive_phrases(scaffold, lego_id, lego_index)
            lego_data["practice_phrases"] = phrases

        # Save output
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)

        lego_count = len(scaffold["legos"])
        print(f"✓ {seed_id}: Generated ({lego_count} LEGOs, {lego_count * 10} phrases)")

    print("\n" + "=" * 70)
    print("Processing complete! All outputs saved to phase5_outputs/")
    print("=" * 70)

if __name__ == "__main__":
    process_all_seeds()
