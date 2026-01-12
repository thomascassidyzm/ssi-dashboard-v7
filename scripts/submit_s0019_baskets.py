#!/usr/bin/env python3
"""
Submit S0019 basket payloads to the new endpoint.

Usage:
    python3 scripts/submit_s0019_baskets.py

This script reads the payloads from S0019_basket_payloads.json and submits them
to the endpoint specified in that file.
"""

import json
import requests
import urllib3
from pathlib import Path

# Disable SSL warnings (if needed)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def load_payloads():
    """Load payloads from the JSON file."""
    payload_file = Path(__file__).parent / 'S0019_basket_payloads.json'
    with open(payload_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def submit_basket(endpoint, lego_id, payload, verify_ssl=True):
    """Submit a single basket payload to the endpoint."""
    try:
        response = requests.post(
            endpoint,
            json=payload,
            verify=verify_ssl,
            timeout=30
        )

        if response.status_code == 200:
            print(f"✓ {lego_id} - SUCCESS (200)")
            try:
                result = response.json()
                print(f"  Response: {json.dumps(result, indent=2, ensure_ascii=False)}")
            except:
                print(f"  Response: {response.text[:200]}")
        else:
            print(f"✗ {lego_id} - FAILED ({response.status_code})")
            print(f"  Response: {response.text[:200]}")

        return response.status_code == 200

    except requests.exceptions.SSLError as e:
        print(f"✗ {lego_id} - SSL ERROR")
        print(f"  {e}")
        print(f"  Retrying with SSL verification disabled...")
        return submit_basket(endpoint, lego_id, payload, verify_ssl=False)

    except Exception as e:
        print(f"✗ {lego_id} - ERROR: {type(e).__name__}")
        print(f"  {e}")
        return False

def main():
    """Main function to submit all baskets."""
    print("Loading payloads from S0019_basket_payloads.json...")
    data = load_payloads()

    endpoint = data['endpoint']
    payloads = data['payloads']

    print(f"\nEndpoint: {endpoint}")
    print(f"Total LEGOs to submit: {len(payloads)}\n")

    results = {}

    for lego_id, payload in payloads.items():
        print(f"Submitting {lego_id}...")
        success = submit_basket(endpoint, lego_id, payload)
        results[lego_id] = success
        print()

    # Summary
    print("=" * 60)
    print("SUBMISSION SUMMARY")
    print("=" * 60)

    successful = [k for k, v in results.items() if v]
    failed = [k for k, v in results.items() if not v]

    print(f"Successful: {len(successful)}/{len(results)}")
    if successful:
        for lego_id in successful:
            print(f"  ✓ {lego_id}")

    print(f"\nFailed: {len(failed)}/{len(results)}")
    if failed:
        for lego_id in failed:
            print(f"  ✗ {lego_id}")

    return len(failed) == 0

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
