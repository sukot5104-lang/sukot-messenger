import { db } from "@/lib/db";

/**
 * Find the 1-1 conversation between two users or create it.
 * Returns { conversationId, created }.
 */
export async function getOrCreateConversation(
  aId: string,
  bId: string
): Promise<{ conversationId: string; created: boolean }> {
  const mine = await db.participation.findMany({
    where: { userId: aId },
    select: { conversationId: true },
  });
  const convIds = mine.map((m) => m.conversationId);
  if (convIds.length > 0) {
    const shared = await db.participation.findFirst({
      where: { conversationId: { in: convIds }, userId: bId },
    });
    if (shared) return { conversationId: shared.conversationId, created: false };
  }
  const conv = await db.conversation.create({ data: {} });
  await db.participation.createMany({
    data: [
      { conversationId: conv.id, userId: aId },
      { conversationId: conv.id, userId: bId },
    ],
  });
  return { conversationId: conv.id, created: true };
}

export async function getOtherParticipant(
  conversationId: string,
  myId: string
) {
  const row = await db.participation.findFirst({
    where: { conversationId, userId: { not: myId } },
    include: { user: true },
  });
  return row?.user ?? null;
}
