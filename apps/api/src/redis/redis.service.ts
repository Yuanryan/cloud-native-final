import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (url) {
      this.client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    }
  }

  isEnabled() {
    return !!this.client;
  }

  async ping(): Promise<'PONG' | 'SKIPPED'> {
    if (!this.client) {
      return 'SKIPPED';
    }
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client.ping();
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) {
      return true;
    }
    const res = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return res === 'OK';
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
