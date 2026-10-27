import { db } from '../src/lib/db';
async function main() {
  // remove test users + their data (keep official Sukot)
  const testUsers = await db.user.findMany({ where: { usernameLower: { notIn: ['sukot'] } } });
  for (const u of testUsers) {
    await db.user.delete({ where: { id: u.id } });
    console.log('deleted:', u.username);
  }
  const msgs = await db.message.count();
  const convs = await db.conversation.count();
  console.log('remaining users:', await db.user.count(), '| messages:', msgs, '| conversations:', convs);
  await db.$disconnect();
}
main();
