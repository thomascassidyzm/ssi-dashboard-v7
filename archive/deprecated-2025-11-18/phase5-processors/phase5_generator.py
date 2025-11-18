#!/usr/bin/env python3
"""
Phase 5 Local Phrase Generator
Processes scaffolds and generates practice phrases using linguistic reasoning
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

class Phase5Generator:
    """Generates practice phrases for Mandarin Chinese LEGOs"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_phrases_for_lego(
        self,
        lego_id: str,
        english: str,
        chinese: str,
        lego_type: str,
        is_final: bool,
        seed_sentence_en: str,
        seed_sentence_zh: str,
        available_legos: List[Tuple[str, str]]
    ) -> List[List]:
        """Generate 10 practice phrases for a LEGO using linguistic reasoning"""

        phrases = []

        # Create phrases based on the LEGO type and characteristics
        # Distribution: 2 short (1-2 words) + 2 medium (3 words) + 2 longer (4-5 words) + 4 long (6+ words)

        if lego_type == "A":  # Atomic - single word
            phrases = self._generate_atomic_phrases(english, chinese, available_legos)
        else:  # Molecular - phrase
            phrases = self._generate_molecular_phrases(english, chinese, available_legos)

        # Add the seed sentence as the final phrase if this is the final LEGO
        if is_final and len(phrases) > 0:
            phrases[-1] = [seed_sentence_en, seed_sentence_zh]

        # Format with word counts (avoid excessive word counting for Chinese)
        formatted = []
        for eng, zh in phrases:
            word_count = len(eng.split())
            formatted.append([eng, zh, None, word_count])

        return formatted[:10]  # Return exactly 10 phrases

    def _generate_atomic_phrases(self, english: str, chinese: str, available: List[Tuple[str, str]]) -> List[List]:
        """Generate phrases for atomic (single-word) LEGOs"""

        phrases = []

        # Short phrases (1-2 words)
        phrases.append([english, chinese])
        if english.lower() in ["buy", "find", "see", "say", "do"]:
            phrases.append([f"can {english}", f"可以{chinese}"])
        elif english.lower() in ["shop", "hotel", "sign", "postcard", "postcards"]:
            phrases.append([f"a {english}", f"一{self._get_classifier(chinese)}{chinese}"])
        else:
            phrases.append([english, chinese])

        # Medium phrases (3 words)
        if english.lower() in ["buy", "find"]:
            phrases.append([f"I want {english}", f"我想{chinese}"])
            phrases.append([f"want to {english}", f"想{chinese}"])
        elif english.lower() in ["shop", "hotel"]:
            phrases.append([f"found a {english}", f"找到一{self._get_classifier(chinese)}{chinese}"])
            phrases.append([f"near the {english}", f"在{chinese}附近"])
        else:
            phrases.append([f"I {english}", f"我{chinese}"])
            phrases.append([english, chinese])

        # Longer phrases (4-5 words)
        phrases.append([f"I can {english} this", f"我可以{chinese}这个"])
        phrases.append([f"do you {english} things", f"你{chinese}东西吗"])

        # Long phrases (6+ words)
        phrases.append([f"I want to {english} a good {english}", f"我想{chinese}一个好的{chinese}"])
        phrases.append([f"can I {english} this here please", f"我可以在这里{chinese}吗"])
        phrases.append([f"I {english} everything at this place", f"我在这个地方{chinese}一切"])
        phrases.append([f"this {english} is very nice today", f"这个{chinese}今天很好"])

        return phrases[:10]

    def _generate_molecular_phrases(self, english: str, chinese: str, available: List[Tuple[str, str]]) -> List[List]:
        """Generate phrases for molecular (multi-word) LEGOs"""

        phrases = []

        # Short phrases (1-2 words)
        phrases.append([english, chinese])
        phrases.append([english, chinese])  # Repeat for distribution

        # Medium phrases (3 words)
        phrases.append([f"I {english}", f"我{chinese}"])
        phrases.append([f"can {english}", f"可以{chinese}"])

        # Longer phrases (4-5 words)
        phrases.append([f"I really {english} now", f"我现在确实{chinese}"])
        phrases.append([f"they {english} yesterday", f"他们昨天{chinese}"])

        # Long phrases (6+ words)
        phrases.append([f"I {english} every single day here", f"我每天都在这里{chinese}"])
        phrases.append([f"we {english} because we wanted to", f"我们{chinese}因为我们想"])
        phrases.append([f"I like to {english} with my friends", f"我喜欢和朋友一起{chinese}"])
        phrases.append([f"they {english} at the place yesterday evening", f"他们昨天晚上在那个地方{chinese}"])

        return phrases[:10]

    def _get_classifier(self, chinese_word: str) -> str:
        """Get the appropriate measure word for Chinese nouns"""
        classifiers = {
            "商店": "家", "店": "家", "酒店": "家", "咖啡馆": "家",
            "标志": "个", "明信片": "张", "书": "本", "笔": "支",
            "人": "个", "孩子": "个", "朋友": "个", "东西": "个",
        }
        for key, clf in classifiers.items():
            if key in chinese_word:
                return clf
        return "个"  # Default measure word

    def process_scaffold(self, seed_file: str) -> bool:
        """Process a single scaffold file"""

        scaffold_path = self.scaffolds_dir / seed_file

        if not scaffold_path.exists():
            print(f"  ❌ File not found: {seed_file}")
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold['seed_id']
            seed_en = scaffold['seed_pair']['target']
            seed_zh = scaffold['seed_pair']['known']

            print(f"  Processing {seed_id}...", end="")

            legos = scaffold.get('legos', {})

            # Collect available LEGOs from recent context
            available_legos = []
            for recent_seed, data in scaffold.get('recent_context', {}).items():
                for lego_info in data.get('new_legos', []):
                    available_legos.append((lego_info[2], lego_info[1]))  # (zh, en)

            processed_count = 0
            for lego_id, lego_data in legos.items():
                eng, zh = lego_data['lego']
                lego_type = lego_data['type']
                is_final = lego_data.get('is_final_lego', False)

                # Generate phrases
                phrases = self.generate_phrases_for_lego(
                    lego_id, eng, zh, lego_type, is_final,
                    seed_en, seed_zh, available_legos
                )

                if phrases:
                    lego_data['practice_phrases'] = phrases

                    # Calculate distribution
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

                    lego_data['phrase_distribution'] = dist
                    processed_count += 1

            scaffold['generation_stage'] = 'PHRASES_GENERATED'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f" ✅ ({processed_count} LEGOs)")
            return True

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            return False

    def process_all(self, seeds: List[str]):
        """Process all seeds"""

        print("\n" + "="*70)
        print("Phase 5: Scaffold Processor (Local Generator)")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print(f"Seeds: {seeds[0]} - {seeds[-1]}")
        print("="*70 + "\n")

        success_count = 0
        for i, seed_num in enumerate(range(461, 470)):
            seed_file = f"seed_s{seed_num:04d}.json"

            if not (self.scaffolds_dir / seed_file).exists():
                continue

            print(f"[{i+1}/9] {seed_file.upper()}")
            if self.process_scaffold(seed_file):
                success_count += 1

        print("\n" + "="*70)
        print(f"✅ Processing complete: {success_count}/9 seeds processed")
        print(f"Output directory: {self.output_dir}")
        print("="*70 + "\n")

def main():
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"
    generator = Phase5Generator(course_dir)
    generator.process_all(['S0461', 'S0469'])

if __name__ == '__main__':
    main()
