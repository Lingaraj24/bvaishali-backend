import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private connected = false;

  constructor(private config: ConfigService) {
    this.client = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times === 1) {
          this.logger.warn('Redis unavailable — rate limiting and checkout locks are disabled');
        }
        // Retry every 10 seconds, max 3 times, then give up until next restart
        return times <= 3 ? 10_000 : null;
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Redis connected');
    });
    this.client.on('error', () => {
      this.connected = false;
    });
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => {});
  }

  private async safe<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.connected) return fallback;
    try {
      return await op();
    } catch {
      return fallback;
    }
  }

  // ── OTP Rate Limiting ──────────────────────────────────────────────────────

  async getOtpCount(identifier: string): Promise<number> {
    return this.safe(async () => {
      const val = await this.client.get(`otp:count:${identifier}`);
      return val ? parseInt(val, 10) : 0;
    }, 0);
  }

  async incrementOtpCount(identifier: string): Promise<number> {
    return this.safe(async () => {
      const key = `otp:count:${identifier}`;
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, 3600);
      return count;
    }, 0);
  }

  // ── Checkout Inventory Lock ────────────────────────────────────────────────

  /** Returns true if lock acquired, false if another session holds it. Falls back to true (allow) when Redis is down. */
  async acquireCheckoutLock(userId: string, variantId: string): Promise<boolean> {
    return this.safe(async () => {
      const result = await this.client.set(`lock:variant:${variantId}`, userId, 'EX', 600, 'NX');
      return result === 'OK';
    }, true); // fail-open: allow checkout if Redis is unavailable
  }

  async releaseCheckoutLock(variantId: string): Promise<void> {
    await this.safe(() => this.client.del(`lock:variant:${variantId}`).then(() => {}), undefined);
  }

  // ── Generic helpers ────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.safe(() => this.client.get(key), null);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.safe(async () => {
      if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
      else await this.client.set(key, value);
    }, undefined);
  }

  async del(key: string): Promise<void> {
    await this.safe(() => this.client.del(key).then(() => {}), undefined);
  }
}
