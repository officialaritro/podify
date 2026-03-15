# Podify - Implementation Phases

A personal text-to-speech infrastructure playground with smart caching, concurrency control, and replay analytics.

---

## Project Overview

**Vision:** A mini production system that teaches infrastructure patterns through a practical TTS application.

**X Factor:** The replay analytics layer transforms this from a demo into a learning tool - tracking cache hits/misses and surfacing efficiency stats.

**Stack:**
- Node.js + TypeScript
- Express.js
- ElevenLabs TTS (free tier: 10K chars/month)
- In-memory caching (no database)

---

## Phase 1: Foundation

**Duration:** Week 1

### Goals
- [ ] Set up Express server with logging
- [ ] Implement basic text chunker (sentence-aware)
- [ ] Integrate ElevenLabs TTS
- [ ] Create health endpoint with basic stats

### Files to Create
```
src/
├── index.ts           # Express server entry
├── chunker.ts        # Text chunking logic
├── types.ts          # TypeScript types
└── config.ts         # Configuration
```

### Key Components

#### Text Chunker
- **Max chunk size:** 1,800 characters
- **Boundary detection:** Split on sentence endings (`.`, `!`, `?`) first
- **Edge cases:** Long sentences split at comma/phrase boundaries
- **Output:** Array of `{ text, index, startChar, endChar }`

#### Health Endpoint
```json
GET /health
{
  "status": "healthy",
  "uptime": "0h 5m",
  "memory": { "rssMB": 150 }
}
```

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17"
  }
}
```

---

## Phase 2: Caching Layer

**Duration:** Week 2

### Goals
- [ ] Implement SHA-256 cache key generation
- [ ] Build chunk cache with LRU eviction (50MB cap)
- [ ] Build full-text cache with LRU eviction (100MB cap)
- [ ] Track cache hit/miss statistics

### Files to Create
```
src/
├── cache/
│   ├── chunkCache.ts    # LRU chunk cache
│   ├── fullTextCache.ts  # Full-text cache
│   └── keyGen.ts        # SHA-256 key generation
└── analytics.ts         # Replay stats
```

### Cache Architecture

| Cache | Key | Max Size | TTL |
|-------|-----|----------|-----|
| Chunk Cache | `SHA256(text + voiceId)` | 50MB | 24 hours |
| Full-Text Cache | `SHA256(fullText + voiceId)` | 100MB | 7 days |

#### LRU Implementation
```typescript
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    this.cache.delete(key);
    this.cache.set(key, this.cache.get(key)!);
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    if (this.size() > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}
```

#### Cache Statistics
```typescript
interface CacheStats {
  chunkHits: number;
  chunkMisses: number;
  fullTextHits: number;
  fullTextMisses: number;
  currentSizeMB: number;
  maxSizeMB: number;
}
```

---

## Phase 3: Concurrency Control

**Duration:** Week 3

### Goals
- [ ] Implement semaphore (max 3 slots)
- [ ] Build request queue with timeout
- [ ] Propagate AbortSignal
- [ ] Return 503 on timeout

### Files to Create
```
src/
└── semaphore.ts  # Bounded concurrency control
```

### Semaphore Implementation
```typescript
class Semaphore {
  private queue: Array<() => void> = [];
  private used = 0;

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (this.used < this.maxSlots) {
      this.used++;
      return () => this.release();
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort);
      };
      
      const onAbort = () => {
        cleanup();
        reject(new AbortError());
      };
      
      signal?.addEventListener('abort', onAbort);
      
      this.queue.push(() => {
        cleanup();
        this.used++;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.used--;
    }
  }
}
```

### Queue Behavior
- **Max slots:** 3 (configurable)
- **Queue behavior:** FIFO, max wait 30 seconds
- **Timeout:** Return 503 if queue wait exceeds timeout
- **AbortSignal:** Propagate to TTS calls for cancellation

---

## Phase 4: Deduplication

**Duration:** Week 4

### Goals
- [ ] Implement in-flight promise map
- [ ] Build promise sharing logic
- [ ] Handle race conditions

### Files to Create
```
src/
└── deduplication.ts  # In-flight promise map
```

### Request Deduplication
```typescript
class RequestDeduplicator {
  private inFlight = new Map<string, Promise<AudioBuffer>>();

