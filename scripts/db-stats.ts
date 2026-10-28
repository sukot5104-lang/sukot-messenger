import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ select: { username: true } });
  const msgs = await db.message.count();
  // "seed-only" = the DB was auto-recreated by full-recovery (only the official
  // Sukot account, zero messages) — safe to overwrite with a real backup.
  const seedOnly =
    users.length === 1 &&
    users[0].username.toLowerCase() === 'sukot' &&
    msgs === 0;
  console.log(`USERS=${users.length} MSGS=${msgs} SEEDONLY=${seedOnly ? 'yes' : 'no'}`);
  await db.$disconnect();
}

main();
