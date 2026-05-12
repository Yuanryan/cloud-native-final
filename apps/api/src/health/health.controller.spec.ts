import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  it('returns live payload', async () => {
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { $queryRaw: jest.fn().mockResolvedValue([1]) },
        },
        {
          provide: RedisService,
          useValue: { ping: jest.fn().mockResolvedValue('SKIPPED') },
        },
      ],
    }).compile();
    const ctrl = mod.get(HealthController);
    expect(ctrl.live()).toEqual(
      expect.objectContaining({ status: 'ok', service: 'employee-safety-api' }),
    );
  });
});
