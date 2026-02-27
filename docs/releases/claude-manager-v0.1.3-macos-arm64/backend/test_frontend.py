#!/usr/bin/env python3
"""Test frontend pages availability"""
import requests

BASE_URL = "http://localhost:3000"

pages = [
    "/",
    "/dashboard",
    "/gamification",
    "/skills",
    "/agents",
    "/teams",
    "/workflows",
    "/workflows/editor",
    "/executions",
    "/auth/login",
    "/auth/register",
    "/auth/profile",
]

def test_page(path):
    """Test if a page is accessible"""
    url = f"{BASE_URL}{path}"
    try:
        response = requests.get(url, timeout=5)
        status = "✅" if response.status_code == 200 else "❌"
        print(f"{status} {path} - Status: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ {path} - Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Frontend Pages\n" + "="*50)

    success_count = 0
    total_count = len(pages)

    for page in pages:
        if test_page(page):
            success_count += 1

    print("\n" + "="*50)
    print(f"Results: {success_count}/{total_count} pages accessible")
    print(f"Success Rate: {success_count/total_count*100:.1f}%")
