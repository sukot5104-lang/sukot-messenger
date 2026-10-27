/**
 * SUKOT MESSENGER — Database seeder
 * Creates:
 *  1. The official "Sukot" support account (verified, protected, non-copyable)
 *  2. Reserved system IDs that can never be registered
 *  3. Default settings (ID delete policy)
 *
 * Run: bun run scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SUKOT_PASSWORD = process.env.SUKOT_PASSWORD || "Sukot@2026";

const RESERVED_IDS: Array<{ name: string; note: string }> = [
  { name: "admin", note: "نام سیستمی" },
  { name: "administrator", note: "نام سیستمی" },
  { name: "support", note: "پشتیبانی رسمی" },
  { name: "official", note: "نام سیستمی" },
  { name: "system", note: "نام سیستمی" },
  { name: "root", note: "نام سیستمی" },
  { name: "moderator", note: "نام سیستمی" },
  { name: "mod", note: "نام سیستمی" },
  { name: "staff", note: "نام سیستمی" },
  { name: "team", note: "نام سیستمی" },
  { name: "help", note: "نام سیستمی" },
  { name: "security", note: "نام سیستمی" },
  { name: "owner", note: "نام سیستمی" },
  { name: "info", note: "نام سیستمی" },
  { name: "contact", note: "نام سیستمی" },
  { name: "bot", note: "نام سیستمی" },
  { name: "api", note: "نام سیستمی" },
  { name: "null", note: "نام سیستمی" },
  { name: "undefined", note: "نام سیستمی" },
  { name: "sukot_messenger", note: "برند رسمی (حفاظت اضافه)" },
  { name: "sukot_official", note: "برند رسمی (حفاظت اضافه)" },
];

async function main() {
  console.log("Seeding SUKOT MESSENGER database...");

  // 1) Official Sukot account
  const sukot = await db.user.upsert({
    where: { usernameLower: "sukot" },
    update: {
      isVerified: true,
      displayName: "SUKOT",
      deletedAt: null,
      isBanned: false,
    },
    create: {
      username: "Sukot",
      usernameLower: "sukot",
      passwordHash: bcrypt.hashSync(SUKOT_PASSWORD, 12),
      displayName: "SUKOT",
      bio: "پشتیبانی رسمی SUKOT MESSENGER — هر مشکل یا پیشنهادی داری همین‌جا پیام بده ✉️",
      avatarColor: "#a855f7",
      isVerified: true,
      isAdmin: true,
    },
  });
  console.log(`✔ Official account ready: @${sukot.username} (${sukot.id})`);

  // 2) Reserved IDs
  for (const r of RESERVED_IDS) {
    await db.reservedId.upsert({
      where: { nameLower: r.name.toLowerCase() },
      update: { note: r.note },
      create: { nameLower: r.name.toLowerCase(), note: r.note },
    });
  }
  console.log(`✔ Reserved IDs ensured: ${RESERVED_IDS.length}`);

  // 3) Default settings
  await db.setting.upsert({
    where: { key: "id_delete_policy" },
    update: {},
    create: { key: "id_delete_policy", value: "reserve" },
  });
  console.log('✔ Settings ensured: id_delete_policy = "reserve"');

  console.log("\n=== IMPORTANT ===");
  console.log("Official account:  Sukot / " + SUKOT_PASSWORD);
  console.log("Admin panel password (env ADMIN_PASSWORD): " + (process.env.ADMIN_PASSWORD || "SukotAdmin@2026"));
  console.log("Change these in .env before any public deployment!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
