/** Targeted cleanup: remove ONLY test accounts, keep real users + Sukot. */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const TEST_PREFIXES = ["imgtest", "rtb", "testuser", "demo"];
const keep = new Set(["sukot", "reza", "shshshdhdh"]);

const users = await p.user.findMany({ select: { id: true, usernameLower: true } });
let removed = 0;
for (const u of users) {
  if (keep.has(u.usernameLower)) continue;
  if (TEST_PREFIXES.some((pre) => u.usernameLower.startsWith(pre))) {
    await p.user.delete({ where: { id: u.id } });
    console.log("deleted test user:", u.usernameLower);
    removed++;
  }
}

// orphan conversations (fewer than 2 participants)
const convs = await p.conversation.findMany({ include: { _count: { select: { participations: true } } } });
let convsRemoved = 0;
for (const c of convs) {
  if (c._count.participations < 2) {
    await p.conversation.delete({ where: { id: c.id } });
    convsRemoved++;
  }
}

const remaining = await p.user.findMany({ select: { usernameLower: true } });
console.log(`removed=${removed} users, ${convsRemoved} orphan convs | remaining:`, remaining.map((u) => u.usernameLower));
await p.$disconnect();
