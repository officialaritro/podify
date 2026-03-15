# Podify - Project Plan

## Vision

A personal text-to-speech infrastructure playground that transforms any text block into streaming audio through a smart, caching-aware backend. This is not just a TTS wrapper—it's a miniature production system where you build the *infrastructure layer* that most hobby projects ignore: chunking, caching, concurrency control, request deduplication, and observability from day one.

The project serves dual purposes:
1. **Practical**: A usable read-aloud queue for articles, book chapters, documentation
2. **Educational**: A hands-on implementation of the architectural patterns from "Building a Production-Quality TTS Pipeline"

---

## The X Factor

### What Makes Podify Unique

| Traditional TTS Apps | Podify |
|---------------------|--------|
| One API call → one audio file | Multi-layer caching with LRU eviction |
| No concurrency limits | Bounded semaphore (max 3 simultaneous calls) |
| Duplicate requests = duplicate bills | Request deduplication via in-flight promise map |
| Blind to performance | Live dashboard: cache hit rate, memory, concurrency slots |
| Static queue | Replay analytics: tracks hits/misses, surfaces efficiency stats |

### The Real X Factor

The **replay analytics layer** transforms this from a "cool demo" into a *learning tool*. After 10+ requests, users see:
- "You saved 7 API calls today. Cache efficiency: 70%"
- "Most replayed chunk: paragraph 3"

This forces you to think about telemetry, lightweight data storage, and what metrics actually matter—skills that transfer to any backend role.

---

## Stack

### Runtime & Language
**Node.js (Recommended over Python)**
- Authentic to the article's Node-heavy patterns
- Native `AbortSignal` support for request cancellation
- Better ecosystem for streaming audio via WebSockets
- Express.js for the HTTP layer

### TTS Provider
**Start with: OpenAI TTS (gpt-4o-mini-tts) or ElevenLabs**
- Both have free tiers suitable for hobby use
- OpenAI: 500K chars/month free (generous for personal use)
- ElevenLabs: 10K chars/month free (good for testing)

*Provider abstraction built AFTER first switch, not before*

### Storage
**In-memory only** (no database)
- Chunk cache: `Map<cacheKey, AudioBuffer>` with LRU eviction
- Full-text cache: `Map<cacheKey, AudioBuffer>` for repeat plays
- Replay stats: Simple in-memory counter map

### Frontend
**Vanilla HTML + minimal JS**
- Textarea input + play button
- `/health` dashboard in separate view
- No framework needed—this is intentionally simple

---

## Architecture

### System Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  Express     │────▶│  Chunker    │
│  (Browser)  │     │  Server      │     │  (1.8KB)    │
└─────────────┘     └──────┬───────┘     └─────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │ Chunk      │ │ Full-Text  │ │ In-Flight  │
    │ Cache      │ │ Cache      │ │ Promise    │
    │ (LRU)      │ │ (LRU)      │ │ Map        │
    └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
          │             │              │
          ▼             ▼              ▼
    ┌─────────────────────────────────────────────┐
    │         TTS Provider (ElevenLabs/etc)       │
    │         Bounded by Semaphore (max 3)        │
    └─────────────────────────────────────────────┘
```

### Core Components

#### 1. Text Chunker
- **Max chunk size**: 1,800 characters
- **Boundary detection**: Split on sentence endings (`.`, `!`, `?`) first
- **Edge case handling**: Long sentences split at comma/phrase boundaries
- **Output**: Array of `{ text, index, startChar, endChar }`

#### 2. Two-Level Cache

| Cache | Key | Max Size | TTL |
|-------|-----|----------|-----|
| Chunk Cache | `SHA256(text + voiceId)` | 50MB | 24 hours |
| Full-Text Cache | `SHA256(fullText + voiceId)` | 100MB | 7 days |

- **LRU Implementation**: Use `Map` insertion order
- **Eviction**: Remove oldest entries when size limit exceeded
- **Partial hits**: Return cached chunks, fetch only missing ones

#### 3. Bounded Concurrency Semaphore
- **Max slots**: 3 (configurable)
- **Queue behavior**: FIFO, max wait 30 seconds
- **Timeout**: Return 503 if queue wait exceeds timeout
- **AbortSignal**: Propagate to TTS calls for cancellation support

#### 4. Request Deduplication
- **Mechanism**: In-flight promise map keyed by cache key
- **Behavior**: Second requestor waits on first requestor's promise
- **Scope**: Only for identical chunks requested within ~100ms

#### 5. Health Endpoint (`GET /health`)
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

#### 6. Replay Analytics
- **Metrics tracked**: chunk requests, hits, misses per text hash
- **Aggregation**: Per-session and all-time stats
- **Surfaces after**: 10+ total requests
- **Display**: Simple text summary on frontend

---

## API Design

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/synthesize` | Submit text for TTS conversion |
| `GET` | `/audio/:id` | Stream cached/generated audio |
| `GET` | `/queue` | Get current queue status |
| `GET` | `/health` | Live stats dashboard |
| `GET` | `/analytics` | Replay statistics |

