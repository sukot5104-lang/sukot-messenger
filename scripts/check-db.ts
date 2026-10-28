import { db } from '../src/lib/db';
async function main() {
  const users = await db.user.findMany({ select: { id: true, username: true, usernameLower: true, isVerified: true, isBanned: true, deletedAt: true } });
  console.log('USERS:', JSON.stringify(users, null, 2));
  const settings = await db.setting.findMany();
  console.log('SETTINGS:', JSON.stringify(settings));
  await db.$disconnect();
}
main();
