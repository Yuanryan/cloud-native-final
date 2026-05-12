import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId: string | null;
    action: AuditAction;
    resource: string;
    resourceId?: string | null;
    ip?: string;
    userAgent?: string;
    payload?: Prisma.InputJsonValue;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? undefined,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? undefined,
        ip: params.ip,
        userAgent: params.userAgent,
        payload: params.payload,
      },
    });
  }
}
