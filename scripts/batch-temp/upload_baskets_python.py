#!/usr/bin/env python3

import requests
import json
import time

ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket'

# Basket data for S0048L02
basket_s0048l02 = {
    "course": "zho_for_eng",
    "seed": "S0048",
    "baskets": {
        "S0048L02": {
            "lego_id": "S0048L02",
            "practice_phrases": [
                {"known": "I don't care about this", "target": "我不在乎这个"},
                {"known": "You don't care about it", "target": "你不在乎它"},
                {"known": "I don't care about making mistakes now", "target": "我现在不在乎犯错"},
                {"known": "I don't care about practice every day", "target": "我不在乎每天练习"},
                {"known": "I think you don't care about learning Chinese", "target": "我觉得你不在乎学中文"},
                {"known": "I don't care about speaking with you", "target": "我不在乎跟你说"},
                {"known": "I don't care about trying to understand this question", "target": "我不在乎试试理解这个问题"},
                {"known": "Do you understand I don't care about making mistakes now", "target": "你明白我现在不在乎犯错"},
                {"known": "I'm learning and I don't care about saying something wrong", "target": "我在学，我不在乎说一些错的事"},
                {"known": "That's good because I don't care about this every day", "target": "那是好，因为我不在乎每天这个"}
            ]
        }
    }
}

# Basket data for S0049L01
basket_s0049l01 = {
    "course": "zho_for_eng",
    "seed": "S0049",
    "baskets": {
        "S0049L01": {
            "lego_id": "S0049L01",
            "practice_phrases": [
                {"known": "It's like this now", "target": "就是这样现在"},
                {"known": "It's like this every day", "target": "就是这样每天"},
                {"known": "It's like this when I'm learning", "target": "就是这样当我在学"},
                {"known": "It's like this, I need to practice", "target": "就是这样，我需要练习"},
                {"known": "I think it's like this with Chinese", "target": "我觉得就是这样跟中文"},
                {"known": "It's like this, I don't care about mistakes", "target": "就是这样，我不在乎错误"},
                {"known": "Do you understand it's like this when learning", "target": "你明白就是这样当学习"},
                {"known": "That's good, it's like this every day now", "target": "那是好，就是这样每天现在"},
                {"known": "It's like this, I want to speak Chinese with you", "target": "就是这样，我想跟你说中文"},
                {"known": "I know it's like this, I'm trying to learn something", "target": "我知道就是这样，我在尝试学一些事"}
            ]
        }
    }
}

def upload_basket(basket_data, lego_id, max_retries=3):
    """Upload basket with retry logic"""
    headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    }

    for attempt in range(1, max_retries + 1):
        try:
            print(f"\n[{lego_id}] Attempt {attempt}/{max_retries}...")

            response = requests.post(
                ENDPOINT,
                json=basket_data,
                headers=headers,
                timeout=30,
                verify=False  # Skip SSL verification for ngrok
            )

            if response.status_code >= 200 and response.status_code < 300:
                print(f"[{lego_id}] ✓ Success! Status: {response.status_code}")
                print(f"[{lego_id}] Response: {response.text}")
                return True
            else:
                print(f"[{lego_id}] ✗ HTTP {response.status_code}: {response.text}")

        except requests.exceptions.RequestException as e:
            print(f"[{lego_id}] ✗ Attempt {attempt} failed: {str(e)}")

        if attempt < max_retries:
            print(f"[{lego_id}] Waiting 2 seconds before retry...")
            time.sleep(2)

    print(f"[{lego_id}] ✗ All {max_retries} attempts failed")
    return False

def main():
    print("=" * 60)
    print("BASKET UPLOAD: S0048L02 & S0049L01")
    print("=" * 60)

    results = {
        'success': [],
        'failed': []
    }

    # Suppress SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    # Upload S0048L02
    if upload_basket(basket_s0048l02, 'S0048L02'):
        results['success'].append('S0048L02')
    else:
        results['failed'].append('S0048L02')

    # Wait between uploads
    time.sleep(1)

    # Upload S0049L01
    if upload_basket(basket_s0049l01, 'S0049L01'):
        results['success'].append('S0049L01')
    else:
        results['failed'].append('S0049L01')

    # Final report
    print("\n" + "=" * 60)
    print("UPLOAD SUMMARY")
    print("=" * 60)
    print(f"✓ Successful: {len(results['success'])} baskets")
    for lego in results['success']:
        print(f"  - {lego}")

    print(f"✗ Failed: {len(results['failed'])} baskets")
    for lego in results['failed']:
        print(f"  - {lego}")

    print("=" * 60)

    return len(results['failed']) == 0

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
