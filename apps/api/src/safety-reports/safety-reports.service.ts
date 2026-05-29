import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, EventStatus, Role, SafetyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../scope/scope.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { SubmitSafetyReportDto } from './dto/submit-safety-report.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SafetyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  private async getEventOrThrow(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async submit(eventId: string, actor: AuthUser, dto: SubmitSafetyReportDto) {
    if (actor.role === Role.ADMIN) {
      throw new ForbiddenException('Admin does not submit safety reports');
    }
    const event = await this.getEventOrThrow(eventId);
    if (event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException('Event is not active');
    }
    const report = await this.prisma.safetyReport.upsert({
      where: {
        userId_eventId: { userId: actor.id, eventId },
      },
      create: {
        userId: actor.id,
        eventId,
        status: dto.status,
        message: dto.message,
      },
      update: {
        status: dto.status,
        message: dto.message,
      },
      include: { user: { include: { department: true } } },
    });
    await this.audit.log({
      actorId: actor.id,
      action: AuditAction.REPORT_SUBMIT,
      resource: 'SafetyReport',
      resourceId: report.id,
      payload: { eventId, status: dto.status },
    });
    return report;
  }

  async getMine(eventId: string, actor: AuthUser) {
    await this.getEventOrThrow(eventId);
    return this.prisma.safetyReport.findUnique({
      where: {
        userId_eventId: { userId: actor.id, eventId },
      },
      include: { user: { include: { department: true } } },
    });
  }

  async listTeam(eventId: string, actor: AuthUser) {
    if (actor.role !== Role.MANAGER) {
      throw new ForbiddenException();
    }
    await this.getEventOrThrow(eventId);
    const scopedIds = await this.scope.getScopedReporterUserIds(actor);

    const [users, reports] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: scopedIds } },
        include: { department: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.safetyReport.findMany({
        where: { eventId, userId: { in: scopedIds } },
      }),
    ]);

    const reportMap = new Map(reports.map((r) => [r.userId, r]));

    return users.map((user) => {
      const report = reportMap.get(user.id);
      return {
        id: report?.id ?? null,
        status: report?.status ?? 'NO_RESPONSE',
        message: report?.message ?? null,
        createdAt: report?.createdAt ?? null,
        updatedAt: report?.updatedAt ?? null,
        user,
      };
    });
  }

  async listAll(eventId: string, actor: AuthUser) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }
    await this.getEventOrThrow(eventId);
    return this.prisma.safetyReport.findMany({
      where: { eventId },
      include: { user: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async stats(eventId: string, actor: AuthUser) {
    await this.getEventOrThrow(eventId);
    let eligibleIds: string[];
    if (actor.role === Role.EMPLOYEE) {
      eligibleIds = [actor.id];
    } else {
      eligibleIds = await this.scope.getScopedReporterUserIds(actor);
    }
    const total = eligibleIds.length;
    const reports = await this.prisma.safetyReport.findMany({
      where: { eventId, userId: { in: eligibleIds } },
    });
    const responded = reports.length;
    const safe = reports.filter((r) => r.status === SafetyStatus.SAFE).length;
    const need_help = reports.filter(
      (r) => r.status === SafetyStatus.NEED_HELP,
    ).length;
    const no_response = total - responded;
    return {
      eventId,
      scope:
        actor.role === Role.ADMIN
          ? 'company'
          : actor.role === Role.MANAGER
            ? 'direct_reports'
            : 'self',
      total,
      responded,
      safe,
      need_help,
      no_response,
    };
  }
}
