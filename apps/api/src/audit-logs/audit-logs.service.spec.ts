import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';

const mockItem = {
  id: 'log-1',
  action: 'LOGIN',
  resource: 'Auth',
  resourceId: 'user-1',
  actorId: 'user-1',
  actor: { id: 'user-1', email: 'admin@demo.com', name: 'Admin' },
  createdAt: new Date(),
};

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prismaAuditLogFindMany: jest.Mock;
  let prismaAuditLogCount: jest.Mock;

  beforeEach(async () => {
    prismaAuditLogFindMany = jest.fn().mockResolvedValue([mockItem]);
    prismaAuditLogCount = jest.fn().mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest
              .fn()
              .mockImplementation((queries: Promise<unknown>[]) =>
                Promise.all(queries),
              ),
            auditLog: {
              findMany: prismaAuditLogFindMany,
              count: prismaAuditLogCount,
            },
          },
        },
      ],
    }).compile();

    service = module.get(AuditLogsService);
  });

  describe('findPage()', () => {
    it('returns items, total, page, and limit', async () => {
      const result = await service.findPage({ page: 1, limit: 50 });

      expect(result).toMatchObject({
        items: [mockItem],
        total: 1,
        page: 1,
        limit: 50,
      });
    });

    it('uses default page=1 and limit=50 when not specified', async () => {
      const result = await service.findPage();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('clamps limit to 100 when higher value is provided', async () => {
      const result = await service.findPage({ page: 1, limit: 999 });

      expect(result.limit).toBe(100);
    });

    it('calculates correct skip for page 2', async () => {
      await service.findPage({ page: 2, limit: 50 });

      expect(prismaAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });

    it('passes action filter into prisma where clause', async () => {
      await service.findPage({ action: 'LOGIN' });

      expect(prismaAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { action: 'LOGIN' } }),
      );
    });

    it('passes actorEmail as case-insensitive contains', async () => {
      await service.findPage({ actorEmail: 'admin' });

      expect(prismaAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            actor: { email: { contains: 'admin', mode: 'insensitive' } },
          },
        }),
      );
    });
  });
});
