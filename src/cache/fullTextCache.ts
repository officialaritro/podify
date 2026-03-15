import { LRUCache } from './lruCache.js';
import { generateFullTextKey } from './keyGen.js';
import { config } from '../config.js';
import { AudioData } from './chunkCache.js';

export interface CachedFullText {
  audio: AudioData[];
  text: string;
  voiceId: string;
  chunkCount: number;
}

const FULLTEXT_TTL_MS = config.caching.fullTextCacheTTLDays * 24 * 60 * 60 * 1000;

export class FullTextCache {
  private cache: LRUCache<string, CachedFullText>;

  constructor() {
    this.cache = new LRUCache<string, CachedFullText>({
      maxSizeMB: config.caching.fullTextCacheMaxMB,
      defaultTTL: FULLTEXT_TTL_MS,
    });
  }

  get(text: string, voiceId: string): AudioData[] | undefined {
    const key = generateFullTextKey(text, voiceId);
    const cached = this.cache.get(key);
    return cached?.audio;
  }

  set(text: string, voiceId: string, audioChunks: AudioData[]): void {
    const key = generateFullTextKey(text, voiceId);
    let totalSize = 0;
    for (const chunk of audioChunks) {
      totalSize += chunk.buffer.length;
    }
    totalSize += text.length * 2;
    this.cache.set(
      key,
      { audio: audioChunks, text, voiceId, chunkCount: audioChunks.length },
      totalSize,
      FULLTEXT_TTL_MS
    );
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

export const fullTextCache = new FullTextCache();
