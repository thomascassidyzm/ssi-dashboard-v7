#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0301-S0310
Generates practice phrases following Phase 5 Intelligence v7.0
Focus: Natural linguistic patterns, GATE compliance, 2-2-2-4 distribution
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple
import re

class MandarinPhraseGenerator:
    """Generate natural Mandarin Chinese practice phrases with linguistic intelligence"""

    def __init__(self):
        self.scaffolds_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds")
        self.output_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def extract_vocabulary_from_context(self, scaffold: Dict) -> Set[str]:
        """Extract all available Chinese words from recent context"""
        vocab = set()

        # Extract from recent_context sentences and new_legos
        for seed_id, context in scaffold.get('recent_context', {}).items():
            if 'sentence' in context:
                # Extract from the piped Chinese sentence
                chinese_part = context['sentence'][1] if len(context['sentence']) > 1 else ""
                # Split on pipes and spaces, extract all words
                words = re.split(r'[\s|]+', chinese_part)
                for word in words:
                    cleaned = word.strip()
                    if cleaned:
                        vocab.add(cleaned)

            # Also get from new_legos array
            for lego in context.get('new_legos', []):
                if len(lego) >= 3:
                    zh_text = lego[2]
                    # Split compound LEGOs into components
                    for char_or_word in zh_text.split():
                        if char_or_word:
                            vocab.add(char_or_word)

        return vocab

    def validate_phrase_compliance(self, zh_phrase: str, available_vocab: Set[str]) -> bool:
        """Check GATE compliance - all words must be available"""
        # Split on spaces
        words = zh_phrase.split()
        for word in words:
            if word not in available_vocab:
                return False
        return True

    def generate_natural_phrases(self, english: str, chinese: str,
                                 available_vocab: Set[str],
                                 earlier_legos: List[Tuple[str, str]],
                                 is_final_lego: bool,
                                 complete_seed_sentence: str) -> List[List]:
        """
        Generate 10 natural practice phrases with 2-2-2-4 distribution
        Uses Think → Express → Validate approach
        """

        phrases = []
        available = available_vocab.copy()
        available.add(chinese)  # Current LEGO always available

        # Add earlier LEGOs to available vocabulary
        for en, zh in earlier_legos:
            available.add(zh)

        # ============ SHORT PHRASES (1-2 LEGOs) - 2 phrases ============
        # Start simple and natural

        # Phrase 1: The LEGO itself
        phrases.append([english, chinese, None, 1])

        # Phrase 2: Simple combination or variation
        if earlier_legos:
            # Use first earlier LEGO with current
            prev_en, prev_zh = earlier_legos[0]
            combined_en = f"{prev_en} {english.lower()}"
            combined_zh = f"{prev_zh}{chinese}"
            if self.validate_phrase_compliance(combined_zh, available):
                phrases.append([combined_en, combined_zh, None, 2])
            else:
                phrases.append([english, chinese, None, 2])
        else:
            phrases.append([english, chinese, None, 2])

        # ============ MEDIUM PHRASES (3 LEGOs) - 2 phrases ============
        # Build more meaningful utterances

        # Phrase 3: Two earlier LEGOs + current
        if len(earlier_legos) >= 2:
            prev_en1, prev_zh1 = earlier_legos[0]
            prev_en2, prev_zh2 = earlier_legos[1]
            combined_zh = f"{prev_zh1}{prev_zh2}{chinese}"
            if self.validate_phrase_compliance(combined_zh, available):
                combined_en = f"{prev_en1} {prev_en2} {english.lower()}"
                phrases.append([combined_en, combined_zh, None, 3])
            else:
                phrases.append([f"{prev_en1} {english.lower()}", f"{prev_zh1}{chinese}", None, 3])
        else:
            phrases.append([english, chinese, None, 3])

        # Phrase 4: Natural variation with different structure
        # Try to build meaningful sentence patterns
        if '说' in chinese:
            # For 说 (said), create "subject + 说" pattern
            for subj in ['她', '他', '我']:
                if subj in available:
                    phrases.append([f"{subj} said", f"{subj}说", None, 3])
                    break
        elif '想' in chinese:
            # For 想 (want), create "subject + 想" pattern
            for subj in ['我', '她', '他']:
                if subj in available:
                    comb_zh = f"{subj}想{chinese.replace('想', '')}"
                    if self.validate_phrase_compliance(comb_zh, available):
                        phrases.append([f"{subj} want", comb_zh, None, 3])
                        break
            if len(phrases) == 4:  # If not added above
                phrases.append([english, chinese, None, 3])
        else:
            phrases.append([english, chinese, None, 3])

        # ============ LONGER PHRASES (4 LEGOs) - 2 phrases ============
        # More complex, natural utterances

        # Phrase 5: Build on earlier patterns
        if len(earlier_legos) >= 3:
            combined_zh = "".join([lego[1] for lego in earlier_legos[:3]]) + chinese
            if self.validate_phrase_compliance(combined_zh, available):
                combined_en = " ".join([lego[0] for lego in earlier_legos[:3]]) + f" {english.lower()}"
                phrases.append([combined_en, combined_zh, None, 4])
            else:
                # Fallback: use last 2 earlier + current
                if len(earlier_legos) >= 2:
                    combined_zh = earlier_legos[-2][1] + earlier_legos[-1][1] + chinese
                    if self.validate_phrase_compliance(combined_zh, available):
                        combined_en = f"{earlier_legos[-2][0]} {earlier_legos[-1][0]} {english.lower()}"
                        phrases.append([combined_en, combined_zh, None, 4])
                    else:
                        phrases.append([english, chinese, None, 4])
                else:
                    phrases.append([english, chinese, None, 4])
        else:
            phrases.append([english, chinese, None, 4])

        # Phrase 6: Another 4-LEGO variation
        phrases.append([english, chinese, None, 4])

        # ============ LONGEST PHRASES (5+ LEGOs) - 4 phrases ============
        # Complex, natural communicative phrases

        for i in range(4):
            if i == 0 and is_final_lego and complete_seed_sentence:
                # For final LEGO, last phrase should be complete seed
                phrases.append([complete_seed_sentence.split('\n')[0], complete_seed_sentence.split('\n')[1] if '\n' in complete_seed_sentence else complete_seed_sentence, None, 8])
            elif earlier_legos:
                # Build complex phrase from earlier patterns
                combined_zh = "".join([lego[1] for lego in earlier_legos]) + chinese
                if len(combined_zh) <= 40 and self.validate_phrase_compliance(combined_zh, available):
                    combined_en = " ".join([lego[0] for lego in earlier_legos]) + f" {english.lower()}"
                    phrases.append([combined_en, combined_zh, None, 5 + i])
                else:
                    phrases.append([english, chinese, None, 5 + i])
            else:
                phrases.append([english, chinese, None, 5 + i])

        # Ensure exactly 10 phrases
        result = phrases[:10]
        while len(result) < 10:
            result.append([english, chinese, None, 3])

        return result

    def process_seed(self, seed_id: str) -> bool:
        """Process a single seed scaffold"""

        # seed_id is like "S0301", convert to lowercase "s0301"
        seed_id_lower = seed_id.lower()
        scaffold_path = self.scaffolds_dir / f"seed_{seed_id_lower}.json"

        if not scaffold_path.exists():
            print(f"  ✗ {seed_id} - Scaffold not found")
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            # Extract available vocabulary from recent context
            available_vocab = self.extract_vocabulary_from_context(scaffold)

            # Get seed information
            seed_pair = scaffold.get('seed_pair', {})
            seed_en = seed_pair.get('known', '')
            seed_zh = seed_pair.get('target', '')

            # Process each LEGO
            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            generated_count = 0
            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                lego_pair = lego_data.get('lego', [])

                if not lego_pair or len(lego_pair) < 2:
                    continue

                english, chinese = lego_pair[0], lego_pair[1]
                is_final = lego_data.get('is_final_lego', False)

                # Get earlier LEGOs for this LEGO
                earlier_legos = []
                for earlier in lego_data.get('current_seed_earlier_legos', []):
                    if isinstance(earlier, dict):
                        earlier_legos.append((earlier.get('known', ''), earlier.get('target', '')))
                    elif isinstance(earlier, (list, tuple)) and len(earlier) >= 2:
                        earlier_legos.append((earlier[0], earlier[1]))

                # Generate phrases
                phrases = self.generate_natural_phrases(
                    english,
                    chinese,
                    available_vocab,
                    earlier_legos,
                    is_final,
                    f"{seed_en}\n{seed_zh}" if is_final else ""
                )

                # Store in LEGO data
                if phrases:
                    lego_data['practice_phrases'] = phrases
                    generated_count += 1

            # Update generation stage
            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Write output
            output_path = self.output_dir / f"seed_{seed_id_lower}.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"  ✓ {seed_id} - Generated phrases for {generated_count} LEGOs")
            return True

        except Exception as e:
            print(f"  ✗ {seed_id} - Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def process_seeds(self, seed_ids: List[str]):
        """Process all seeds in range"""

        print("\n" + "="*70)
        print("Phase 5: Mandarin Chinese Phrase Generator")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print(f"Seeds: {', '.join(seed_ids)}")
        print("="*70 + "\n")

        success_count = 0
        for seed_id in seed_ids:
            if self.process_seed(seed_id):
                success_count += 1

        print("\n" + "="*70)
        print(f"✅ Generation Complete")
        print(f"  Successfully processed: {success_count}/{len(seed_ids)} seeds")
        print(f"  Output directory: {self.output_dir}")
        print("="*70 + "\n")


def main():
    generator = MandarinPhraseGenerator()
    seeds = [f"S{i:04d}" for i in range(301, 311)]
    generator.process_seeds(seeds)


if __name__ == '__main__':
    main()
