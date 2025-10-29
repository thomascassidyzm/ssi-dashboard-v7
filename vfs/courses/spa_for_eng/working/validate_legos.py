#!/usr/bin/env python3
"""
Validate LEGO decompositions to identify specific errors.
"""

import json
from typing import List, Dict, Tuple
from collections import defaultdict

def load_data():
    """Load seed and LEGO data."""
    with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/seed_pairs.json', 'r') as f:
        seed_data = json.load(f)

    with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng/lego_pairs.tmp.json', 'r') as f:
        lego_data = json.load(f)

    return seed_data, lego_data

def check_tiling(seed_id: str, seed_spanish: str, legos: List) -> Tuple[bool, str]:
    """
    Check if LEGOs tile perfectly to reconstruct the seed.
    Returns: (is_valid, error_message)
    """
    # Remove ending punctuation from seed
    seed_clean = seed_spanish.rstrip('.?!')

    # Reconstruct from LEGOs
    reconstructed_parts = []
    for lego in legos:
        lego_type = lego[1]
        spa_text = lego[2]
        reconstructed_parts.append(spa_text)

    reconstructed = ' '.join(reconstructed_parts)

    if reconstructed != seed_clean:
        return False, f"tiling_failure: '{reconstructed}' != '{seed_clean}'"

    return True, ""

def build_fcfs_map(lego_data: Dict) -> Dict[str, Dict]:
    """
    Build FCFS map: Spanish word/phrase -> first English translation.
    Returns dict with: {spanish: {'english': eng, 'seed_id': sid, 'type': type}}
    """
    fcfs_map = {}

    for seed_entry in lego_data['seeds']:
        seed_id = seed_entry[0]
        legos = seed_entry[2]

        for lego in legos:
            lego_type = lego[1]
            spa = lego[2]
            eng = lego[3]

            # Only record first occurrence (FCFS)
            if spa not in fcfs_map:
                fcfs_map[spa] = {
                    'english': eng,
                    'seed_id': seed_id,
                    'type': lego_type
                }

    return fcfs_map

def check_fcfs_violations(seed_id: str, legos: List, fcfs_map: Dict) -> List[str]:
    """
    Check for FCFS violations where a Spanish phrase maps to different English.
    """
    violations = []

    for lego in legos:
        lego_id = lego[0]
        lego_type = lego[1]
        spa = lego[2]
        eng = lego[3]

        if spa in fcfs_map:
            first_eng = fcfs_map[spa]['english']
            first_seed = fcfs_map[spa]['seed_id']

            if eng != first_eng:
                violations.append(
                    f"fd_violation_fcfs: '{spa}' -> '{eng}' but FCFS is '{first_eng}' from {first_seed}"
                )

    return violations

def check_standalone_negation(legos: List) -> List[str]:
    """Check for standalone 'No' LEGOs."""
    errors = []

    for lego in legos:
        spa = lego[2]
        eng = lego[3]

        if spa == "No" and eng in ["No", "not", "Not"]:
            errors.append(f"standalone_negation: 'No' should not be standalone")

    return errors

def validate_seed(seed_id: str, seed_data: Dict, lego_data: Dict, fcfs_map: Dict) -> Tuple[bool, List[str]]:
    """
    Validate a single seed's LEGO decomposition.
    Returns: (is_valid, list_of_errors)
    """
    errors = []

    # Get seed translation
    if seed_id not in seed_data['translations']:
        return False, [f"Seed {seed_id} not found in seed_pairs.json"]

    spa_text, eng_text = seed_data['translations'][seed_id]

    # Find LEGO entry
    legos = None
    for seed_entry in lego_data['seeds']:
        if seed_entry[0] == seed_id:
            legos = seed_entry[2]
            break

    if legos is None:
        return False, [f"Seed {seed_id} not found in lego_pairs.tmp.json"]

    # Check tiling
    is_valid, error = check_tiling(seed_id, spa_text, legos)
    if not is_valid:
        errors.append(error)

    # Check FCFS violations
    fcfs_errors = check_fcfs_violations(seed_id, legos, fcfs_map)
    errors.extend(fcfs_errors)

    # Check standalone negation
    neg_errors = check_standalone_negation(legos)
    errors.extend(neg_errors)

    return len(errors) == 0, errors

def main():
    # Failed seed IDs to check
    failed_seeds = [
        "S0003", "S0007", "S0050", "S0071", "S0072", "S0073", "S0074", "S0075", "S0076", "S0077",
        "S0078", "S0079", "S0080", "S0081", "S0082", "S0083", "S0084", "S0085", "S0086", "S0087",
        "S0088", "S0089", "S0090", "S0091", "S0092", "S0093", "S0094", "S0095", "S0096", "S0097",
        "S0098", "S0099", "S0100", "S0101", "S0102", "S0103", "S0104", "S0105", "S0106", "S0107",
        "S0108", "S0109", "S0110", "S0111", "S0112", "S0113", "S0114", "S0115", "S0116", "S0117",
        "S0118", "S0119", "S0120", "S0121", "S0122", "S0123", "S0124", "S0125", "S0126", "S0127",
        "S0128", "S0129", "S0130", "S0131", "S0132", "S0133", "S0134", "S0135", "S0136", "S0137",
        "S0138", "S0139", "S0140", "S0014", "S0019"
    ]

    print("Loading data...")
    seed_data, lego_data = load_data()

    print("Building FCFS map...")
    fcfs_map = build_fcfs_map(lego_data)
    print(f"FCFS map has {len(fcfs_map)} entries")

    print("\nValidating failed seeds...")
    error_summary = defaultdict(int)

    for seed_id in failed_seeds[:20]:  # Check first 20 for now
        is_valid, errors = validate_seed(seed_id, seed_data, lego_data, fcfs_map)

        if not is_valid:
            print(f"\n{seed_id}:")
            spa_text, eng_text = seed_data['translations'][seed_id]
            print(f"  Spanish: {spa_text}")
            print(f"  English: {eng_text}")
            for error in errors:
                print(f"  ERROR: {error}")
                error_type = error.split(':')[0]
                error_summary[error_type] += 1

    print(f"\n{'='*70}")
    print("ERROR SUMMARY:")
    for error_type, count in sorted(error_summary.items()):
        print(f"  {error_type}: {count}")

if __name__ == "__main__":
    main()
