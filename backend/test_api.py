#!/usr/bin/env python3
"""Test API endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_register():
    """Test user registration"""
    url = f"{BASE_URL}/api/auth/register"
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "test123456",
        "full_name": "Test User"
    }

    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

def test_health():
    """Test health endpoint"""
    url = f"{BASE_URL}/api/system/health"
    try:
        response = requests.get(url)
        print(f"Health Check - Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("=== Testing Health Endpoint ===")
    test_health()
    print("\n=== Testing Register Endpoint ===")
    test_register()
