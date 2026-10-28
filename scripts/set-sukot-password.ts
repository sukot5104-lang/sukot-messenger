/**
 * Set the official Sukot account password (owner request).
 * Usage: DATABASE_URL="file:..." bun run scripts/set-sukot-password.ts "<new password>"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const pw = process.argv[2];
if (!pw || pw.length < 6) throw new Error("pass new password as argv[2] (min 6 chars)");

const p = new PrismaClient();
const sukot = await p.user.findUnique({ where: { usernameLower: "sukot" } });
if (!sukot) throw new Error("Sukot account not found — run seed.ts first!");

const hash = bcrypt.hashSync(pw, 12);
await p.user.update({ where: { id: sukot.id }, data: { passwordHash: hash } });
console.log("✔ password updated for @Sukot");

// verify round-trip
const fresh = await p.user.findUnique({ where: { usernameLower: "sukot" } });
console.log("✔ verify:", bcrypt.compareSync(pw, fresh!.passwordHash));
await p.$disconnect();
