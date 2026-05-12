import * as bcrypt from 'bcrypt';
import {
  PrismaClient,
  Role,
  EventStatus,
  SafetyStatus,
  NotificationType,
  AuditAction,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.safetyReport.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const hq = await prisma.department.create({
    data: { name: '總部' },
  });
  const rnd = await prisma.department.create({
    data: { name: '研發', parentId: hq.id },
  });
  const sales = await prisma.department.create({
    data: { name: '業務', parentId: hq.id },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      name: '系統管理員',
      role: Role.ADMIN,
      departmentId: hq.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      passwordHash,
      name: '研發主管',
      role: Role.MANAGER,
      departmentId: rnd.id,
      managerId: null,
    },
  });

  const employee1 = await prisma.user.create({
    data: {
      email: 'employee1@demo.com',
      passwordHash,
      name: '員工甲',
      role: Role.EMPLOYEE,
      departmentId: rnd.id,
      managerId: manager.id,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      email: 'employee2@demo.com',
      passwordHash,
      name: '員工乙',
      role: Role.EMPLOYEE,
      departmentId: rnd.id,
      managerId: manager.id,
    },
  });

  const employee3 = await prisma.user.create({
    data: {
      email: 'employee3@demo.com',
      passwordHash,
      name: '業務丙',
      role: Role.EMPLOYEE,
      departmentId: sales.id,
      managerId: null,
    },
  });

  const event = await prisma.event.create({
    data: {
      title: '地震演練 / 緊急事件',
      description: '請盡速回報自身安全狀態。',
      status: EventStatus.ACTIVE,
      createdById: admin.id,
    },
  });

  await prisma.safetyReport.create({
    data: {
      userId: employee1.id,
      eventId: event.id,
      status: SafetyStatus.SAFE,
      message: '人在辦公室，一切正常。',
    },
  });

  await prisma.safetyReport.create({
    data: {
      userId: employee2.id,
      eventId: event.id,
      status: SafetyStatus.NEED_HELP,
      message: '需要協助撤離。',
    },
  });

  await prisma.notification.create({
    data: {
      userId: employee3.id,
      type: NotificationType.REMINDER_EMPLOYEE,
      title: '尚未完成安全回報',
      body: `事件「${event.title}」尚未收到您的回報，請盡快回報。`,
      relatedEventId: event.id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: AuditAction.CREATE,
        resource: 'Event',
        resourceId: event.id,
        payload: { title: event.title },
      },
      {
        actorId: admin.id,
        action: AuditAction.LOGIN,
        resource: 'Auth',
        payload: { email: admin.email },
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed completed.', {
    admin: admin.email,
    manager: manager.email,
    employees: [employee1.email, employee2.email, employee3.email],
    eventId: event.id,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
