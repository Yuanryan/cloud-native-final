import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Department id + all descendant department ids */
  async getDepartmentTreeIds(rootDepartmentId: string): Promise<string[]> {
    const ids = new Set<string>([rootDepartmentId]);
    let frontier = [rootDepartmentId];
    while (frontier.length) {
      const children = await this.prisma.department.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      frontier = children.map((c) => c.id);
      frontier.forEach((id) => ids.add(id));
    }
    return [...ids];
  }

  /**
   * Users expected to submit safety reports (exclude ADMIN).
   * MANAGER scope: department subtree OR direct reports (EMPLOYEE/MANAGER only).
   * ADMIN scope: all EMPLOYEE + MANAGER in company.
   */
  async getScopedReporterUserIds(actor: AuthUser): Promise<string[]> {
    if (actor.role === Role.ADMIN) {
      const users = await this.prisma.user.findMany({
        where: { role: { in: [Role.EMPLOYEE, Role.MANAGER] } },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    if (actor.role === Role.MANAGER) {
      const deptIds = await this.getDepartmentTreeIds(actor.departmentId);
      const inDept = await this.prisma.user.findMany({
        where: {
          role: { in: [Role.EMPLOYEE, Role.MANAGER] },
          departmentId: { in: deptIds },
        },
        select: { id: true },
      });
      const reports = await this.prisma.user.findMany({
        where: {
          managerId: actor.id,
          role: { in: [Role.EMPLOYEE, Role.MANAGER] },
        },
        select: { id: true },
      });
      const set = new Set<string>();
      inDept.forEach((u) => set.add(u.id));
      reports.forEach((u) => set.add(u.id));
      return [...set];
    }
    // EMPLOYEE: only self
    return [actor.id];
  }
}
