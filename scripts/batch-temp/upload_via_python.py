#!/usr/bin/env python3
"""
Upload baskets using Python requests library (may handle TLS differently than curl)
"""

import json
import requests
import urllib3

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_URL = "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket"
HEADERS = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
}

def upload_basket(basket_file, lego_id):
    """Upload a single basket with retry logic"""
    with open(basket_file, 'r') as f:
        data = json.load(f)

    print(f"\n📤 Uploading {lego_id}...")
    print(f"   Seed: {data['seed']}")
    print(f"   Phrases: {len(data['baskets'][lego_id]['practice_phrases'])}")

    try:
        response = requests.post(
            API_URL,
            json=data,
            headers=HEADERS,
            verify=False,  # Skip SSL verification
            timeout=30
        )

        print(f"✅ Status Code: {response.status_code}")

        if response.status_code in [200, 201, 204]:
            print(f"✅ Upload successful!")
            if response.text:
                print(f"   Response: {response.text}")
            return True
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    print("🚀 Starting basket upload via Python...\n")

    results = {
        "success": [],
        "failed": []
    }

    # Upload S0045L04
    if upload_basket('/tmp/s0045_basket.json', 'S0045L04'):
        results["success"].append('S0045L04')
    else:
        results["failed"].append('S0045L04')

    # Upload S0046L02
    if upload_basket('/tmp/s0046_basket.json', 'S0046L02'):
        results["success"].append('S0046L02')
    else:
        results["failed"].append('S0046L02')

    # Summary
    print("\n" + "="*60)
    print("📊 UPLOAD SUMMARY")
    print("="*60)
    print(f"✅ Successful: {len(results['success'])}")
    for lego in results['success']:
        print(f"   - {lego}")

    if results['failed']:
        print(f"\n❌ Failed: {len(results['failed'])}")
        for lego in results['failed']:
            print(f"   - {lego}")
    else:
        print("\n🎉 All baskets uploaded successfully!")

if __name__ == "__main__":
    main()
