import { db } from '../src/lib/db';
async function main() {
  // remove orphan conversations (participants gone)
  const convs = await db.conversation.findMany({ include: { participations: true } });
  for (const c of convs) {
    if (c.participations.length < 2) { await db.conversation.delete({ where: { id: c.id } }); console.log('removed conv', c.id); }
  }
  console.log('conversations left:', await db.conversation.count());
  await db.$disconnect();
}
main();
