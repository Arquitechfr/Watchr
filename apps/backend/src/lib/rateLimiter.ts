export class TokenBucket {
  private lastRefill: number;
  private tokens: number;

  constructor(
    private readonly capacity: number,
    private readonly refillMs: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.refillMs) * this.capacity);
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async consume(count = 1): Promise<void> {
    this.refill();
    if (this.tokens < count) {
      const wait = Math.ceil((count - this.tokens) * (this.refillMs / this.capacity));
      await sleep(wait);
      return this.consume(count);
    }
    this.tokens -= count;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const tmdbRateLimiter = new TokenBucket(40, 10_000);
