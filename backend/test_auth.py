#!/usr/bin/env python3
"""Test authentication API endpoints"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_login():
    """Test user login"""
    url = f"{BASE_URL}/api/auth/login"
    data = {
        "username": "testuser",
        "password": "test123456"
    }

    try:
        response = requests.post(url, data=data)
        print(f"Login - Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(json.dumps(result, indent=2))
            return result.get("access_token")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    return None

def test_get_me(token):
    """Test get current user"""
    url = f"{BASE_URL}/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers)
        print(f"Get Me - Status: {response.status_code}")
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_update_me(token):
    """Test update current user"""
    url = f"{BASE_URL}/api/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "full_name": "Updated Test User",
        "email": "updated@example.com"
    }

    try:
        response = requests.put(url, headers=headers, json=data)
        print(f"Update Me - Status: {response.status_code}")
        if response.status_code == 200:
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("=== Testing Login ===")
    token = test_login()

    if token:
        print("\n=== Testing Get Current User ===")
        test_get_me(token)

        print("\n=== Testing Update Current User ===")
        test_update_me(token)

        print("\n=== Testing Get Current User Again ===")
        test_get_me(token)
