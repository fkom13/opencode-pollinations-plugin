#!/bin/bash

echo "--- A. Testing Gemini WITH Tools & WITH tools_config (The Current Fix) ---"
curl -s -X POST https://text.pollinations.ai/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "What time is it?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_time",
        "description": "Get current time",
        "parameters": {"type": "object", "properties": {}}
      }
    }],
    "tools_config": { "google_search_retrieval": { "disable": true } }
  }' | head -n 20
echo -e "\n\n"

echo "--- B. Testing Gemini WITH Tools & WITHOUT tools_config (The Old Behavior) ---"
curl -s -X POST https://text.pollinations.ai/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "What time is it?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_time",
        "description": "Get current time",
        "parameters": {"type": "object", "properties": {}}
      }
    }]
  }' | head -n 20
echo -e "\n\n"

echo "--- C. Testing Gemini WITHOUT Tools (Baseline) ---"
curl -s -X POST https://text.pollinations.ai/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Hello"}]
  }' | head -n 20
echo -e "\n"
