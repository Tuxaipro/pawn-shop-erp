/** Inserts default branch (id=1) so loan_details.branch_id FK can be applied. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`
    INSERT INTO branches (id, code, name, is_active, created_on)
    VALUES (1, 'MAIN', 'Main Branch', true, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  console.log('Default branch (id=1) ensured');
}

main()
  .catch((e: { code?: string }) => {
    if (e.code === 'P2010' || e.code === '42P01') {
      console.log('branches table not ready yet — will seed on next push');
      return;
    }
    throw e;
  })
  .finally(() => prisma.$disconnect());
