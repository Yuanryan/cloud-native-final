import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('audit-logs')
@Roles(Role.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    return this.auditLogs.findPage(
      Number.isFinite(p) ? p : 1,
      Number.isFinite(l) ? l : 50,
    );
  }
}
