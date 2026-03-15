import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { chunker } from './chunker.js';
import { chunkCache, fullTextCache } from './cache/index.js';
import {
  HealthResponse,
  SynthesizeRequest,
  SynthesizeResponse,
  AppStats,
  DEFAULT_VOICE,
} from './types.js';

const app = express();
const startTime = Date.now();

const appStats: AppStats = {
  startTime: Date.now(),
  totalRequests: 0,
  cacheStats: {
    chunkHits: 0,
    chunkMisses: 0,
    chunkHitRate: '0%',
    fullTextHits: 0,
    fullTextMisses: 0,
    fullTextHitRate: '0%',
    currentSizeMB: 0,
    maxSizeMB: 50,
  },
  concurrency: {
    used: 0,
    max: config.concurrency.maxConcurrentCalls,
    queueLength: 0,
  },
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  appStats.totalRequests++;
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function getMemoryUsage(): { rssMB: number; heapUsedMB: number; heapTotalMB: number } {
  const used = process.memoryUsage();
  return {
    rssMB: Math.round(used.rss / 1024 / 1024),
    heapUsedMB: Math.round(used.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(used.heapTotal / 1024 / 1024),
  };
}

function calculateHitRate(hits: number, misses: number): string {
  const total = hits + misses;
  if (total === 0) return '0%';
  return `${Math.round((hits / total) * 100)}%`;
}

app.get('/health', (req: Request, res: Response) => {
  const memory = getMemoryUsage();
  const uptime = Date.now() - appStats.startTime;

  const chunkCacheStats = chunkCache.getStats();
  const fullTextCacheStats = fullTextCache.getStats();

  const totalCacheSizeMB = chunkCache.getSizeMB() + fullTextCache.getSizeMB();
  
  const health: HealthResponse = {
    status: 'healthy',
    uptime: formatUptime(uptime),
    cache: {
      chunkHits: chunkCacheStats.hits,
      chunkMisses: chunkCacheStats.misses,
      chunkHitRate: chunkCacheStats.hitRate,
      fullTextHits: fullTextCacheStats.hits,
      fullTextMisses: fullTextCacheStats.misses,
      fullTextHitRate: fullTextCacheStats.hitRate,
      currentSizeMB: totalCacheSizeMB,
      maxSizeMB: config.caching.chunkCacheMaxMB + config.caching.fullTextCacheMaxMB,
    },
    concurrency: appStats.concurrency,
    memory,
  };

  if (memory.rssMB > 500) {
    health.status = 'degraded';
  }

  res.json(health);
});

app.post('/synthesize', (req: Request, res: Response) => {
  const body = req.body as SynthesizeRequest;
  
  if (!body.text || body.text.trim().length === 0) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  if (body.text.length > 100000) {
    res.status(400).json({ error: 'Text too long (max 100k characters)' });
    return;
  }

  const chunks = chunker.chunk(body.text);
  const voiceId = body.voiceId || config.tts.defaultVoice;

  const response: SynthesizeResponse = {
    jobId: `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: 'processing',
    chunks: {
      total: chunks.length,
      completed: 0,
      cached: 0,
    },
  };

  console.log(`Job ${response.jobId}: ${chunks.length} chunks, voice: ${voiceId}`);

  res.json(response);
});

app.get('/queue', (req: Request, res: Response) => {
  res.json({
    concurrency: appStats.concurrency,
  });
});

app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>Podify - TTS Service</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #333; }
          .endpoints { background: #f5f5f5; padding: 20px; border-radius: 8px; }
          code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Podify - TTS Service</h1>
        <div class="endpoints">
          <h2>Endpoints</h2>
          <p><code>POST /synthesize</code> - Convert text to speech</p>
          <p><code>GET /health</code> - Service health check</p>
          <p><code>GET /queue</code> - Queue status</p>
        </div>
      </body>
    </html>
  `);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎙️  Podify Server Started                              ║
║                                                           ║
║   Local:    http://localhost:${PORT}                        ║
║   Health:   http://localhost:${PORT}/health                 ║
║   Queue:    http://localhost:${PORT}/queue                  ║
║                                                           ║
║   Max Concurrent TTS: ${config.concurrency.maxConcurrentCalls}                            ║
║   Max Chunk Size: ${config.chunking.maxChunkSize} chars                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app, appStats };
