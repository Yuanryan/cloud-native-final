/**
 * Load-test seed — creates 6767 EMPLOYEE accounts for k6 burst tests.
 *
 * Run:
 *   pnpm --filter api seed:loadtest
 *
 * Notes:
 * - Does NOT delete existing demo seed data.
 * - Idempotent: deletes any existing loadtest-* users before (re)creating.
 * - Shares the first MANAGER found in the DB as manager reference.
 * - All accounts use email loadtest-NNNN@demo.com, password Password123!
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
const TOTAL = 6767;
const BATCH_SIZE = 500;
const PASSWORD = 'Password123!';
const EMAIL_PREFIX = 'loadtest-';

async function main() {
  // Clean up previous run
  const deleted = await prisma.user.deleteMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
  });
  if (deleted.count > 0) {
    // eslint-disable-next-line no-console
    console.log(`Deleted ${deleted.count} existing loadtest users.`);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Use the first available MANAGER as the manager reference
  const manager = await prisma.user.findFirst({
    where: { role: Role.MANAGER },
    select: { id: true, departmentId: true },
  });

  if (!manager) {
    throw new Error(
      'No MANAGER found in DB — run the main seed first (pnpm db:seed).',
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `Creating ${TOTAL} loadtest users in batches of ${BATCH_SIZE}…`,
  );

  let created = 0;
  for (let batch = 0; batch < Math.ceil(TOTAL / BATCH_SIZE); batch++) {
    const start = batch * BATCH_SIZE + 1;
    const end = Math.min(start + BATCH_SIZE - 1, TOTAL);

    const data = [];
    for (let i = start; i <= end; i++) {
      data.push({
        email: `${EMAIL_PREFIX}${String(i).padStart(4, '0')}@demo.com`,
        passwordHash,
        name: `LoadTest User ${i}`,
        role: Role.EMPLOYEE,
        departmentId: manager.departmentId,
        managerId: manager.id,
      });
    }

    await prisma.user.createMany({ data });
    created += data.length;
    // eslint-disable-next-line no-console
    console.log(`  ${created}/${TOTAL} users created`);
  }

  // eslint-disable-next-line no-console
  console.log(`\nSeed completed: ${TOTAL} loadtest users ready.`);
  // eslint-disable-next-line no-console
  console.log(`  Email range: ${EMAIL_PREFIX}0001@demo.com … ${EMAIL_PREFIX}${String(TOTAL).padStart(4, '0')}@demo.com`);
  // eslint-disable-next-line no-console
  console.log(`  Password: ${PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
