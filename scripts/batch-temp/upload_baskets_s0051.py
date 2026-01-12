#!/usr/bin/env python3
"""
Upload baskets for S0051L03 and S0051L04 to the endpoint
With retry logic and error handling
"""

import json
import time
import requests
import urllib3
from pathlib import Path

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket'
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

def upload_basket(basket_path, lego_id, attempt=1):
    """Upload a single basket with error handling"""
    with open(basket_path, 'r') as f:
        basket_data = json.load(f)
    
    headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
    }
    
    try:
        response = requests.post(
            ENDPOINT,
            json=basket_data,
            headers=headers,
            verify=False,  # Disable SSL verification for ngrok
            timeout=30
        )
        
        if response.status_code >= 200 and response.status_code < 300:
            print(f'✓ {lego_id} uploaded successfully (attempt {attempt})')
            print(f'  Response: {response.text}')
            return True, response.text
        else:
            print(f'✗ {lego_id} failed with status {response.status_code} (attempt {attempt})')
            print(f'  Response: {response.text}')
            return False, f'HTTP {response.status_code}: {response.text}'
    
    except Exception as e:
        print(f'✗ {lego_id} request error (attempt {attempt}): {str(e)}')
        return False, str(e)

def upload_with_retry(basket_path, lego_id):
    """Upload with retry logic"""
    for attempt in range(1, MAX_RETRIES + 1):
        success, result = upload_basket(basket_path, lego_id, attempt)
        if success:
            return True, result
        
        if attempt < MAX_RETRIES:
            print(f'  Retrying in {RETRY_DELAY} seconds...')
            time.sleep(RETRY_DELAY)
        else:
            print(f'  Failed after {MAX_RETRIES} attempts')
            return False, result

def main():
    script_dir = Path(__file__).parent
    baskets = [
        {'path': script_dir / 'basket_s0051l03.json', 'id': 'S0051L03'},
        {'path': script_dir / 'basket_s0051l04.json', 'id': 'S0051L04'}
    ]
    
    print('Starting basket uploads...\n')
    
    results = []
    for basket in baskets:
        print(f'Uploading {basket["id"]}...')
        success, result = upload_with_retry(basket['path'], basket['id'])
        results.append({
            'id': basket['id'],
            'success': success,
            'result': result
        })
        print()  # Blank line
    
    # Summary
    print('\n=== UPLOAD SUMMARY ===')
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f'\nSuccessful: {len(successful)}/{len(results)}')
    for r in successful:
        print(f'  ✓ {r["id"]}')
    
    if failed:
        print(f'\nFailed: {len(failed)}/{len(results)}')
        for r in failed:
            print(f'  ✗ {r["id"]}: {r["result"]}')
        exit(1)
    else:
        print('\n✓ All baskets uploaded successfully!')
        exit(0)

if __name__ == '__main__':
    main()
