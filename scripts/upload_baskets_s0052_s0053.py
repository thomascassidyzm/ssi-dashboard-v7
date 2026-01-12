#!/usr/bin/env python3
"""
Generate and upload practice baskets for S0052L07 and S0053L03
"""

import json
import requests
import time
from typing import List, Dict

# LEGO Data
LEGOS = {
    "S0052L07": {
        "seed_id": "S0052",
        "lego_id": "S0052L07",
        "type": "A",
        "known": "last week",
        "target": "上周",
        "new": True
    },
    "S0053L03": {
        "seed_id": "S0053",
        "lego_id": "S0053L03",
        "type": "A",
        "known": "put",
        "target": "放",
        "new": True
    }
}

# Practice phrases for S0052L07 (last week / 上周)
S0052L07_PHRASES = [
    {"known": "last week", "target": "上周"},
    {"known": "last week", "target": "上周"},
    {"known": "I wanted to speak Chinese last week.", "target": "我上周想说中文。"},
    {"known": "I wanted to speak Chinese last week.", "target": "我上周想说中文。"},
    {"known": "She wanted to help me last week.", "target": "她上周想帮我。"},
    {"known": "She wanted to help me last week.", "target": "她上周想帮我。"},
    {"known": "He wanted to write a letter to his friend last week.", "target": "他上周想给朋友写信。"},
    {"known": "He wanted to write a letter to his friend last week.", "target": "他上周想给朋友写信。"},
    {"known": "He wanted to write a letter to his friend last week.", "target": "他上周想给朋友写信。"},
    {"known": "He wanted to write a letter to his friend last week.", "target": "他上周想给朋友写信。"}
]

# Practice phrases for S0053L03 (put / 放)
S0053L03_PHRASES = [
    {"known": "put", "target": "放"},
    {"known": "put", "target": "放"},
    {"known": "I wanted to put something here.", "target": "我想把东西放在这里。"},
    {"known": "I wanted to put something here.", "target": "我想把东西放在这里。"},
    {"known": "She wanted to put his letter in her bag.", "target": "她想把他的信放在包里。"},
    {"known": "She wanted to put his letter in her bag.", "target": "她想把他的信放在包里。"},
    {"known": "She wanted to put his letter in her bag.", "target": "她想把他的信放在包里。"},
    {"known": "She wanted to put his letter in her bag.", "target": "她想把他的信放在包里。"},
    {"known": "She wanted to put his letter in her bag.", "target": "她想把他的信放在包里。"},
    {"known": "She wanted to put his letter in her bag.", "target": "她想把他的信放在包里。"}
]

def create_basket_payload(seed_id: str, lego_id: str, lego_known: str, lego_target: str, phrases: List[Dict]) -> Dict:
    """Create the basket payload for upload"""
    return {
        "course": "zho_for_eng",
        "seed": seed_id,
        "baskets": {
            lego_id: {
                "lego": {
                    "known": lego_known,
                    "target": lego_target
                },
                "practice_phrases": phrases
            }
        }
    }

def upload_basket(payload: Dict, lego_id: str, max_retries: int = 3) -> bool:
    """Upload basket with retry logic"""
    url = "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
    }

    for attempt in range(max_retries):
        try:
            print(f"\n{'='*60}")
            print(f"Uploading basket for {lego_id}")
            print(f"Attempt {attempt + 1}/{max_retries}")
            print(f"{'='*60}")

            response = requests.post(url, json=payload, headers=headers, timeout=30, verify=False)

            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")

            if response.status_code in [200, 201]:
                print(f"✅ SUCCESS: Basket uploaded successfully")
                return True
            else:
                print(f"⚠️  Failed with status {response.status_code}")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    print(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)

    return False

def main():
    """Main execution"""
    print("="*60)
    print("BASKET UPLOAD SCRIPT - S0052L07 & S0053L03")
    print("="*60)

    # Disable SSL warnings for ngrok
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    results = {}

    # Upload S0052L07
    payload_s0052l07 = create_basket_payload("S0052", "S0052L07", "last week", "上周", S0052L07_PHRASES)
    results["S0052L07"] = upload_basket(payload_s0052l07, "S0052L07")
    time.sleep(1)  # Brief pause between uploads

    # Upload S0053L03
    payload_s0053l03 = create_basket_payload("S0053", "S0053L03", "put", "放", S0053L03_PHRASES)
    results["S0053L03"] = upload_basket(payload_s0053l03, "S0053L03")

    # Summary
    print("\n" + "="*60)
    print("UPLOAD SUMMARY")
    print("="*60)
    for lego_id, success in results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{lego_id}: {status}")

    all_success = all(results.values())
    print("\n" + "="*60)
    if all_success:
        print("🎉 ALL BASKETS UPLOADED SUCCESSFULLY")
    else:
        print("⚠️  SOME BASKETS FAILED - CHECK LOGS ABOVE")
    print("="*60)

    return 0 if all_success else 1

if __name__ == "__main__":
    exit(main())
