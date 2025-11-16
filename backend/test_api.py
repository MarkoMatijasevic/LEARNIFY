#!/usr/bin/env python3
"""
Learnify AI - API Testing Script
Run this script to test all authentication endpoints
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.refresh_token = None
        
    def log_request(self, method, url, data=None, headers=None):
        """Log API request details"""
        print(f"\n{'='*60}")
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {method} {url}")
        if data and 'password' in str(data):
            # Hide passwords in logs
            safe_data = {k: '***' if 'password' in k else v for k, v in data.items()}
            print(f"Data: {json.dumps(safe_data, indent=2)}")
        elif data:
            print(f"Data: {json.dumps(data, indent=2)}")
        if headers:
            print(f"Headers: {json.dumps(headers, indent=2)}")
        print("="*60)
        
    def log_response(self, response):
        """Log API response details"""
        print(f"Status: {response.status_code}")
        try:
            response_data = response.json()
            # Hide sensitive data in logs
            if 'access' in response_data:
                response_data['access'] = f"{response_data['access'][:20]}..."
            if 'refresh' in response_data:
                response_data['refresh'] = f"{response_data['refresh'][:20]}..."
            print(f"Response: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response: {response.text}")
        
    def test_health_check(self):
        """Test API health check"""
        print("\n🔍 Testing API Health Check...")
        url = f"{BASE_URL}/health/"
        
        self.log_request("GET", url)
        try:
            response = self.session.get(url, timeout=10)
            self.log_response(response)
            return response.status_code == 200
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_user_health_check(self):
        """Test User service health check"""
        print("\n🔍 Testing User Service Health Check...")
        url = f"{BASE_URL}/users/health/"
        
        self.log_request("GET", url)
        try:
            response = self.session.get(url, timeout=10)
            self.log_response(response)
            return response.status_code == 200
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_user_registration(self, email="testuser@learnify.ai", password="testpass123", first_name="Test", last_name="User"):
        """Test user registration"""
        print("\n📝 Testing User Registration...")
        url = f"{BASE_URL}/users/register/"
        
        data = {
            "email": email,
            "password": password,
            "password_confirm": password,
            "first_name": first_name,
            "last_name": last_name,
            "learning_goals": "Learn AI and machine learning",
            "preferred_study_time": 45,
            "email_notifications": True
        }
        
        self.log_request("POST", url, data)
        try:
            response = self.session.post(url, json=data, timeout=10)
            self.log_response(response)
            
            if response.status_code == 201:
                response_data = response.json()
                self.access_token = response_data.get('access')
                self.refresh_token = response_data.get('refresh')
                print("✅ Registration successful - tokens saved!")
                return True
            elif response.status_code == 400:
                error_data = response.json()
                if 'email' in error_data and 'already exists' in str(error_data['email']):
                    print("ℹ️ User already exists - will try login instead")
                    return self.test_user_login(email, password)
                return False
            return False
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_user_login(self, email="testuser@learnify.ai", password="testpass123"):
        """Test user login"""
        print("\n🔑 Testing User Login...")
        url = f"{BASE_URL}/users/login/"
        
        data = {
            "email": email,
            "password": password
        }
        
        self.log_request("POST", url, data)
        try:
            response = self.session.post(url, json=data, timeout=10)
            self.log_response(response)
            
            if response.status_code == 200:
                response_data = response.json()
                self.access_token = response_data.get('access')
                self.refresh_token = response_data.get('refresh')
                print("✅ Login successful - tokens saved!")
                return True
            return False
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_user_profile(self):
        """Test getting user profile"""
        if not self.access_token:
            print("❌ No access token available. Please login first.")
            return False
            
        print("\n👤 Testing User Profile...")
        url = f"{BASE_URL}/users/profile/"
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        self.log_request("GET", url, headers=headers)
        try:
            response = self.session.get(url, headers=headers, timeout=10)
            self.log_response(response)
            return response.status_code == 200
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        if not self.access_token:
            print("❌ No access token available. Please login first.")
            return False
            
        print("\n📊 Testing Dashboard Stats...")
        url = f"{BASE_URL}/users/dashboard/stats/"
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        self.log_request("GET", url, headers=headers)
        try:
            response = self.session.get(url, headers=headers, timeout=10)
            self.log_response(response)
            return response.status_code == 200
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_profile_update(self):
        """Test profile update"""
        if not self.access_token:
            print("❌ No access token available. Please login first.")
            return False
            
        print("\n✏️ Testing Profile Update...")
        url = f"{BASE_URL}/users/profile/update/"
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        data = {
            "bio": "Updated bio - I love learning with AI!",
            "learning_goals": "Master Django and React development",
            "preferred_study_time": 60
        }
        
        self.log_request("PUT", url, data, headers)
        try:
            response = self.session.put(url, json=data, headers=headers, timeout=10)
            self.log_response(response)
            return response.status_code == 200
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_token_refresh(self):
        """Test token refresh"""
        if not self.refresh_token:
            print("❌ No refresh token available. Please login first.")
            return False
            
        print("\n🔄 Testing Token Refresh...")
        url = f"{BASE_URL}/users/token/refresh/"
        
        data = {"refresh": self.refresh_token}
        
        self.log_request("POST", url, data)
        try:
            response = self.session.post(url, json=data, timeout=10)
            self.log_response(response)
            
            if response.status_code == 200:
                response_data = response.json()
                self.access_token = response_data.get('access')
                print("✅ Token refresh successful - new access token saved!")
                return True
            return False
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def test_user_logout(self):
        """Test user logout"""
        if not self.refresh_token:
            print("❌ No refresh token available. Please login first.")
            return False
            
        print("\n🚪 Testing User Logout...")
        url = f"{BASE_URL}/users/logout/"
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        data = {"refresh_token": self.refresh_token}
        
        self.log_request("POST", url, data, headers)
        try:
            response = self.session.post(url, json=data, headers=headers, timeout=10)
            self.log_response(response)
            return response.status_code == 200
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return False
        
    def run_complete_test(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Learnify AI API Testing...")
        print("=" * 70)
        
        results = {}
        
        # Test health checks first
        print("\n📋 PHASE 1: Health Checks")
        results['api_health'] = self.test_health_check()
        results['user_health'] = self.test_user_health_check()
        
        if not any([results['api_health'], results['user_health']]):
            print("\n❌ CRITICAL: API is not responding. Check if Django server is running!")
            print("Run: python manage.py runserver")
            return
        
        # Test authentication flow
        print("\n📋 PHASE 2: Authentication")
        results['registration'] = self.test_user_registration()
        
        # If registration failed, try login directly
        if not results['registration']:
            results['login'] = self.test_user_login()
        else:
            results['login'] = True  # Registration includes login
        
        # Test authenticated endpoints
        if results.get('login', False):
            print("\n📋 PHASE 3: Authenticated Endpoints")
            results['profile'] = self.test_user_profile()
            results['dashboard'] = self.test_dashboard_stats()
            results['profile_update'] = self.test_profile_update()
            results['token_refresh'] = self.test_token_refresh()
            results['logout'] = self.test_user_logout()
        else:
            print("\n❌ Skipping authenticated tests due to login failure")
            
        # Summary
        print("\n" + "=" * 70)
        print("📋 TEST RESULTS SUMMARY")
        print("=" * 70)
        
        for test_name, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            test_display = test_name.replace('_', ' ').title()
            print(f"{test_display:<20}: {status}")
            
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result)
        
        print(f"\n📊 Overall Results: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! Your authentication API is working perfectly!")
        elif passed_tests >= total_tests * 0.7:
            print("⚠️ Most tests passed. Check failed tests above.")
        else:
            print("❌ Several tests failed. Check Django server logs for errors.")
            
        print("\n💡 Next steps:")
        print("- If tests passed: Create Documents and Chat models")
        print("- If tests failed: Check Django server console for error details")

if __name__ == "__main__":
    print("🔧 Learnify AI API Test Suite")
    print("=" * 50)
    print("Make sure your Django server is running on localhost:8000")
    print("Command: python manage.py runserver")
    
    try:
        input("\nPress Enter when server is ready...")
    except KeyboardInterrupt:
        print("\n👋 Test cancelled.")
        exit()
    
    tester = APITester()
    tester.run_complete_test()