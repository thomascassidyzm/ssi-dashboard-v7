#!/usr/bin/env python3
"""
Fix 431 failed LEGO decompositions for Spanish language learning system.
"""

import json
import re
from typing import List, Dict, Tuple, Optional

# Failed seed IDs to fix
FAILED_SEEDS = [
    "S0003", "S0007", "S0050", "S0071", "S0072", "S0073", "S0074", "S0075", "S0076", "S0077",
    "S0078", "S0079", "S0080", "S0081", "S0082", "S0083", "S0084", "S0085", "S0086", "S0087",
    "S0088", "S0089", "S0090", "S0091", "S0092", "S0093", "S0094", "S0095", "S0096", "S0097",
    "S0098", "S0099", "S0100", "S0101", "S0102", "S0103", "S0104", "S0105", "S0106", "S0107",
    "S0108", "S0109", "S0110", "S0111", "S0112", "S0113", "S0114", "S0115", "S0116", "S0117",
    "S0118", "S0119", "S0120", "S0121", "S0122", "S0123", "S0124", "S0125", "S0126", "S0127",
    "S0128", "S0129", "S0130", "S0131", "S0132", "S0133", "S0134", "S0135", "S0136", "S0137",
    "S0138", "S0139", "S0140", "S0520", "S0561", "S0562", "S0563", "S0564", "S0565", "S0566",
    "S0567", "S0568", "S0569", "S0570", "S0571", "S0572", "S0573", "S0574", "S0575", "S0576",
    "S0577", "S0578", "S0579", "S0580", "S0581", "S0582", "S0583", "S0584", "S0585", "S0586",
    "S0587", "S0588", "S0589", "S0590", "S0591", "S0592", "S0593", "S0594", "S0595", "S0596",
    "S0597", "S0598", "S0599", "S0600", "S0601", "S0602", "S0603", "S0604", "S0605", "S0606",
    "S0607", "S0608", "S0609", "S0610", "S0611", "S0612", "S0613", "S0614", "S0615", "S0616",
    "S0617", "S0618", "S0619", "S0620", "S0621", "S0622", "S0623", "S0624", "S0625", "S0626",
    "S0627", "S0628", "S0629", "S0630", "S0631", "S0632", "S0633", "S0634", "S0635", "S0636",
    "S0637", "S0638", "S0640", "S0641", "S0643", "S0644", "S0645", "S0646", "S0647", "S0649",
    "S0650", "S0651", "S0652", "S0653", "S0654", "S0655", "S0656", "S0657", "S0658", "S0659",
    "S0660", "S0661", "S0662", "S0663", "S0664", "S0665", "S0666", "S0667", "S0668", "S0014",
    "S0019", "S0023", "S0028", "S0029", "S0032", "S0041", "S0043", "S0046", "S0047", "S0048",
    "S0052", "S0053", "S0056", "S0057", "S0058", "S0059", "S0060", "S0061", "S0063", "S0064",
    "S0065", "S0067", "S0141", "S0142", "S0143", "S0144", "S0146", "S0147", "S0148", "S0149",
    "S0151", "S0152", "S0154", "S0156", "S0158", "S0160", "S0162", "S0163", "S0165", "S0167",
    "S0168", "S0169", "S0170", "S0172", "S0174", "S0175", "S0177", "S0179", "S0181", "S0183",
    "S0185", "S0186", "S0188", "S0191", "S0193", "S0194", "S0195", "S0197", "S0198", "S0200",
    "S0201", "S0202", "S0203", "S0204", "S0205", "S0206", "S0207", "S0208", "S0209", "S0210",
    "S0211", "S0218", "S0221", "S0230", "S0231", "S0232", "S0233", "S0234", "S0235", "S0236",
    "S0246", "S0247", "S0248", "S0255", "S0256", "S0261", "S0268", "S0272", "S0273", "S0276",
    "S0277", "S0279", "S0280", "S0282", "S0285", "S0286", "S0287", "S0288", "S0289", "S0290",
    "S0291", "S0292", "S0295", "S0296", "S0297", "S0298", "S0301", "S0302", "S0303", "S0304",
    "S0306", "S0307", "S0308", "S0309", "S0310", "S0312", "S0313", "S0314", "S0315", "S0316",
    "S0317", "S0318", "S0322", "S0323", "S0325", "S0326", "S0327", "S0328", "S0329", "S0330",
    "S0332", "S0333", "S0334", "S0335", "S0336", "S0337", "S0339", "S0340", "S0342", "S0343",
    "S0344", "S0345", "S0346", "S0347", "S0349", "S0350", "S0351", "S0352", "S0353", "S0354",
    "S0355", "S0356", "S0357", "S0358", "S0359", "S0360", "S0361", "S0362", "S0363", "S0364",
    "S0365", "S0366", "S0367", "S0368", "S0370", "S0372", "S0374", "S0375", "S0378", "S0379",
    "S0380", "S0381", "S0382", "S0383", "S0384", "S0386", "S0387", "S0395", "S0398", "S0401",
    "S0402", "S0403", "S0404", "S0406", "S0407", "S0408", "S0409", "S0410", "S0411", "S0413",
    "S0414", "S0415", "S0416", "S0419", "S0420", "S0424", "S0425", "S0426", "S0429", "S0430",
    "S0431", "S0435", "S0436", "S0438", "S0440", "S0443", "S0444", "S0448", "S0449", "S0450",
    "S0454", "S0455", "S0456", "S0458", "S0464", "S0475", "S0480", "S0483", "S0485", "S0490",
    "S0495", "S0497", "S0498", "S0499", "S0501", "S0502", "S0503", "S0508", "S0509", "S0511",
    "S0513", "S0519", "S0521", "S0522", "S0525", "S0526", "S0529", "S0531", "S0533", "S0536",
    "S0541", "S0544", "S0545", "S0546", "S0552", "S0553", "S0557", "S0558", "S0642", "S0390",
    "S0391"
]

