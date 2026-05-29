import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditLogFilters = {
  page?: number;
  limit?: number;
  action?: AuditAction;
  resource?: string;
  actorEmail?: string;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filters: AuditLogFilters = {}) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const take = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * take;

    const where: Prisma.AuditLogWhereInput = {};
    if (filters.action) where.action = filters.action;
    if (filters.resource) where.resource = filters.resource;
    if (filters.actorEmail) {
      where.actor = {
        email: { contains: filters.actorEmail, mode: 'insensitive' },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit: take };
  }

  // Distinct resource names actually present in the DB, sorted alphabetically.
  // Powers the resource dropdown without hardcoding values in the UI.
  async distinctResources(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ['resource'],
      select: { resource: true },
      orderBy: { resource: 'asc' },
    });
    return rows.map((r) => r.resource);
  }
}
