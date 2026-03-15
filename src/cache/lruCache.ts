export interface CacheEntry<T> {
  value: T;
  size: number;
  timestamp: number;
  ttl?: number;
}

export interface LRUCacheOptions {
  maxSizeMB: number;
  defaultTTL?: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private currentSizeBytes = 0;
  private maxSizeBytes: number;
  private defaultTTL?: number;
  private hits = 0;
  private misses = 0;

  constructor(options: LRUCacheOptions) {
    this.maxSizeBytes = options.maxSizeMB * 1024 * 1024;
    this.defaultTTL = options.defaultTTL;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: K, value: V, size: number, ttl?: number): void {
    if (size > this.maxSizeBytes) {
      console.warn(`Cache entry too large: ${size} bytes > ${this.maxSizeBytes} bytes`);
      return;
    }

    if (this.cache.has(key)) {
      this.delete(key);
    }

    while (this.currentSizeBytes + size > this.maxSizeBytes && this.cache.size > 0) {
      this.evictOldest();
    }

    const entry: CacheEntry<V> = {
      value,
      size,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
    this.currentSizeBytes += size;
  }

  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSizeBytes -= entry.size;
      this.cache.delete(key);
      return true;
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getSizeBytes(): number {
    return this.currentSizeBytes;
  }

  getSizeMB(): number {
    return Math.round(this.currentSizeBytes / 1024 / 1024 * 100) / 100;
  }

  getStats(): { hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total === 0 ? '0%' : `${Math.round((this.hits / total) * 100)}%`;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.delete(firstKey);
    }
  }
}
