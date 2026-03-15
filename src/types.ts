export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

export interface SynthesizeRequest {
  text: string;
  voiceId?: string;
  stream?: boolean;
}

export interface SynthesizeResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  chunks: {
    total: number;
    completed: number;
    cached: number;
  };
  audioUrl?: string;
}

export interface CacheStats {
  chunkHits: number;
  chunkMisses: number;
  chunkHitRate: string;
  fullTextHits: number;
  fullTextMisses: number;
  fullTextHitRate: string;
  currentSizeMB: number;
  maxSizeMB: number;
}

export interface ConcurrencyStats {
  used: number;
  max: number;
  queueLength: number;
}

export interface MemoryStats {
  rssMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: string;
  cache: CacheStats;
  concurrency: ConcurrencyStats;
  memory: MemoryStats;
}

export interface QueueItem {
  jobId: string;
  text: string;
  voiceId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface AppStats {
  startTime: number;
  totalRequests: number;
  cacheStats: CacheStats;
  concurrency: ConcurrencyStats;
}

export const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb';
