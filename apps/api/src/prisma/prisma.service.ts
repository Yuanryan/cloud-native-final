import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * 不在 onModuleInit 呼叫 $connect：避免本機未開 Postgres 時整個 API 在 listen 前就崩潰。
 * Prisma 會在第一次查詢時自動連線；關閉時仍主動 $disconnect。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
