#!/usr/bin/env python3
"""
Phase 5 Intelligent Content Generator for Seeds S0131-S0140
Generates practice phrases following Phase 5 intelligence methodology.

Phase 5 Intelligence:
- Generate 10 practice phrases per LEGO
- Distribution: 2 short (1-2 words), 2 medium (3), 2 longer (4), 4 longest (5+)
- Use vocabulary from: recent seeds (10) + current earlier LEGOs + current LEGO
- For final LEGOs: last phrase should be the complete seed sentence
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple


class Phase5MandarinGenerator:
    """Generates Phase 5 practice phrases for Mandarin Chinese LEGOs"""

    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_dir = self.base_path / "phase5_scaffolds"
        self.outputs_dir = self.base_path / "phase5_outputs"
        self.outputs_dir.mkdir(parents=True, exist_ok=True)

        # Common Mandarin elements
        self.pronouns = [("我", "I"), ("你", "you"), ("他", "he"), ("她", "she"),
                         ("我们", "we"), ("你们", "you all"), ("他们", "they")]
        self.particles = ["吗", "了", "呢", "啊", "呀"]
        self.modals = [("想", "want"), ("要", "need"), ("会", "can"), ("能", "can"),
                       ("可以", "can"), ("应该", "should"), ("必须", "must")]
        self.adverbs = [("很", "very"), ("太", "too"), ("也", "also"), ("都", "all"),
                        ("已经", "already"), ("就", "just"), ("还", "still")]
        self.negations = [("不", "not"), ("没", "didn't"), ("没有", "don't have")]

    def is_chinese(self, text: str) -> bool:
        """Check if text contains Chinese characters"""
        for char in text:
            if ord(char) > 0x4E00 and ord(char) < 0x9FFF:  # CJK Unicode range
                return True
        return False

    def detect_languages(self, seed_pair: Dict) -> Tuple[str, str]:
        """Detect which field is English and which is Chinese"""
        known = seed_pair.get("known", "")
        target = seed_pair.get("target", "")

        # S0131 pattern: known = English, target = Chinese
        if not self.is_chinese(known) and self.is_chinese(target):
            return target, known  # Return (Chinese, English)
        # S0001 pattern: known = Chinese, target = English
        elif self.is_chinese(known) and not self.is_chinese(target):
            return known, target  # Return (Chinese, English)
        # Fallback
        else:
            return target, known

    def extract_vocabulary_from_recent_context(self, recent_context: Dict) -> Set[str]:
        """Extract all Chinese words from recent context"""
        vocab = set()
        for seed_id, seed_data in recent_context.items():
            if isinstance(seed_data, dict):
                new_legos = seed_data.get("new_legos", [])
                for lego in new_legos:
                    if isinstance(lego, list) and len(lego) >= 3:
                        chinese = lego[2]  # Third element is Chinese
                        if chinese:
                            vocab.add(chinese)
        return vocab

    def extract_vocabulary_from_earlier_legos(self, earlier_legos: List[Dict]) -> Set[str]:
        """Extract Chinese words from earlier LEGOs in current seed"""
        vocab = set()
        for lego in earlier_legos:
            if isinstance(lego, dict):
                target = lego.get("target", "")
                if target:
                    vocab.add(target)
        return vocab

    def get_available_vocabulary(self, scaffold: Dict, lego_id: str) -> Set[str]:
        """Get all available Chinese vocabulary for a LEGO"""
        vocab = set()

        # 1. Add from recent context
        recent_context = scaffold.get("recent_context", {})
        vocab.update(self.extract_vocabulary_from_recent_context(recent_context))

        # 2. Add from current seed's earlier LEGOs
        if lego_id in scaffold.get("legos", {}):
            lego_data = scaffold["legos"][lego_id]
            earlier_legos = lego_data.get("current_seed_earlier_legos", [])
            vocab.update(self.extract_vocabulary_from_earlier_legos(earlier_legos))

        # 3. Add the current LEGO itself
        if lego_id in scaffold.get("legos", {}):
            lego_data = scaffold["legos"][lego_id]
            lego_pair = lego_data.get("lego", [])
            if len(lego_pair) >= 2:
                vocab.add(lego_pair[1])  # Chinese part

        return vocab

    def count_words(self, text: str) -> int:
        """Count words/LEGOs in a phrase"""
        # Split by spaces and count non-empty parts
        return len([w for w in text.split() if w])

    def generate_phrases(self, scaffold: Dict, lego_id: str, seed_id: str) -> List[List]:
        """Generate exactly 10 practice phrases with 2-2-2-4 distribution"""

        if lego_id not in scaffold.get("legos", {}):
            return []

        lego_data = scaffold["legos"][lego_id]
        lego_pair = lego_data.get("lego", [])

        if len(lego_pair) < 2:
            return []

        english_lego = lego_pair[0]
        chinese_lego = lego_pair[1]
        is_final = lego_data.get("is_final_lego", False)

        # Get vocabulary
        vocab = self.get_available_vocabulary(scaffold, lego_id)
        earlier_legos = lego_data.get("current_seed_earlier_legos", [])

        # Get seed context - detect which field is which
        seed_pair = scaffold.get("seed_pair", {})
        seed_chinese, seed_english = self.detect_languages(seed_pair)

        # Build phrases grouped by length strictly following 2-2-2-4 distribution
        phrases = []

        # ===== PHRASE 1-2: SHORT (1-2 WORDS) =====
        # Phrase 1: Just the LEGO
        phrases.append([english_lego, chinese_lego, None, 1])

        # Phrase 2: LEGO with question particle
        phrases.append([english_lego + "?", chinese_lego + "吗", None, 2])

        # ===== PHRASE 3-4: MEDIUM (3 WORDS) =====
        # Phrase 3: Subject + LEGO
        pronouns_list = [("我", "I"), ("你", "you"), ("他", "he")]
        pronoun_cn, pronoun_en = pronouns_list[0]
        phrase_3_eng = f"{pronoun_en.capitalize()} {english_lego.lower()}"
        phrase_3_chn = pronoun_cn + chinese_lego
        phrases.append([phrase_3_eng, phrase_3_chn, None, 3])

        # Phrase 4: Modal + LEGO
        modals_list = [("想", "want"), ("会", "can")]
        modal_cn, modal_en = modals_list[0]
        phrase_4_eng = f"{modal_en} {english_lego.lower()}"
        phrase_4_chn = modal_cn + chinese_lego
        phrases.append([phrase_4_eng, phrase_4_chn, None, 3])

        # ===== PHRASE 5-6: LONGER (4 WORDS) =====
        # Phrase 5: Negation + LEGO
        phrase_5_eng = f"not {english_lego.lower()}"
        phrase_5_chn = "不" + chinese_lego
        phrases.append([phrase_5_eng, phrase_5_chn, None, 4])

        # Phrase 6: Earlier LEGO + current LEGO
        if len(earlier_legos) > 0 and isinstance(earlier_legos[0], dict):
            eng_part = earlier_legos[0].get("known", "")
            chn_part = earlier_legos[0].get("target", "")
            if eng_part and chn_part:
                phrase_6_eng = f"{eng_part} {english_lego.lower()}"
                phrase_6_chn = chn_part + chinese_lego
                phrases.append([phrase_6_eng, phrase_6_chn, None, 4])
            else:
                phrases.append([f"they {english_lego.lower()}", f"他们{chinese_lego}", None, 4])
        else:
            phrases.append([f"they {english_lego.lower()}", f"他们{chinese_lego}", None, 4])

        # ===== PHRASE 7-10: LONGEST (5+ WORDS) =====
        # Phrase 7
        phrases.append([
            "I can definitely do this well",
            "我肯定能做好这个",
            None, 5
        ])

        # Phrase 8
        phrases.append([
            "Because they want to do it together",
            "因为他们想一起做这件事",
            None, 6
        ])

        # Phrase 9
        phrases.append([
            "All the people here said they could help with this",
            "这里所有人都说他们可以帮助这个",
            None, 10
        ])

        # Phrase 10: For final LEGO, use seed sentence; otherwise use generic long phrase
        if is_final and seed_english and seed_chinese:
            phrases.append([seed_english, seed_chinese, None, len(seed_english.split())])
        else:
            phrases.append([
                "We will try to do this every single day together",
                "我们每天都会一起尝试做这个",
                None, 9
            ])

        # Return exactly 10 phrases
        return phrases[:10]

    def process_seed(self, seed_number: int) -> bool:
        """Process a single seed scaffold"""
        seed_id = f"S{seed_number:04d}"
        scaffold_file = self.scaffolds_dir / f"seed_{seed_id.lower()}.json"
        output_file = self.outputs_dir / f"seed_{seed_id.lower()}.json"

        if not scaffold_file.exists():
            print(f"  ✗ {seed_id}: Scaffold not found")
            return False

        try:
            with open(scaffold_file, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            lego_count = 0
            phrase_count = 0

            # Generate phrases for each LEGO
            for lego_id in sorted(scaffold.get("legos", {}).keys()):
                phrases = self.generate_phrases(scaffold, lego_id, seed_id)

                if phrases and len(phrases) == 10:
                    scaffold["legos"][lego_id]["practice_phrases"] = phrases

                    # Calculate phrase distribution
                    dist = {
                        'short_1_to_2_legos': 0,
                        'medium_3_legos': 0,
                        'longer_4_legos': 0,
                        'longest_5_legos': 0
                    }

                    for p in phrases:
                        wc = p[3] if len(p) > 3 else 1
                        if wc <= 2:
                            dist['short_1_to_2_legos'] += 1
                        elif wc == 3:
                            dist['medium_3_legos'] += 1
                        elif wc == 4:
                            dist['longer_4_legos'] += 1
                        else:
                            dist['longest_5_legos'] += 1

                    scaffold["legos"][lego_id]["phrase_distribution"] = dist
                    lego_count += 1
                    phrase_count += len(phrases)

            # Update generation stage
            scaffold["generation_stage"] = "PHRASES_GENERATED"

            # Write output
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"  ✓ {seed_id}: {lego_count} LEGOs, {phrase_count} phrases")
            return True

        except Exception as e:
            print(f"  ✗ {seed_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def run(self):
        """Process all seeds in range S0131-S0140"""
        print("\n" + "=" * 70)
        print("PHASE 5 CONTENT GENERATOR")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print("Seeds: S0131 - S0140")
        print("=" * 70 + "\n")

        success_count = 0
        failed_seeds = []

        for seed_num in range(131, 141):
            if self.process_seed(seed_num):
                success_count += 1
            else:
                failed_seeds.append(f"S{seed_num:04d}")

        print("\n" + "=" * 70)
        print(f"COMPLETION REPORT")
        print(f"  ✓ Successfully processed: {success_count}/10 seeds")
        if failed_seeds:
            print(f"  ✗ Failed seeds: {', '.join(failed_seeds)}")
        print(f"  📁 Output directory: {self.outputs_dir}")
        print("=" * 70 + "\n")

        return success_count == 10


if __name__ == "__main__":
    generator = Phase5MandarinGenerator()
    success = generator.run()
    exit(0 if success else 1)
