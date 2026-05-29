import { DynamicModule, Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

function parseRedisUrl(url: string) {
  const u = new URL(url);
  // rediss:// scheme means TLS (Upstash, ElastiCache w/ encryption, etc.)
  const isTls = u.protocol === 'rediss:';
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    ...(isTls ? { tls: {} as Record<string, never> } : {}),
  };
}

// Skipped entirely when REDIS_URL is unset (CI e2e, no-Redis dev).
// SafetyReportsModule mirrors this behaviour by providing a stub Queue.
@Global()
@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const url = process.env.REDIS_URL;
    if (!url) {
      return { module: QueueModule };
    }
    return {
      module: QueueModule,
      imports: [
        BullModule.forRoot({
          connection: {
            ...parseRedisUrl(url),
            // BullMQ workers require maxRetriesPerRequest: null on the connection.
            maxRetriesPerRequest: null,
          },
        }),
      ],
      exports: [BullModule],
    };
  }
}
