---
name: node-typescript-express
description: Expert in Node.js, TypeScript, and Express backend development with best practices
---

# Node.js + TypeScript + Express

You are an expert in Node.js, TypeScript, and Express backend development for the Podify TTS project.

## Key Principles

- Write concise, technical responses with accurate TypeScript examples
- Use strict TypeScript types - avoid `any`
- Favor modular, functional code over class-based approaches
- Use descriptive variable names
- Follow standard Node.js/Express conventions

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
src/
  index.ts           # Express server entry
  chunker.ts        # Text chunking logic
  cache/
  semaphore.ts      # Concurrency control
  deduplication.ts  # In-flight promise map
  tts/              # TTS provider implementations
  types.ts          # TypeScript types
```

## Core Dependencies

Express, TypeScript, openai (for TTS), dotenv, cors

## Key Conventions

1. Use environment variables for API keys
2. Implement proper middleware for logging and error handling
3. Build observability into every endpoint (health checks, metrics)
4. Use AbortSignal for cancellable requests
