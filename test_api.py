
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health Check - Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Health endpoint working")
            return True
        else:
            print("❌ Health endpoint failed")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server not running - start the server first")
        return False

def test_summarization():
    """Test summarization endpoint"""
    try:
        data = {
            "text": "This is a test text for summarization. It contains multiple sentences to verify that the summarization service is working correctly. The service should return a shorter version of this text.",
            "options": {
                "max_length": 100,
                "style": "concise"
            }
        }
        response = requests.post(f"{BASE_URL}/api/summarize", json=data)
        print(f"Summarization - Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Summarization endpoint working")
            return True
        else:
            print("❌ Summarization endpoint failed")
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Summarization test failed: {e}")
        return False

def test_learning_path():
    """Test learning path endpoint"""
    try:
        data = {
            "goal": "Learn web development",
            "experience": "beginner",
            "time_commitment": "10 hours/week",
            "learning_style": "hands-on"
        }
        response = requests.post(f"{BASE_URL}/api/learning-path/generate", json=data)
        print(f"Learning Path - Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Learning path endpoint working")
            return True
        else:
            print("❌ Learning path endpoint failed")
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Learning path test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing AI Microservices API Endpoints")
    print("=" * 50)
    
    health_ok = test_health()
    if health_ok:
        summ_ok = test_summarization()
        path_ok = test_learning_path()
        
        if summ_ok and path_ok:
            print("\n🎉 All tests passed! The API is working correctly.")
        else:
            print("\n⚠️ Some endpoints failed. Check the server logs.")
    else:
        print("\n❌ Server is not running. Please start the server with:")
        print("ai-microservices-env\\Scripts\\uvicorn.exe main:app --host 127.0.0.1 --port 8000")
