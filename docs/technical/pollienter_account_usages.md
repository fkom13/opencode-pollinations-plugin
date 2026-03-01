get/account/profile
Shell Curl
curl https://gen.pollinations.ai/account/profile \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'


Test Request
(get /account/profile)
Status:200
{
  "type": "object",
  "properties": {
    "name": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "User's display name"
    },
    "email": {
      "anyOf": [
        {
          "type": "string",
          "format": "email",
          "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
        },
        {
          "type": "null"
        }
      ],
      "description": "User's email address"
    },
    "githubUsername": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "GitHub username if linked"
    },
    "image": {
      "anyOf": [
        {
          "type": "string"
        },
        {
          "type": "null"
        }
      ],
      "description": "Profile picture URL (e.g. GitHub avatar)"
    },
    "tier": {
      "type": "string",
      "enum": [
        "anonymous",
        "microbe",
        "spore",
        "seed",
        "flower",
        "nectar",
        "router"
      ],
      "description": "User's current tier level"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      "description": "Account creation timestamp (ISO 8601)"
    },
    "nextResetAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$"
        },
        {
          "type": "null"
        }
      ],
      "description": "Next daily pollen reset timestamp (ISO 8601)"
    }
  },
  "required": [
    "name",
    "email",
    "githubUsername",
    "image",
    "tier",
    "createdAt",
    "nextResetAt"
  ]
}

JSONCopy
JSONCopy
User profile with name, email, githubUsername, tier, createdAt, nextResetAt



get/account/balance
Shell Curl
curl https://gen.pollinations.ai/account/balance \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

cURLCopy
cURLCopy

Test Request
(get /account/balance)
Status:200
{
  "type": "object",
  "properties": {
    "balance": {
      "type": "number",
      "description": "Remaining pollen balance (combines tier, pack, and crypto balances)"
    }
  },
  "required": [
    "balance"
  ]
}

Balance (remaining pollen)



et/account/usage
Shell Curl
curl https://gen.pollinations.ai/account/usage \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'


Test Request
(get /account/usage)
Status:200
{
  "type": "object",
  "properties": {
    "usage": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string",
            "description": "Request timestamp (YYYY-MM-DD HH:mm:ss format)"
          },
          "type": {
            "type": "string",
            "description": "Request type (e.g., 'generate.image', 'generate.text')"
          },
          "model": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "description": "Model used for generation"
          },
          "api_key": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "description": "API key identifier used (masked)"
          },
          "api_key_type": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "description": "Type of API key ('secret', 'publishable')"
          },
          "meter_source": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "description": "Billing source ('tier', 'pack', 'crypto')"
          },
          "input_text_tokens": {
            "type": "number",
            "description": "Number of input text tokens"
          },
          "input_cached_tokens": {
            "type": "number",
            "description": "Number of cached input tokens"
          },
          "input_audio_tokens": {
            "type": "number",
            "description": "Number of input audio tokens"
          },
          "input_image_tokens": {
            "type": "number",
            "description": "Number of input image tokens"
          },
          "output_text_tokens": {
            "type": "number",
            "description": "Number of output text tokens"
          },
          "output_reasoning_tokens": {
            "type": "number",
            "description": "Number of reasoning tokens (for models with chain-of-thought)"
          },
          "output_audio_tokens": {
            "type": "number",
            "description": "Number of output audio tokens"
          },
          "output_image_tokens": {
            "type": "number",
            "description": "Number of output image tokens (1 per image)"
          },
          "cost_usd": {
            "type": "number",
            "description": "Cost in USD for this request"
          },
          "response_time_ms": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "description": "Response time in milliseconds"
          }
        },
        "required": [
          "timestamp",
          "type",
          "model",
          "api_key",
          "api_key_type",
          "meter_source",
          "input_text_tokens",
          "input_cached_tokens",
          "input_audio_tokens",
          "input_image_tokens",
          "output_text_tokens",
          "output_reasoning_tokens",
          "output_audio_tokens",
          "output_image_tokens",
          "cost_usd",
          "response_time_ms"
        ]
      },
      "description": "Array of usage records"
    },
    "count": {
      "type": "number",
      "description": "Number of records returned"
    }
  },
  "required": [
    "usage",
    "count"
  ]
}

JSONCopy
JSONCopy
Usage records with timestamp, model, tokens, cost_usd, etc.



get/account/usage/daily
Shell Curl
curl https://gen.pollinations.ai/account/usage/daily \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

cURLCopy
cURLCopy

Test Request
(get /account/usage/daily)
Status:200
{
  "type": "object",
  "properties": {
    "usage": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "description": "Date (YYYY-MM-DD format)"
          },
          "model": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "description": "Model used"
          },
          "meter_source": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "description": "Billing source ('tier', 'pack', 'crypto')"
          },
          "requests": {
            "type": "number",
            "description": "Number of requests"
          },
          "cost_usd": {
            "type": "number",
            "description": "Total cost in USD"
          }
        },
        "required": [
          "date",
          "model",
          "meter_source",
          "requests",
          "cost_usd"
        ]
      },
      "description": "Array of daily usage records"
    },
    "count": {
      "type": "number",
      "description": "Number of records returned"
    }
  },
  "required": [
    "usage",
    "count"
  ]
}

Daily usage records aggregated by date/model