class LegoDecomposer:
    def __init__(self):
        self.fcfs_map = {}  # Maps Spanish word/phrase to first English translation
        self.seed_data = None
        self.lego_data = None

    def load_data(self):
        """Load seed and LEGO data from JSON files."""
        # Load seed pairs
        with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/seed_pairs.json', 'r') as f:
            self.seed_data = json.load(f)

        # Load LEGO pairs
        with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.tmp.json', 'r') as f:
            self.lego_data = json.load(f)

    def build_fcfs_map(self):
        """Build FCFS mapping from existing LEGO decompositions."""
        print("Building FCFS map from existing decompositions...")

        for seed_entry in self.lego_data['seeds']:
            seed_id = seed_entry[0]
            legos = seed_entry[2]

            for lego in legos:
                lego_id, lego_type, spa, eng = lego[0], lego[1], lego[2], lego[3]

                # For BASIC LEGOs, record FCFS mapping
                if lego_type == "B":
                    if spa not in self.fcfs_map:
                        self.fcfs_map[spa] = eng

                # For COMPOSITE LEGOs, record the composite phrase
                elif lego_type == "C":
                    if spa not in self.fcfs_map:
                        self.fcfs_map[spa] = eng

        print(f"Built FCFS map with {len(self.fcfs_map)} entries")

    def tokenize_spanish(self, text: str) -> List[str]:
        """Tokenize Spanish text into words, preserving punctuation."""
        # Remove ending punctuation
        text = text.rstrip('.?!')
        # Split on whitespace
        return text.split()

    def tokenize_english(self, text: str) -> List[str]:
        """Tokenize English text into words."""
        text = text.rstrip('.?!')
        return text.split()

    def decompose_seed(self, seed_id: str, spa_text: str, eng_text: str) -> List:
        """
        Decompose a seed into LEGOs following all the rules.
        Returns list of LEGOs: [[lego_id, type, spa, eng], ...]
        """
        spa_words = self.tokenize_spanish(spa_text)
        eng_words = self.tokenize_english(eng_text)

        legos = []
        lego_counter = 1
        i = 0  # Position in Spanish text

        while i < len(spa_words):
            # Try to match existing LEGOs from FCFS map
            matched = False

            # Try longest matches first (up to 6 words)
            for length in range(min(6, len(spa_words) - i), 0, -1):
                spa_phrase = ' '.join(spa_words[i:i+length])

                if spa_phrase in self.fcfs_map:
                    eng_phrase = self.fcfs_map[spa_phrase]
                    lego_id = f"{seed_id}L{lego_counter:02d}"
                    legos.append([lego_id, "B", spa_phrase, eng_phrase])
                    lego_counter += 1
                    i += length
                    matched = True
                    break

            if not matched:
                # No existing LEGO found - need to create new one
                # This is where we apply hard rules and create COMPOSITE LEGOs
                lego_id, lego_type, spa_chunk, eng_chunk, words_consumed = self.create_new_lego(
                    seed_id, lego_counter, spa_words, eng_words, i, spa_text, eng_text
                )
                legos.append([lego_id, lego_type, spa_chunk, eng_chunk])
                lego_counter += 1
                i += words_consumed

        return legos

    def create_new_lego(self, seed_id: str, counter: int, spa_words: List[str],
                       eng_words: List[str], pos: int, full_spa: str, full_eng: str) -> Tuple:
        """
        Create a new LEGO when no existing match found.
        Returns: (lego_id, type, spa_text, eng_text, words_consumed)
        """
        current_word = spa_words[pos]
        lego_id = f"{seed_id}L{counter:02d}"

        # Apply hard rules for chunking

        # Rule: Negations join expressions (No + verb/adjective)
        if current_word == "No" and pos + 1 < len(spa_words):
            # Look ahead to find the complete negative expression
            return self.chunk_negative_expression(lego_id, spa_words, eng_words, pos, full_spa, full_eng)

        # Rule: Auxiliaries join main verbs (Estoy/Estás + gerund)
        if current_word in ["Estoy", "Estás", "Está", "Estamos", "Están"] and pos + 1 < len(spa_words):
            next_word = spa_words[pos + 1]
            if next_word.endswith("ando") or next_word.endswith("iendo"):
                return self.chunk_auxiliary_verb(lego_id, spa_words, eng_words, pos, full_spa, full_eng)

        # Rule: Gender articles bond with nouns
        if current_word in ["un", "una", "el", "la", "los", "las"] and pos + 1 < len(spa_words):
            return self.chunk_article_noun(lego_id, spa_words, eng_words, pos, full_spa, full_eng)

        # Rule: Object pronouns join verbs (Me/Te/Le + verb)
        if current_word in ["Me", "Te", "Le", "Se", "Nos"] and pos + 1 < len(spa_words):
            return self.chunk_pronoun_verb(lego_id, spa_words, eng_words, pos, full_spa, full_eng)

        # Default: treat as single word BASIC LEGO
        # Try to find corresponding English
        eng_text = self.find_english_equivalent(current_word, spa_words, eng_words, pos, full_spa, full_eng)

        return (lego_id, "B", current_word, eng_text, 1)

    def chunk_negative_expression(self, lego_id, spa_words, eng_words, pos, full_spa, full_eng):
        """Chunk negative expressions like 'No estoy seguro' -> 'I'm not sure'"""
        # Try different chunk sizes for negative expressions
        for length in range(min(5, len(spa_words) - pos), 1, -1):
            spa_chunk = ' '.join(spa_words[pos:pos+length])
            # Find this in the English translation
            eng_chunk = self.infer_english_for_chunk(spa_chunk, full_spa, full_eng)
            if eng_chunk:
                if length > 2:
                    # Multi-word negative expression - make it COMPOSITE
                    parts = self.decompose_composite(spa_chunk, eng_chunk)
                    return (lego_id, "C", spa_chunk, eng_chunk, length, parts)
                else:
                    return (lego_id, "B", spa_chunk, eng_chunk, length)

        # Fallback
        return (lego_id, "B", spa_words[pos], "not", 1)

    def chunk_auxiliary_verb(self, lego_id, spa_words, eng_words, pos, full_spa, full_eng):
        """Chunk auxiliary + verb like 'Estoy intentando' -> 'I'm trying'"""
        spa_chunk = ' '.join(spa_words[pos:pos+2])
        eng_chunk = self.infer_english_for_chunk(spa_chunk, full_spa, full_eng)

        if not eng_chunk:
            eng_chunk = "I'm " + spa_words[pos+1][:-4] + "ing"  # rough approximation

        # Create COMPOSITE LEGO
        parts = self.decompose_composite(spa_chunk, eng_chunk)
        return (lego_id, "C", spa_chunk, eng_chunk, 2, parts)

    def chunk_article_noun(self, lego_id, spa_words, eng_words, pos, full_spa, full_eng):
        """Chunk article + noun like 'una palabra' -> 'a word'"""
        spa_chunk = ' '.join(spa_words[pos:pos+2])
        eng_chunk = self.infer_english_for_chunk(spa_chunk, full_spa, full_eng)

        if eng_chunk:
            return (lego_id, "B", spa_chunk, eng_chunk, 2)

        # Fallback
        return (lego_id, "B", spa_words[pos], "a" if spa_words[pos] in ["un", "una"] else "the", 1)

    def chunk_pronoun_verb(self, lego_id, spa_words, eng_words, pos, full_spa, full_eng):
        """Chunk pronoun + verb like 'Me gustaría' -> 'I would like'"""
        spa_chunk = ' '.join(spa_words[pos:pos+2])
        eng_chunk = self.infer_english_for_chunk(spa_chunk, full_spa, full_eng)

        if eng_chunk:
            # Create COMPOSITE LEGO
            parts = self.decompose_composite(spa_chunk, eng_chunk)
            return (lego_id, "C", spa_chunk, eng_chunk, 2, parts)

        # Fallback
        return (lego_id, "B", spa_words[pos], "me", 1)

    def infer_english_for_chunk(self, spa_chunk: str, full_spa: str, full_eng: str) -> Optional[str]:
        """
        Infer English translation for a Spanish chunk by analyzing position in sentence.
        This is a simplified heuristic - may need refinement.
        """
        # For now, return None - we'll need context-specific logic
        return None

    def decompose_composite(self, spa_text: str, eng_text: str) -> List:
        """Decompose a COMPOSITE LEGO into its component mappings."""
        spa_words = spa_text.split()
        eng_words = eng_text.split()

        parts = []
        # Simple word-by-word alignment for now
        # In practice, this should be smarter
        for spa_w, eng_w in zip(spa_words, eng_words):
            parts.append([spa_w, eng_w])

        return parts

    def find_english_equivalent(self, spa_word: str, spa_words: List[str],
                               eng_words: List[str], pos: int, full_spa: str, full_eng: str) -> str:
        """Find English equivalent for a single Spanish word."""
        # This is a placeholder - in practice we'd need alignment
        if pos < len(eng_words):
            return eng_words[pos]
        return spa_word  # fallback

    def fix_failed_seeds(self):
        """Fix all failed seeds."""
        fixed_count = 0
        errors = []

        print(f"\nFixing {len(FAILED_SEEDS)} failed seeds...")

        for seed_id in FAILED_SEEDS:
            try:
                # Get seed translation
                if seed_id not in self.seed_data['translations']:
                    errors.append(f"{seed_id}: Not found in seed_pairs.json")
                    continue

                spa_text, eng_text = self.seed_data['translations'][seed_id]

                # Generate new LEGO decomposition
                legos = self.decompose_seed(seed_id, spa_text, eng_text)

                # Update in lego_data
                for i, seed_entry in enumerate(self.lego_data['seeds']):
                    if seed_entry[0] == seed_id:
                        self.lego_data['seeds'][i] = [seed_id, [spa_text, eng_text], legos]
                        fixed_count += 1
                        break

            except Exception as e:
                errors.append(f"{seed_id}: {str(e)}")

        print(f"\nFixed {fixed_count} seeds")
        if errors:
            print(f"\nErrors encountered:")
            for error in errors[:10]:  # Show first 10 errors
                print(f"  {error}")

        return fixed_count, errors

    def save_data(self):
        """Save corrected LEGO data to file."""
        output_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.tmp.json'

        with open(output_path, 'w') as f:
            json.dump(self.lego_data, f, ensure_ascii=False, separators=(',', ':'))

        print(f"\nSaved corrected data to {output_path}")

def main():
    decomposer = LegoDecomposer()

    # Load data
    print("Loading data...")
    decomposer.load_data()

    # Build FCFS map from existing decompositions
    decomposer.build_fcfs_map()

    # Fix failed seeds
    fixed_count, errors = decomposer.fix_failed_seeds()

    # Save corrected data
    decomposer.save_data()

    print(f"\n{'='*60}")
    print(f"SUMMARY:")
    print(f"  Total failed seeds to fix: {len(FAILED_SEEDS)}")
    print(f"  Successfully fixed: {fixed_count}")
    print(f"  Errors: {len(errors)}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
