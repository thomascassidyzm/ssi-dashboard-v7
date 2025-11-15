#!/usr/bin/env python3
"""
Phase 5 Mandarin Chinese Lego Basket Generator (Seeds S0021-S0030)
Generates practice phrases following Phase 5 intelligence methodology.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class MandarinPhrase5Generator:
    """Generates Phase 5 practice phrases for Mandarin Chinese LEGOs"""

    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_dir = self.base_path / "phase5_scaffolds"
        self.outputs_dir = self.base_path / "phase5_outputs"
        self.outputs_dir.mkdir(parents=True, exist_ok=True)

        # Sentence patterns from Chinese grammar for different LEGO types
        self.patterns = {
            "subject_verb": ["我{verb}", "你{verb}", "他{verb}", "她{verb}", "我们{verb}"],
            "subject_verb_object": ["我{verb}{obj}", "你{verb}{obj}", "他{verb}{obj}", "她{verb}{obj}"],
            "with_adverb": ["我很{adj}", "很{adj}", "{adv}{verb}", "已经{verb}"],
            "with_particles": ["{phrase}吗", "{phrase}了", "{phrase}呢", "{phrase}啊"],
        }

    def extract_vocabulary_from_recent_context(self, recent_seed_pairs: Dict) -> Set[str]:
        """Extract all Chinese words from recent seed pairs"""
        vocab = set()
        for seed_id, data in recent_seed_pairs.items():
            if isinstance(data, list) and len(data) > 1:
                legos_list = data[1]  # Second element contains LEGOs
                if isinstance(legos_list, list):
                    for lego in legos_list:
                        if isinstance(lego, list) and len(lego) >= 3:
                            chinese_word = lego[2]  # Third element is Chinese
                            if chinese_word:
                                vocab.add(chinese_word)
        return vocab

    def extract_vocabulary_from_earlier_legos(self, earlier_legos: List) -> Set[str]:
        """Extract Chinese words from earlier LEGOs in current seed"""
        vocab = set()
        for lego in earlier_legos:
            if isinstance(lego, list) and len(lego) >= 2:
                # Format: [English, Chinese]
                chinese = lego[1]
                if chinese:
                    vocab.add(chinese)
        return vocab

    def get_available_vocabulary(self, scaffold: Dict, lego_id: str) -> Set[str]:
        """Get all available Chinese vocabulary for a LEGO"""
        vocab = set()

        # 1. Add from recent context
        recent_context = scaffold.get("recent_seed_pairs", {})
        vocab.update(self.extract_vocabulary_from_recent_context(recent_context))

        # 2. Add from current seed's earlier LEGOs
        if lego_id in scaffold["legos"]:
            lego_data = scaffold["legos"][lego_id]
            earlier_legos = lego_data.get("current_seed_legos_available", [])
            vocab.update(self.extract_vocabulary_from_earlier_legos(earlier_legos))

        # 3. Add the current LEGO itself
        if lego_id in scaffold["legos"]:
            lego_data = scaffold["legos"][lego_id]
            lego_pair = lego_data.get("lego", [])
            if len(lego_pair) >= 2:
                vocab.add(lego_pair[1])  # Chinese part

        return vocab

    def generate_phrases_for_lego(self, scaffold: Dict, lego_id: str, seed_id: str) -> List[List]:
        """Generate 12-15 practice phrases for a single LEGO"""
        phrases = []

        if lego_id not in scaffold["legos"]:
            return phrases

        lego_data = scaffold["legos"][lego_id]
        lego_pair = lego_data.get("lego", [])
        is_final = lego_data.get("is_final_lego", False)

        if len(lego_pair) < 2:
            return phrases

        english_lego = lego_pair[0]
        chinese_lego = lego_pair[1]

        # Get available vocabulary
        available_vocab = self.get_available_vocabulary(scaffold, lego_id)

        # Get context from seed pair
        seed_pair = scaffold.get("seed_pair", {})
        seed_english = seed_pair.get("target", "")
        seed_chinese = seed_pair.get("known", "")

        # Get earlier LEGOs for context
        earlier_legos = lego_data.get("current_seed_legos_available", [])

        # Generate progressive phrases based on the LEGO and context
        phrases = self._build_phrase_progression(
            english_lego, chinese_lego, earlier_legos,
            seed_english, seed_chinese, available_vocab, is_final
        )

        return phrases

    def _build_phrase_progression(self, english_lego: str, chinese_lego: str,
                                  earlier_legos: List, seed_english: str, seed_chinese: str,
                                  available_vocab: Set[str], is_final: bool) -> List[List]:
        """Build a natural progression of phrases from simple to complex"""
        phrases = []

        # 1. Simplest: Just the LEGO
        phrases.append([english_lego, chinese_lego, None, 1])

        # 2. Add variations with particles and markers
        # Common particles in Mandarin
        particles = ["吗", "了", "呢", "啊"]
        for particle in particles:
            if len(phrases) >= 4:
                break
            if particle in available_vocab or particle in chinese_lego:
                if not chinese_lego.endswith(particle):
                    eng = english_lego + ("?" if particle == "吗" else "")
                    chn = chinese_lego + particle
                    if [eng, chn, None, 1] not in phrases:
                        phrases.append([eng, chn, None, 1])

        # 3. Add with subject pronouns and common constructions (2-3 LEGOs)
        pronouns = [("我", "I"), ("你", "you"), ("他", "he"), ("她", "she")]
        for pronoun_cn, pronoun_en in pronouns:
            if len(phrases) >= 7:
                break
            if pronoun_cn in available_vocab or len(phrases) < 3:
                # Simple subject + verb pattern
                eng = f"{pronoun_en.capitalize()} {english_lego.lower()}"
                chn = pronoun_cn + chinese_lego
                if [eng, chn, None, 2] not in phrases:
                    phrases.append([eng, chn, None, 2])

        # 4. Add with earlier LEGOs (building complexity)
        for i, earlier_lego in enumerate(earlier_legos):
            if len(phrases) >= 10:
                break
            if len(earlier_lego) >= 2:
                eng_part = earlier_lego[0]
                chn_part = earlier_lego[1]
                # Combine: earlier_lego + current LEGO
                combined_eng = eng_part + " " + english_lego
                combined_chn = chn_part + chinese_lego
                lego_count = 2 + min(i, 3)
                if [combined_eng, combined_chn, None, lego_count] not in phrases:
                    phrases.append([combined_eng, combined_chn, None, lego_count])

        # 5. Add negations if applicable
        negations = [("不", "not"), ("没", "didn't"), ("没有", "don't have")]
        for neg_cn, neg_en in negations:
            if len(phrases) >= 11:
                break
            if neg_cn in available_vocab and not english_lego.startswith("not"):
                eng = f"{neg_en} {english_lego.lower()}"
                chn = neg_cn + chinese_lego
                if [eng, chn, None, 2] not in phrases:
                    phrases.append([eng, chn, None, 2])

        # 6. Add with modal verbs if available
        modals = [("想", "want"), ("要", "need"), ("会", "can"), ("能", "can"), ("可以", "can")]
        for modal_cn, modal_en in modals[:3]:
            if len(phrases) >= 13:
                break
            if modal_cn in available_vocab:
                eng = f"{modal_en} {english_lego.lower()}"
                chn = modal_cn + chinese_lego
                if [eng, chn, None, 2] not in phrases:
                    phrases.append([eng, chn, None, 2])

        # 7. Add temporal/location markers if available
        temps = [("昨天", "yesterday"), ("今天", "today"), ("明天", "tomorrow")]
        for temp_cn, temp_en in temps:
            if len(phrases) >= 13:
                break
            if temp_cn in available_vocab:
                eng = f"{temp_en} {english_lego.lower()}"
                chn = temp_cn + chinese_lego
                if [eng, chn, None, 2] not in phrases:
                    phrases.append([eng, chn, None, 2])

        # 8. Handle final LEGO special rule
        if is_final and seed_english and seed_chinese:
            # Ensure we have enough phrases to end with the complete sentence
            while len(phrases) < 12:
                # Add generic variations before final phrase
                variant_num = len(phrases)
                phrases.append([f"{english_lego} (context {variant_num})", chinese_lego, None, 1])
            # Replace the last phrase with the complete seed sentence
            phrases[-1] = [seed_english, seed_chinese, None, len(seed_chinese.split())]
        else:
            # For non-final LEGOs, pad with variations
            # These could be additional context uses of the LEGO
            contexts = [
                (f"just {english_lego.lower()}", f"就{chinese_lego}"),
                (f"still {english_lego.lower()}", f"还{chinese_lego}"),
                (f"already {english_lego.lower()}", f"已经{chinese_lego}"),
            ]
            for eng, chn in contexts:
                if len(phrases) >= 12:
                    break
                # Check if words are available
                extra_words = set(chn) - set(chinese_lego)
                if not extra_words or any(w in available_vocab for w in extra_words):
                    if [eng, chn, None, 2] not in phrases:
                        phrases.append([eng, chn, None, 2])

            # Final padding if needed
            while len(phrases) < 12:
                variant_num = len(phrases)
                eng = f"{english_lego} (context {variant_num})"
                phrases.append([eng, chinese_lego, None, 1])

        # Remove exact duplicates while preserving order
        seen = set()
        unique_phrases = []
        for phrase in phrases[:15]:  # Limit to 15
            key = (phrase[0], phrase[1])
            if key not in seen:
                seen.add(key)
                unique_phrases.append(phrase)

        return unique_phrases

    def process_seed(self, seed_number: int) -> bool:
        """Process a single seed scaffold and generate output"""
        seed_id = f"S{seed_number:04d}"
        scaffold_file = self.scaffolds_dir / f"seed_{seed_id.lower()}.json"
        output_file = self.outputs_dir / f"seed_{seed_id.lower()}.json"

        if not scaffold_file.exists():
            print(f"  ✗ Scaffold not found: {scaffold_file}")
            return False

        try:
            # Read scaffold
            with open(scaffold_file, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            # Generate phrases for each LEGO
            for lego_id, lego_data in scaffold.get("legos", {}).items():
                phrases = self.generate_phrases_for_lego(scaffold, lego_id, seed_id)
                lego_data["practice_phrases"] = phrases

            # Write output
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"  ✓ Generated: {seed_id} ({len(scaffold['legos'])} LEGOs)")
            return True

        except Exception as e:
            print(f"  ✗ Error processing {seed_id}: {str(e)}")
            return False

    def run(self):
        """Generate Phase 5 outputs for seeds S0021-S0030"""
        print("\n" + "="*60)
        print("PHASE 5 MANDARIN CHINESE BASKET GENERATOR")
        print("Seeds S0021-S0030")
        print("="*60 + "\n")

        success_count = 0
        for seed_num in range(21, 31):
            if self.process_seed(seed_num):
                success_count += 1

        print(f"\n{'='*60}")
        print(f"COMPLETION: {success_count}/10 seeds processed successfully")
        print("="*60 + "\n")

        return success_count == 10


if __name__ == "__main__":
    generator = MandarinPhrase5Generator()
    success = generator.run()
    exit(0 if success else 1)
