#!/bin/bash

echo "--- D. Testing OpenAI WITH Tools ---"
curl -s -X POST https://text.pollinations.ai/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai",
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

echo "--- E. Testing Gemini WITH Tools & CamelCase toolConfig ---"
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
    "toolConfig": { "googleSearchRetrieval": { "disable": true } }
  }' | head -n 20
echo -e "\n"
