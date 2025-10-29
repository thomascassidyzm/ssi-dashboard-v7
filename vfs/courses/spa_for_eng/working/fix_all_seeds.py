#!/usr/bin/env python3
"""
Fix all 431 failed LEGO decompositions.
"""

import json
import re
from typing import List, Dict, Tuple, Set
from collections import defaultdict

# Failed seed IDs to fix
FAILED_SEEDS = {
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
}

def load_data():
    """Load seed and LEGO data."""
    with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/seed_pairs.json', 'r') as f:
        seed_data = json.load(f)

    with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.tmp.json', 'r') as f:
        lego_data = json.load(f)

    return seed_data, lego_data

def remove_duplicates_in_composite(legos: List) -> List:
    """
    Remove BASIC LEGOs that are referenced within COMPOSITE LEGOs in the same seed.
    This fixes the tiling duplication issue.
    """
    # Collect Spanish text covered by COMPOSITE LEGOs
    composite_covered = set()

    for lego in legos:
        if lego[1] == "C" and len(lego) > 4:  # Has composite parts
            # The composite LEGO covers its Spanish text
            composite_covered.add(lego[2])
            # Also track individual words in the composite
            for word in lego[2].split():
                composite_covered.add(word)

    # Remove BASIC LEGOs whose Spanish text is covered by composites
    filtered_legos = []
    for lego in legos:
        if lego[1] == "B":
            # Check if this BASIC LEGO is covered by a composite
            if lego[2] not in composite_covered:
                filtered_legos.append(lego)
        else:
            filtered_legos.append(lego)

    return filtered_legos

def fix_capitalization(legos: List, seed_spanish: str) -> List:
    """
    Fix capitalization of first word to match seed.
    """
    if not legos:
        return legos

    # Get first word of seed
    seed_words = seed_spanish.rstrip('.?!').split()
    if not seed_words:
        return legos

    first_seed_word = seed_words[0]

    # Get first LEGO's Spanish text
    first_lego_spa = legos[0][2]
    first_lego_words = first_lego_spa.split()

    # Check if capitalization matches
    if first_lego_words and first_lego_words[0] != first_seed_word:
        # Fix capitalization
        fixed_words = [first_seed_word] + first_lego_words[1:]
        legos[0][2] = ' '.join(fixed_words)

    return legos

def fix_seed_decomposition(seed_id: str, seed_spanish: str, seed_english: str, legos: List) -> Tuple[List, List[str]]:
    """
    Fix a seed's LEGO decomposition.
    Returns: (fixed_legos, list_of_issues_fixed)
    """
    issues_fixed = []

    # Fix 1: Remove duplicate LEGOs caused by COMPOSITE references
    original_count = len(legos)
    legos = remove_duplicates_in_composite(legos)
    if len(legos) < original_count:
        issues_fixed.append(f"Removed {original_count - len(legos)} duplicate LEGOs")

    # Fix 2: Fix capitalization of first LEGO
    legos = fix_capitalization(legos, seed_spanish)
    issues_fixed.append("Fixed capitalization")

    # Renumber LEGOs
    for i, lego in enumerate(legos, 1):
        lego[0] = f"{seed_id}L{i:02d}"

    return legos, issues_fixed

def validate_tiling(seed_spanish: str, legos: List) -> bool:
    """Check if LEGOs tile correctly."""
    seed_clean = seed_spanish.rstrip('.?!')
    reconstructed = ' '.join(lego[2] for lego in legos)
    return reconstructed == seed_clean

def main():
    print("Loading data...")
    seed_data, lego_data = load_data()

    fixed_count = 0
    still_broken = []
    error_patterns = defaultdict(int)

    print(f"\nProcessing {len(FAILED_SEEDS)} failed seeds...\n")

    # Process each seed
    for seed_entry in lego_data['seeds']:
        seed_id = seed_entry[0]

        if seed_id not in FAILED_SEEDS:
            continue

        spa_text, eng_text = seed_entry[1]
        legos = seed_entry[2]

        # Fix the decomposition
        fixed_legos, issues = fix_seed_decomposition(seed_id, spa_text, eng_text, legos)

        # Validate
        if validate_tiling(spa_text, fixed_legos):
            # Update in place
            seed_entry[2] = fixed_legos
            fixed_count += 1
            print(f"✓ {seed_id}: {', '.join(issues)}")
        else:
            reconstructed = ' '.join(lego[2] for lego in fixed_legos)
            seed_clean = spa_text.rstrip('.?!')
            still_broken.append((seed_id, reconstructed, seed_clean))
            print(f"✗ {seed_id}: Still broken after fixes")

    # Save fixed data
    output_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.tmp.json'
    with open(output_path, 'w') as f:
        json.dump(lego_data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"\n{'='*70}")
    print(f"RESULTS:")
    print(f"  Total failed seeds: {len(FAILED_SEEDS)}")
    print(f"  Successfully fixed: {fixed_count}")
    print(f"  Still broken: {len(still_broken)}")

    if still_broken:
        print(f"\nStill broken seeds (first 10):")
        for seed_id, reconstructed, expected in still_broken[:10]:
            print(f"  {seed_id}:")
            print(f"    Got: '{reconstructed}'")
            print(f"    Exp: '{expected}'")

    print(f"\nSaved to: {output_path}")

if __name__ == "__main__":
    main()
