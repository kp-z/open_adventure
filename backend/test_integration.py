#!/usr/bin/env python3
"""Test frontend-backend integration"""
import requests
import json

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

def test_integration():
    """Test that frontend can communicate with backend"""

    print("=== Testing Frontend-Backend Integration ===\n")

    # 1. Test backend health from frontend perspective
    print("1. Testing Backend Health Check...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/system/health")
        if response.status_code == 200:
            print("   ✅ Backend is accessible")
            print(f"   Response: {json.dumps(response.json(), indent=6)}")
        else:
            print(f"   ❌ Backend returned status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 2. Test CORS (frontend would make this request)
    print("\n2. Testing CORS Configuration...")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/system/health",
            headers={"Origin": FRONTEND_URL}
        )
        if "access-control-allow-origin" in response.headers:
            print("   ✅ CORS is configured")
            print(f"   Allowed Origin: {response.headers.get('access-control-allow-origin')}")
        else:
            print("   ⚠️  CORS headers not found (may need configuration)")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 3. Test data flow: Create -> Read
    print("\n3. Testing Data Flow (Create -> Read)...")
    try:
        # Create a skill
        create_response = requests.post(
            f"{BACKEND_URL}/api/skills",
            json={
                "name": "integration-test-skill",
                "full_name": "Integration Test Skill",
                "description": "Testing frontend-backend integration",
                "type": "command",
                "source": "global"
            }
        )

        if create_response.status_code == 201:
            skill_id = create_response.json()["id"]
            print(f"   ✅ Created skill with ID: {skill_id}")

            # Read the skill
            read_response = requests.get(f"{BACKEND_URL}/api/skills/{skill_id}")
            if read_response.status_code == 200:
                skill = read_response.json()
                print(f"   ✅ Retrieved skill: {skill['name']}")

                # Delete the skill
                delete_response = requests.delete(f"{BACKEND_URL}/api/skills/{skill_id}")
                if delete_response.status_code == 204:
                    print(f"   ✅ Deleted skill successfully")
                else:
                    print(f"   ⚠️  Delete returned status {delete_response.status_code}")
            else:
                print(f"   ❌ Failed to read skill: {read_response.status_code}")
        else:
            print(f"   ❌ Failed to create skill: {create_response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 4. Test authentication flow
    print("\n4. Testing Authentication Flow...")
    try:
        # Login
        login_response = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            data={
                "username": "testuser",
                "password": "test123456"
            }
        )

        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            print("   ✅ Login successful")

            # Get current user
            me_response = requests.get(
                f"{BACKEND_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )

            if me_response.status_code == 200:
                user = me_response.json()
                print(f"   ✅ Retrieved user: {user['username']}")
            else:
                print(f"   ❌ Failed to get user: {me_response.status_code}")
        else:
            print(f"   ❌ Login failed: {login_response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print("\n" + "="*50)
    print("Integration testing complete!")

if __name__ == "__main__":
    test_integration()
