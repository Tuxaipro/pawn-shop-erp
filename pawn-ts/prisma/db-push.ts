import { execSync } from 'node:child_process';
import { resetMasterSequences } from '../src/lib/reset-sequences.js';
import { prisma } from '../src/lib/prisma.js';

function run(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

const push = 'npx prisma db push';
const ensure = 'npx tsx prisma/ensure-branch.ts';

if (!run(push)) {
  console.log('\nPush failed — ensuring default branch exists, then retrying…\n');
  run(ensure);
  if (!run(push)) {
    process.exit(1);
  }
} else {
  run(ensure);
}

resetMasterSequences()
  .then(() => console.log('Master sequences reset'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
