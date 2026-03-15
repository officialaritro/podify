import { config } from './config.js';

export class AbortError extends Error {
  constructor(message = 'Operation aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

interface QueueItem {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  timestamp: number;
}

export class Semaphore {
  private used = 0;
  private queue: QueueItem[] = [];
  private maxSlots: number;
  private timeoutMs: number;

  constructor(maxSlots?: number, timeoutMs?: number) {
    this.maxSlots = maxSlots ?? config.concurrency.maxConcurrentCalls;
    this.timeoutMs = timeoutMs ?? config.concurrency.queueTimeoutMs;
  }

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) {
      throw new AbortError();
    }

    if (this.used < this.maxSlots) {
      this.used++;
      return () => this.release();
    }

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      const item: QueueItem = {
        resolve: (val) => {
          cleanup();
          resolve(val as () => void);
        },
        reject: (err) => {
          cleanup();
          reject(err);
        },
        signal,
        timestamp: Date.now(),
      };

      if (signal) {
        const onAbort = () => {
          const index = this.queue.indexOf(item);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
          cleanup();
          reject(new AbortError());
        };
        signal.addEventListener('abort', onAbort);
      }

      this.queue.push(item);

      timeoutId = setTimeout(() => {
        const index = this.queue.indexOf(item);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error(`Queue timeout after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next.resolve(true as unknown as () => void);
      }
    } else {
      this.used--;
    }
  }

  getStats(): { used: number; max: number; queueLength: number } {
    return {
      used: this.used,
      max: this.maxSlots,
      queueLength: this.queue.length,
    };
  }

  getAvailable(): number {
    return Math.max(0, this.maxSlots - this.used);
  }

  setMaxSlots(maxSlots: number): void {
    this.maxSlots = maxSlots;
  }
}

export const semaphore = new Semaphore();
