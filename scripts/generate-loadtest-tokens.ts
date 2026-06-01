/**
 * Offline JWT generator for k6 load tests.
 *
 * Queries loadtest-* users from the DB, signs a JWT with the same
 * secret and payload format that the API uses, then writes:
 *   infra/k6/load-test-tokens.json          — all 6767 tokens
 *   infra/k6/load-test-tokens-business.json — first 67 tokens (for business.js)
 *
 * Usage:
 *   DATABASE_URL=... JWT_SECRET=... npx ts-node scripts/generate-loadtest-tokens.ts
 *
 * Or via pnpm (run from repo root):
 *   DATABASE_URL=$(cat apps/api/.env | grep DATABASE_URL | cut -d= -f2-) \
 *   JWT_SECRET=$(cat apps/api/.env | grep JWT_SECRET | cut -d= -f2-) \
 *   npx ts-node -e "require('./scripts/generate-loadtest-tokens.ts')"
 *
 * The output files are in .gitignore — DO NOT commit them.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const BUSINESS_COUNT = 67;
const JWT_EXPIRES_SEC = 28800; // 8 hours — same default as API

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const secret = process.env.JWT_SECRET?.trim() || 'dev-secret-change-me';

  if (!dbUrl) {
    throw new Error('DATABASE_URL env var is required');
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    console.log('Querying loadtest users…');
    const users = await prisma.user.findMany({
      where: { email: { startsWith: 'loadtest-' } },
      select: { id: true, email: true, role: true },
      orderBy: { email: 'asc' },
    });

    if (users.length === 0) {
      throw new Error(
        'No loadtest users found. Run: pnpm --filter api seed:loadtest',
      );
    }

    console.log(`Found ${users.length} users. Signing JWTs…`);

    const tokens = users.map((u) => ({
      email: u.email,
      role: u.role,
      token: jwt.sign(
        { sub: u.id, email: u.email, role: u.role },
        secret,
        { expiresIn: JWT_EXPIRES_SEC },
      ),
    }));

    const outDir = path.resolve(__dirname, '../infra/k6');
    fs.mkdirSync(outDir, { recursive: true });

    const allPath = path.join(outDir, 'load-test-tokens.json');
    fs.writeFileSync(allPath, JSON.stringify(tokens, null, 2));
    console.log(`Wrote ${tokens.length} tokens → ${allPath}`);

    const businessTokens = tokens.slice(0, BUSINESS_COUNT);
    const businessPath = path.join(outDir, 'load-test-tokens-business.json');
    fs.writeFileSync(businessPath, JSON.stringify(businessTokens, null, 2));
    console.log(`Wrote ${businessTokens.length} business tokens → ${businessPath}`);

    console.log('\nDone. Files are in .gitignore — never commit them.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
