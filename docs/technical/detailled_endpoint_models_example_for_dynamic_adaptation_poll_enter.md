# detailled endpoints for models

## general list (ne renvoit que des id et des timestamp de création)

curl https://gen.pollinations.ai/v1/models \
  --header 'Authorization: Bearer sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H' \
  | jq

## text models
curl https://gen.pollinations.ai/text/models \
  --header 'Authorization: Bearer sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H' \
  | jq
  
## image et video models

curl https://gen.pollinations.ai/image/models \
  --header 'Authorization: Bearer sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H' \
  | jq
  
## audio models
  
curl https://gen.pollinations.ai/audio/models \
  --header 'Authorization: Bearer sk_eZbhgG1oJaaqSZKMvmy8nfVH9NNAGp0H' \
  | jq
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1547  100  1547    0     0   4830      0 --:--:-- --:--:-- --:--:--  4834
{
  "object": "list",
  "data": [
    {
      "id": "openai",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "openai-fast",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "openai-large",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "qwen-coder",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "mistral",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "openai-audio",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "gemini",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "gemini-fast",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "deepseek",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "grok",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "gemini-search",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "chickytutor",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "midijourney",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "claude-fast",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "claude",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "claude-large",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "perplexity-fast",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "perplexity-reasoning",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "kimi",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "gemini-large",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "nova-fast",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "glm",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "minimax",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "qwen-safety",
      "object": "model",
      "created": 1771442095813
    },
    {
      "id": "qwen-character",
      "object": "model",
      "created": 1771442095813
    }
  ]
}
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  9137  100  9137    0     0  33276      0 --:--:-- --:--:-- --:--:-- 33225
[
  {
    "name": "openai",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 1.5E-7,
      "promptCachedTokens": 4E-8,
      "completionTextTokens": 6E-7
    },
    "description": "OpenAI GPT-5 Mini - Fast & Balanced",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false
  },
  {
    "name": "openai-fast",
    "aliases": [
      "gpt-5-nano",
      "gpt-5-nano-2025-08-07"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 6E-8,
      "promptCachedTokens": 1E-8,
      "completionTextTokens": 4.4E-7
    },
    "description": "OpenAI GPT-5 Nano - Ultra Fast & Affordable",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false
  },
  {
    "name": "openai-large",
    "aliases": [
      "gpt-5.2",
      "openai-reasoning",
      "gpt-5.2-reasoning"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.00000175,
      "promptCachedTokens": 1.75E-7,
      "completionTextTokens": 0.000014
    },
    "description": "OpenAI GPT-5.2 - Most Powerful & Intelligent",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "reasoning": true,
    "is_specialized": false
  },
  {
    "name": "qwen-coder",
    "aliases": [
      "qwen3-coder",
      "qwen3-coder-30b-a3b-instruct"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 6E-8,
      "completionTextTokens": 2.2E-7
    },
    "description": "Qwen3 Coder 30B - Specialized for Code Generation",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false
  },
  {
    "name": "mistral",
    "aliases": [
      "mistral-small",
      "mistral-small-3.2",
      "mistral-small-3.2-24b-instruct-2506"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 1.0000000000000001E-7,
      "completionTextTokens": 3E-7
    },
    "description": "Mistral Small 3.2 24B - Efficient & Cost-Effective",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false
  },
  {
    "name": "openai-audio",
    "aliases": [
      "gpt-4o-mini-audio-preview",
      "gpt-4o-mini-audio-preview-2024-12-17"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 1.65E-7,
      "completionTextTokens": 6.6E-7,
      "promptAudioTokens": 0.000011,
      "completionAudioTokens": 0.000022
    },
    "description": "OpenAI GPT-4o Mini Audio - Voice Input & Output",
    "input_modalities": [
      "text",
      "image",
      "audio"
    ],
    "output_modalities": [
      "audio",
      "text"
    ],
    "tools": true,
    "voices": [
      "alloy",
      "echo",
      "fable",
      "onyx",
      "nova",
      "shimmer",
      "coral",
      "verse",
      "ballad",
      "ash",
      "sage",
      "amuch",
      "dan"
    ],
    "is_specialized": false
  },
  {
    "name": "gemini",
    "aliases": [
      "gemini-3-flash",
      "gemini-3-flash-preview"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 5E-7,
      "promptCachedTokens": 5.0000000000000004E-8,
      "promptAudioTokens": 5E-7,
      "completionTextTokens": 0.000003
    },
    "description": "Google Gemini 3 Flash - Pro-Grade Reasoning at Flash Speed",
    "input_modalities": [
      "text",
      "image",
      "audio",
      "video"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false,
    "paid_only": true
  },
  {
    "name": "gemini-fast",
    "aliases": [
      "gemini-2.5-flash-lite"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 1.0000000000000001E-7,
      "promptCachedTokens": 1E-8,
      "promptAudioTokens": 1.0000000000000001E-7,
      "completionTextTokens": 4.0000000000000003E-7
    },
    "description": "Google Gemini 2.5 Flash Lite - Ultra Fast & Cost-Effective",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false
  },
  {
    "name": "deepseek",
    "aliases": [
      "deepseek-v3",
      "deepseek-reasoning"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 5.6E-7,
      "promptCachedTokens": 2.8E-7,
      "completionTextTokens": 0.00000168
    },
    "description": "DeepSeek V3.2 - Efficient Reasoning & Agentic AI",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "reasoning": true,
    "is_specialized": false
  },
  {
    "name": "grok",
    "aliases": [
      "grok-fast",
      "grok-4",
      "grok-4-fast"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 2.0000000000000002E-7,
      "promptCachedTokens": 2.0000000000000002E-7,
      "completionTextTokens": 5E-7
    },
    "description": "xAI Grok 4 Fast - High Speed & Real-Time",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false,
    "paid_only": true
  },
  {
    "name": "gemini-search",
    "aliases": [
      "gemini-2.5-flash-search",
      "gemini-2.5-flash-lite-search"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 1.0000000000000001E-7,
      "promptCachedTokens": 1E-8,
      "promptAudioTokens": 1.0000000000000001E-7,
      "completionTextTokens": 4.0000000000000003E-7
    },
    "description": "Google Gemini 2.5 Flash Lite - With Google Search",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": false,
    "is_specialized": false
  },
  {
    "name": "chickytutor",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 8.000000000000001E-7,
      "completionTextTokens": 0.000004
    },
    "description": "ChickyTutor AI Language Tutor - (chickytutor.com)",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": true
  },
  {
    "name": "midijourney",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.0000022,
      "promptCachedTokens": 5.5E-7,
      "completionTextTokens": 0.0000088
    },
    "description": "MIDIjourney - AI Music Composition Assistant",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": true
  },
  {
    "name": "claude-fast",
    "aliases": [
      "claude-haiku-4.5",
      "claude-haiku"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000001,
      "completionTextTokens": 0.000005
    },
    "description": "Anthropic Claude Haiku 4.5 - Fast & Intelligent",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false
  },
  {
    "name": "claude",
    "aliases": [
      "claude-sonnet-4.5",
      "claude-sonnet"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000003,
      "completionTextTokens": 0.000015
    },
    "description": "Anthropic Claude Sonnet 4.5 - Most Capable & Balanced",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false,
    "paid_only": true
  },
  {
    "name": "claude-large",
    "aliases": [
      "claude-opus-4.6",
      "claude-opus"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000005,
      "completionTextTokens": 0.000025
    },
    "description": "Anthropic Claude Opus 4.6 - Most Intelligent Model",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false,
    "paid_only": true
  },
  {
    "name": "perplexity-fast",
    "aliases": [
      "sonar"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000001,
      "completionTextTokens": 0.000001
    },
    "description": "Perplexity Sonar - Fast & Affordable with Web Search",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": false,
    "is_specialized": false
  },
  {
    "name": "perplexity-reasoning",
    "aliases": [
      "sonar-reasoning",
      "sonar-reasoning-pro"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000002,
      "completionTextTokens": 0.000008
    },
    "description": "Perplexity Sonar Reasoning - Advanced Reasoning with Web Search",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": false,
    "reasoning": true,
    "is_specialized": false
  },
  {
    "name": "kimi",
    "aliases": [
      "kimi-k2.5",
      "kimi-k2p5",
      "kimi-reasoning",
      "kimi-large"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 6E-7,
      "promptCachedTokens": 1.0000000000000001E-7,
      "completionTextTokens": 0.000003
    },
    "description": "Moonshot Kimi K2.5 - Flagship Agentic Model with Vision & Multi-Agent",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "reasoning": true,
    "context_window": 256000,
    "is_specialized": false
  },
  {
    "name": "gemini-large",
    "aliases": [
      "gemini-3-pro",
      "gemini-3",
      "gemini-3-pro-preview"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000002,
      "promptCachedTokens": 2.0000000000000002E-7,
      "completionTextTokens": 0.000012
    },
    "description": "Google Gemini 3 Pro - Most Intelligent Model with 1M Context (Preview)",
    "input_modalities": [
      "text",
      "image",
      "audio",
      "video"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "reasoning": true,
    "is_specialized": false,
    "paid_only": true
  },
  {
    "name": "nova-fast",
    "aliases": [
      "amazon-nova-micro",
      "nova",
      "nova-micro"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 3.5E-8,
      "completionTextTokens": 1.4E-7
    },
    "description": "Amazon Nova Micro - Ultra Fast & Ultra Cheap",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "is_specialized": false
  },
  {
    "name": "glm",
    "aliases": [
      "glm-5",
      "glm-4.7",
      "glm-4p7"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 6E-7,
      "promptCachedTokens": 3E-7,
      "completionTextTokens": 0.0000022
    },
    "description": "Z.ai GLM-5 - 744B MoE, Long Context Reasoning & Agentic Workflows",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "reasoning": true,
    "context_window": 198000,
    "is_specialized": false
  },
  {
    "name": "minimax",
    "aliases": [
      "minimax-m2.1",
      "minimax-m2p1"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 3E-7,
      "promptCachedTokens": 1.5E-7,
      "completionTextTokens": 0.0000012
    },
    "description": "MiniMax M2.1 - Multi-Language & Agent Workflows",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "tools": true,
    "reasoning": true,
    "context_window": 200000,
    "is_specialized": false
  },
  {
    "name": "qwen-safety",
    "aliases": [
      "qwen3guard-gen-8b"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 1E-8,
      "completionTextTokens": 1E-8
    },
    "description": "Qwen3Guard 8B - Content Safety & Moderation (OVH)",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "is_specialized": true
  },
  {
    "name": "qwen-character",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 1E-8,
      "completionTextTokens": 1E-8
    },
    "description": "Qwen Character (api.airforce) - roleplay & character chat",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "text"
    ],
    "is_specialized": true
  }
]
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  4927  100  4927    0     0  18234      0 --:--:-- --:--:-- --:--:-- 18248
[
  {
    "name": "kontext",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.04
    },
    "description": "FLUX.1 Kontext - In-context editing & generation",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ],
    "paid_only": true
  },
  {
    "name": "nanobanana",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 3E-7,
      "promptImageTokens": 3E-7,
      "completionImageTokens": 0.00003
    },
    "description": "NanoBanana - Gemini 2.5 Flash Image",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ],
    "paid_only": true
  },
  {
    "name": "nanobanana-pro",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.00000125,
      "promptImageTokens": 0.00000125,
      "completionImageTokens": 0.00012
    },
    "description": "NanoBanana Pro - Gemini 3 Pro Image (4K, Thinking)",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ],
    "paid_only": true
  },
  {
    "name": "seedream",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.03
    },
    "description": "Seedream 4.0 - ByteDance ARK (better quality)",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ],
    "paid_only": true
  },
  {
    "name": "seedream-pro",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.04
    },
    "description": "Seedream 4.5 Pro - ByteDance ARK (4K, Multi-Image)",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ],
    "paid_only": true
  },
  {
    "name": "gptimage",
    "aliases": [
      "gpt-image",
      "gpt-image-1-mini"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000002,
      "promptCachedTokens": 2.0000000000000002E-7,
      "promptImageTokens": 0.0000025,
      "completionImageTokens": 0.000008
    },
    "description": "GPT Image 1 Mini - OpenAI's image generation model",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ]
  },
  {
    "name": "gptimage-large",
    "aliases": [
      "gpt-image-1.5",
      "gpt-image-large"
    ],
    "pricing": {
      "currency": "pollen",
      "promptTextTokens": 0.000008,
      "promptCachedTokens": 0.000002,
      "promptImageTokens": 0.000008,
      "completionImageTokens": 0.000032
    },
    "description": "GPT Image 1.5 - OpenAI's advanced image generation model",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ],
    "paid_only": true
  },
  {
    "name": "flux",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.0002
    },
    "description": "Flux Schnell - Fast high-quality image generation",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "image"
    ]
  },
  {
    "name": "zimage",
    "aliases": [
      "z-image",
      "z-image-turbo"
    ],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.0002
    },
    "description": "Z-Image Turbo - Fast 6B Flux with 2x upscaling",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "image"
    ]
  },
  {
    "name": "veo",
    "aliases": [
      "veo-3.1-fast",
      "video"
    ],
    "pricing": {
      "currency": "pollen",
      "completionVideoSeconds": 0.15
    },
    "description": "Veo 3.1 Fast - Google's video generation model (preview)",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "video"
    ],
    "paid_only": true
  },
  {
    "name": "seedance",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "completionVideoTokens": 0.0000018000000000000001
    },
    "description": "Seedance Lite - BytePlus video generation (better quality)",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "video"
    ]
  },
  {
    "name": "seedance-pro",
    "aliases": [],
    "pricing": {
      "currency": "pollen",
      "completionVideoTokens": 0.000001
    },
    "description": "Seedance Pro-Fast - BytePlus video generation (better prompt adherence)",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "video"
    ],
    "paid_only": true
  },
  {
    "name": "wan",
    "aliases": [
      "wan2.6",
      "wan-i2v"
    ],
    "pricing": {
      "currency": "pollen",
      "completionVideoSeconds": 0.0125,
      "completionAudioSeconds": 0.0125
    },
    "description": "Wan 2.6 - Alibaba text/image-to-video with audio (2-15s, up to 1080P). Primary via api.airforce, fallback via DashScope",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "video"
    ]
  },
  {
    "name": "klein",
    "aliases": [
      "flux-klein"
    ],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.008
    },
    "description": "FLUX.2 Klein 4B - Fast image generation & editing on Modal",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ]
  },
  {
    "name": "klein-large",
    "aliases": [
      "flux-klein-9b",
      "klein-9b"
    ],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.012
    },
    "description": "FLUX.2 Klein 9B - Higher quality image generation & editing on Modal",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ]
  },
  {
    "name": "imagen-4",
    "aliases": [
      "imagen"
    ],
    "pricing": {
      "currency": "pollen",
      "completionImageTokens": 0.0025
    },
    "description": "Imagen 4 (api.airforce) - Google's latest image gen",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "image"
    ]
  },
  {
    "name": "grok-video",
    "aliases": [
      "grok-imagine-video"
    ],
    "pricing": {
      "currency": "pollen",
      "completionVideoSeconds": 0.0025
    },
    "description": "Grok Video (api.airforce) - xAI video gen",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "video"
    ]
  },
  {
    "name": "ltx-2",
    "aliases": [
      "ltx2",
      "ltxvideo",
      "ltx-video"
    ],
    "pricing": {
      "currency": "pollen",
      "completionVideoSeconds": 0.01
    },
    "description": "LTX-2 - Fast text-to-video generation with audio on Modal",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "video"
    ],
    "paid_only": true
  }
]
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1358  100  1358    0     0   6015      0 --:--:-- --:--:-- --:--:--  6035
[
  {
    "name": "elevenlabs",
    "aliases": [
      "tts",
      "text-to-speech",
      "eleven",
      "tts-1",
      "tts-1-hd"
    ],
    "pricing": {
      "currency": "pollen",
      "completionAudioTokens": 0.00017999999999999998
    },
    "description": "ElevenLabs v3 TTS - Expressive voices with emotions & audio tags",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "audio"
    ],
    "voices": [
      "alloy",
      "echo",
      "fable",
      "onyx",
      "nova",
      "shimmer",
      "ash",
      "ballad",
      "coral",
      "sage",
      "verse",
      "rachel",
      "domi",
      "bella",
      "elli",
      "charlotte",
      "dorothy",
      "sarah",
      "emily",
      "lily",
      "matilda",
      "adam",
      "antoni",
      "arnold",
      "josh",
      "sam",
      "daniel",
      "charlie",
      "james",
      "fin",
      "callum",
      "liam",
      "george",
      "brian",
      "bill"
    ]
  },
  {
    "name": "elevenmusic",
    "aliases": [
      "music"
    ],
    "pricing": {
      "currency": "pollen",
      "completionAudioSeconds": 0.005
    },
    "description": "ElevenLabs Music - Generate studio-grade music from text prompts",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "audio"
    ]
  },
  {
    "name": "whisper",
    "aliases": [
      "whisper-1",
      "whisper-large-v3"
    ],
    "pricing": {
      "currency": "pollen",
      "promptAudioSeconds": 0.0000445
    },
    "description": "Whisper Large V3 - Speech to Text Transcription (OVHcloud)",
    "input_modalities": [
      "audio"
    ],
    "output_modalities": [
      "text"
    ]
  },
  {
    "name": "scribe",
    "aliases": [
      "scribe_v2",
      "scribe-v2"
    ],
    "pricing": {
      "currency": "pollen",
      "promptAudioSeconds": 0.0001111
    },
    "description": "ElevenLabs Scribe v2 - Speech to Text (90+ languages, diarization)",
    "input_modalities": [
      "audio"
    ],
    "output_modalities": [
      "text"
    ]
  }
]