### `/synthesize` Request
```json
{
  "text": "Your long article content here...",
  "voiceId": "eleven_monolingual_v1",
  "stream": true
}
```

### `/synthesize` Response
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

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Express server setup with logging
- [ ] Basic text chunker (sentence-aware)
- [ ] OpenAI/ElevenLabs TTS integration
- [ ] Health endpoint with basic stats

### Phase 2: Caching Layer (Week 2)
- [ ] SHA-256 cache key generation
- [ ] Chunk cache with LRU eviction (50MB cap)
- [ ] Full-text cache with LRU eviction (100MB cap)
- [ ] Cache hit/miss tracking

### Phase 3: Concurrency Control (Week 3)
- [ ] Semaphore implementation (max 3 slots)
- [ ] Request queue with timeout
- [ ] AbortSignal propagation
- [ ] 503 fallback for timeout

### Phase 4: Deduplication (Week 4)
- [ ] In-flight promise map
- [ ] Promise sharing logic
- [ ] Race condition handling

### Phase 5: Frontend & Analytics (Week 5)
- [ ] Simple HTML frontend
- [ ] Audio streaming playback
- [ ] Replay analytics dashboard
- [ ] Efficiency summary display

---

## Configuration

```typescript
// config.ts
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
  defaultVoice: 'alloy',
  provider: 'openai', // or 'elevenlabs'
  
  // Analytics
  analyticsThreshold: 10, // Show stats after N requests
};
```

---

## Key Design Decisions & Trade-offs

### 1. In-Memory Only
**Decision**: No Redis, no database
**Reasoning**: Hobby project scope; LRU + Map handle this well
**Trade-off**: Cache lost on restart (acceptable for MVP)

### 2. Provider Abstraction After First Switch
**Decision**: Don't build abstract interface upfront
**Reasoning**: Article's core lesson—you don't know the interface until you've swapped
**Trade-off**: First provider choice is commit-heavy

### 3. Bounded Concurrency First
**Decision**: Build semaphore on day one, not after OOM
**Reasoning**: Core article insight; prevents 4 AM wake-ups
**Trade-off**: Slight complexity upfront, massive debugging savings

### 4. No WebSockets Initially
**Decision**: Polling or simple streaming via Express
**Reasoning**: Keep it simple; upgrade only when needed
**Trade-off**: Slightly higher latency on long audio

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Cache hit rate | >60% after 1 week |
| Memory usage | <200MB under load |
| Concurrent TTS calls | Never exceed 3 |
| Request timeout rate | <5% |
| Time to first audio chunk | <3 seconds |

---

## Future Enhancements (Post-MVP)

- [ ] Multiple voice options
- [ ] Voice speed/pitch controls
- [ ] Export to MP3
- [ ] Queue management (pause, reorder)
- [ ] Text file upload (PDF, MD, TXT)
- [ ] Persistent cache (Redis)
- [ ] Rate limiting per IP

---

## Files to Create

```
podify/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Express server entry
│   ├── chunker.ts        # Text chunking logic
│   ├── cache/
│   │   ├── chunkCache.ts # LRU chunk cache
│   │   └── fullTextCache.ts
│   ├── semaphore.ts      # Concurrency control
│   ├── deduplication.ts  # In-flight promise map
│   ├── tts/
│   │   ├── openai.ts     # OpenAI TTS provider
│   │   └── elevenlabs.ts # ElevenLabs provider
│   ├── analytics.ts      # Replay stats
│   ├── config.ts         # Configuration
│   └── types.ts          # TypeScript types
├── public/
│   ├── index.html        # Main UI
│   ├── dashboard.html   # Health/stats dashboard
│   └── style.css
├── skills/
│   └── SKILL.md          # Podify-specific skill instructions
└── README.md
```
