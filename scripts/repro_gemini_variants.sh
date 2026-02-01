#!/bin/bash

TEST_JSON='{
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
}'

echo "--- F. Testing gemini-thinking WITH Tools ---"
curl -s -X POST https://text.pollinations.ai/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d "$(echo "$TEST_JSON" | jq '.model = "gemini-thinking"')" | head -n 20
echo -e "\n\n"

echo "--- G. Testing gemini-1.5-flash WITH Tools ---"
curl -s -X POST https://text.pollinations.ai/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d "$(echo "$TEST_JSON" | jq '.model = "gemini-1.5-flash"')" | head -n 20
echo -e "\n\n"

echo "--- H. Testing gemini-1.5-pro WITH Tools ---"
curl -s -X POST https://text.pollinations.ai/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d "$(echo "$TEST_JSON" | jq '.model = "gemini-1.5-pro"')" | head -n 20
echo -e "\n"
