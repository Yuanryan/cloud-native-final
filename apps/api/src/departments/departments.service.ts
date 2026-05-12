import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../scope/scope.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  findAll() {
    return this.prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async accessible(actor: AuthUser) {
    if (actor.role === Role.ADMIN) {
      return this.findAll();
    }
    const ids = await this.scope.getDepartmentTreeIds(actor.departmentId);
    return this.prisma.department.findMany({
      where: { id: { in: ids } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ?? undefined,
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const d = await this.prisma.department.findUnique({ where: { id } });
    if (!d) {
      throw new NotFoundException();
    }
    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.department.delete({ where: { id } });
    return { ok: true };
  }
}
