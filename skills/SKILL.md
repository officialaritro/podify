---
name: podify-development
description: Expert in Node.js, TypeScript, and Express backend development for the Podify TTS project with smart caching
---

# Podify Development

You are an expert in Node.js, TypeScript, and Express backend development for the Podify TTS project.

## Relevant Installed Skills

This project uses these installed agent skills:

1. **node** - Core Node.js best practices (mcollina/skills)
2. **nodejs-backend-patterns** - Comprehensive backend architecture patterns (wshobson/agents)
3. **text-to-speech** - ElevenLabs TTS integration (elevenlabs/skills)
4. **secure-node-typescript** - Security best practices (joacod/skills)
5. **typescript-advanced-types** - Advanced TypeScript patterns (wshobson/agents)
6. **web-design-guidelines** - Frontend UI guidelines (vercel-labs/agent-skills)
7. **find-skills** - For discovering more skills when needed (vercel-labs/skills)
8. **brainstorming** - For design discussions (obra/superpowers)

## Key Principles

- Write concise, technical responses with accurate TypeScript examples
- Use strict TypeScript types - avoid `any`
- Favor modular, functional code over class-based approaches
- Use descriptive variable names
- Follow standard Node.js/Express conventions

## Architecture (from PLAN.md)

### Core Components
1. **Text Chunker** - 1,800 char sentence-aware splits
2. **Two-Level Cache** - Chunk + Full-text LRU
3. **Bounded Semaphore** - Max 3 concurrent TTS calls
4. **Request Deduplication** - In-flight promise map
5. **Health Endpoint** - Live stats dashboard
6. **Replay Analytics** - Cache efficiency tracking

### TTS Provider
- Start with ElevenLabs (free tier: 10K chars/month)
- Use eleven_flash_v2_5 for low latency
- Build provider abstraction AFTER first switch (per article lesson)

## TypeScript/Express Standards

- Use `async/await` for all asynchronous operations
- Use proper TypeScript types for all function signatures and variables
- Structure: routes, services, types, utils
- Use Express Request/Response with proper type annotations

## Error Handling

- Handle edge cases at function entry points
- Use early returns for error conditions
- Implement proper HTTP status codes (200, 400, 404, 500)
- Log errors appropriately

## Project Structure

```
podify/
├── src/
│   ├── index.ts           # Express server entry
│   ├── chunker.ts        # Text chunking logic
│   ├── cache/
│   │   ├── chunkCache.ts # LRU chunk cache
│   │   └── fullTextCache.ts
│   ├── semaphore.ts      # Concurrency control
│   ├── deduplication.ts  # In-flight promise map
│   ├── tts/
│   │   └── elevenlabs.ts # ElevenLabs provider
│   ├── analytics.ts      # Replay stats
│   ├── config.ts         # Configuration
│   └── types.ts          # TypeScript types
├── public/
│   ├── index.html        # Main UI
│   ├── dashboard.html   # Health/stats dashboard
│   └── style.css
└── skills/
    └── SKILL.md         # This file
```

## Core Dependencies

Express, TypeScript, @elevenlabs/elevenlabs-js, dotenv, cors

## Key Conventions

1. Use environment variables for API keys
2. Implement proper middleware for logging and error handling
3. Build observability into every endpoint (health checks, metrics)
4. Use AbortSignal for cancellable requests
5. Build bounded concurrency on day one (not after OOM)
