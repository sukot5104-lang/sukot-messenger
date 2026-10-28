/** Force SQLite WAL checkpoint so db/custom.db is complete on disk (for backup). */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  await p.$queryRaw`PRAGMA wal_checkpoint(TRUNCATE);`;
  console.log("checkpoint ok");
} catch (e) {
  console.error("checkpoint failed:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await p.$disconnect();
}