  async getOrCreate<T>(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = factory();
    this.inFlight.set(key, promise as Promise<AudioBuffer>);

    try {
      return await promise;
    } finally {
      this.inFlight.delete(key);
    }
  }
}
```

### Key Insight
- **Promise sharing:** Second requestor waits on first requestor's promise
- **Scope:** Only for identical chunks requested within ~100ms
- **Architectural difference:** Deduplication ≠ caching (deduplication handles in-flight, caching handles stored)

---

## Phase 5: Frontend & Analytics

**Duration:** Week 5

### Goals
- [ ] Create simple HTML frontend
- [ ] Implement audio streaming playback
- [ ] Build replay analytics dashboard
- [ ] Display efficiency summary

### Files to Create
```
public/
├── index.html       # Main UI
├── dashboard.html   # Health/stats dashboard
└── style.css       # Styling
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/synthesize` | Submit text for TTS |
| `GET` | `/audio/:id` | Stream audio |
| `GET` | `/queue` | Queue status |
| `GET` | `/health` | Live stats |
| `GET` | `/analytics` | Replay statistics |

### Replay Analytics
After 10+ requests, surface:
- "You saved 7 API calls today. Cache efficiency: 70%"
- "Most replayed chunk: paragraph 3"

### Frontend Design
- Textarea input + play button
- Simple progress indicator
- `/health` dashboard in separate view
- No framework - vanilla HTML/JS

---

## API Reference

### POST /synthesize

**Request:**
```json
{
  "text": "Your long article content here...",
  "voiceId": "JBFqnCBsd6RMkjVDRZzb",
  "stream": true
}
```

**Response:**
```json
{
  "jobId": "abc123",
  "status": "processing",
  "chunks": {
    "total": 12,
    "completed": 5,
    "cached": 3
  }
}
```

### GET /health

```json
{
  "status": "healthy",
  "cache": {
    "chunkHits": 142,
    "chunkMisses": 58,
    "chunkHitRate": "71%",
    "fullTextHits": 23,
    "fullTextMisses": 5,
    "currentSizeMB": 23.4,
    "maxSizeMB": 50
  },
  "concurrency": {
    "used": 2,
    "max": 3,
    "queueLength": 0
  },
  "memory": {
    "rssMB": 156,
    "heapUsedMB": 89
  },
  "uptime": "2h 34m"
}
```

---

## Configuration

```typescript
// src/config.ts
export const config = {
  // Chunking
  maxChunkSize: 1800,

  // Caching
  chunkCacheMaxMB: 50,
  fullTextCacheMaxMB: 100,
  chunkCacheTTLHours: 24,
  fullTextCacheTTLDays: 7,

  // Concurrency
  maxConcurrentCalls: 3,
  queueTimeoutMs: 30000,

  // TTS
  defaultVoice: 'JBFqnCBsd6RMkjVDRZzb',
  provider: 'elevenlabs',

  // Analytics
  analyticsThreshold: 10,
};
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Cache hit rate | >60% after 1 week |
| Memory usage | <200MB under load |
| Concurrent TTS calls | Never exceed 3 |
| Request timeout rate | <5% |
| Time to first audio | <3 seconds |

---

## Future Enhancements

- [ ] Multiple voice options
- [ ] Voice speed/pitch controls
- [ ] Export to MP3
- [ ] Queue management (pause, reorder)
- [ ] Text file upload (PDF, MD, TXT)
- [ ] Persistent cache (Redis)
- [ ] Rate limiting per IP

---

## Key Lessons from Article

1. **Bounded concurrency first** - Build semaphore on day one, not after OOM
2. **Provider abstraction after first switch** - Don't build interface until you've swapped providers
3. **Observability from day one** - `/health` tells you what's happening
4. **Request deduplication** - One API call serves many waiters

---

## Skills Used

| Skill | Purpose |
|-------|---------|
| `node` | Node.js best practices |
| `nodejs-backend-patterns | Architecture patterns |
| `text-to-speech` | ElevenLabs integration |
| `secure-node-typescript` | Security |
| `typescript-advanced-types` | TypeScript |
| `web-design-guidelines` | Frontend |

---

## Repository

https://github.com/officialaritro/podify
