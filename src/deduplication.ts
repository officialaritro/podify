export class RequestDeduplicator<T> {
  private inFlight = new Map<string, Promise<T>>();

  getOrCreate(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = factory();
    this.inFlight.set(key, promise);

    promise
      .then(() => {
        this.inFlight.delete(key);
      })
      .catch(() => {
        this.inFlight.delete(key);
      });

    return promise;
  }

  has(key: string): boolean {
    return this.inFlight.has(key);
  }

  delete(key: string): boolean {
    return this.inFlight.delete(key);
  }

  clear(): void {
    this.inFlight.clear();
  }

  size(): number {
    return this.inFlight.size;
  }

  getInFlightKeys(): string[] {
    return Array.from(this.inFlight.keys());
  }
}

export const chunkDeduplicator = new RequestDeduplicator<Buffer>();
