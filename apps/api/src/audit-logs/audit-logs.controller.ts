import { Controller, Get, Query } from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import { Roles } from '../common/decorators/roles.decorator';

const VALID_ACTIONS = new Set<AuditAction>(Object.values(AuditAction));

@Controller('audit-logs')
@Roles(Role.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('actorEmail') actorEmail?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    const validatedAction =
      action && VALID_ACTIONS.has(action as AuditAction)
        ? (action as AuditAction)
        : undefined;
    return this.auditLogs.findPage({
      page: Number.isFinite(p) ? p : 1,
      limit: Number.isFinite(l) ? l : 50,
      action: validatedAction,
      resource: resource?.trim() || undefined,
      actorEmail: actorEmail?.trim() || undefined,
    });
  }

  @Get('resources')
  resources() {
    return this.auditLogs.distinctResources();
  }
}
