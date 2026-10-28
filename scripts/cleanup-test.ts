/**
 * Cleanup test users: keep ONLY the official Sukot account.
 * Removes users, their conversations (cascade via participations), messages.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const keep = await p.user.findUnique({ where: { usernameLower: "sukot" } });
if (!keep) throw new Error("Official Sukot account missing — run seed.ts first!");

const others = await p.user.findMany({ where: { usernameLower: { not: "sukot" } }, select: { id: true, username: true } });
for (const u of others) {
  await p.user.delete({ where: { id: u.id } });
  console.log("deleted user:", u.username);
}

// remove orphan conversations (fewer than 2 participants)
const convs = await p.conversation.findMany({ include: { _count: { select: { participations: true } } } });
for (const c of convs) {
  if (c._count.participations < 2) {
    await p.conversation.delete({ where: { id: c.id } });
    console.log("deleted orphan conv:", c.id);
  }
}

const remaining = await p.user.findMany({ select: { username: true } });
const msgCount = await p.message.count();
const convCount = await p.conversation.count();
console.log("REMAINING USERS:", remaining, "| messages:", msgCount, "| convs:", convCount);
await p.$disconnect();
