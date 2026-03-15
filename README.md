# Podify

A personal text-to-speech infrastructure playground with smart caching, concurrency control, and replay analytics.

## Quick Start

```bash
npm install
npm run dev
```

## Features

- Text chunking (1,800 char sentence-aware splits)
- Two-level LRU caching (chunk + full-text)
- Bounded concurrency semaphore (max 3 simultaneous TTS calls)
- Request deduplication via in-flight promise map
- Live health dashboard with cache stats
- Replay analytics

## Stack

- Node.js + TypeScript
- Express.js
- OpenAI TTS / ElevenLabs

## Documentation

See [PLAN.md](./PLAN.md) for full architecture details.
