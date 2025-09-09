#!/usr/bin/env python3
"""
Simple test script to verify Grok API integration
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.llm_client import ask_grok_system

def test_grok():
    # Test with a simple prompt
    api_key = input("Enter your Grok API key: ").strip()
    if not api_key:
        print("No API key provided, skipping test")
        return
    
    try:
        result = ask_grok_system(
            api_key=api_key,
            system_prompt="You are a helpful assistant.",
            user_prompt="What are nanofluids?",
            temperature=0.2,
            max_tokens=100
        )
        print("✅ Grok API test successful!")
        print(f"Response: {result}")
    except Exception as e:
        print(f"❌ Grok API test failed: {e}")

if __name__ == "__main__":
    test_grok()
