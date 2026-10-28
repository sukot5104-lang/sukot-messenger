/** Prints ONLY the user count number to stdout (for full-recovery.sh) */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const n = await p.user.count();
  console.log(String(n));
} catch {
  console.log("0");
} finally {
  await p.$disconnect();
}
