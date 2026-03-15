import { LRUCache } from './lruCache.js';
import { generateChunkKey, generateFullTextKey } from './keyGen.js';
import { config } from '../config.js';

export interface AudioData {
  buffer: Buffer;
  duration?: number;
}

export interface CachedChunk {
  audio: AudioData;
  text: string;
  voiceId: string;
  chunkIndex: number;
}

const CHUNK_TTL_MS = config.caching.chunkCacheTTLHours * 60 * 60 * 1000;

export class ChunkCache {
  private cache: LRUCache<string, CachedChunk>;

  constructor() {
    this.cache = new LRUCache<string, CachedChunk>({
      maxSizeMB: config.caching.chunkCacheMaxMB,
      defaultTTL: CHUNK_TTL_MS,
    });
  }

  get(text: string, voiceId: string, chunkIndex: number): AudioData | undefined {
    const key = generateChunkKey(text, voiceId, chunkIndex);
    const cached = this.cache.get(key);
    return cached?.audio;
  }

  set(text: string, voiceId: string, chunkIndex: number, audio: AudioData): void {
    const key = generateChunkKey(text, voiceId, chunkIndex);
    const estimatedSize = audio.buffer.length + text.length * 2;
    this.cache.set(key, { audio, text, voiceId, chunkIndex }, estimatedSize, CHUNK_TTL_MS);
  }

  getStats() {
    return this.cache.getStats();
  }

  getSizeMB(): number {
    return this.cache.getSizeMB();
  }

  clear(): void {
    this.cache.clear();
  }
}

export const chunkCache = new ChunkCache();
