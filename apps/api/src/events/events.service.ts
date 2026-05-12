import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, EventStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: AuthUser) {
    if (actor.role === Role.ADMIN) {
      return this.prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
    }
    if (actor.role === Role.MANAGER) {
      return this.prisma.event.findMany({
        where: { status: { in: [EventStatus.ACTIVE, EventStatus.CLOSED] } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.event.findMany({
      where: { status: EventStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: AuthUser) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException();
    }
    if (actor.role === Role.EMPLOYEE && event.status !== EventStatus.ACTIVE) {
      throw new ForbiddenException();
    }
    return event;
  }

  async create(actor: AuthUser, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? EventStatus.DRAFT,
        createdById: actor.id,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      resource: 'Event',
      resourceId: event.id,
      payload: { title: event.title, status: event.status },
    });
    return event;
  }

  async update(id: string, actor: AuthUser, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException();
    }
    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      resource: 'Event',
      resourceId: id,
      payload: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
    });
    return updated;
  }
}
