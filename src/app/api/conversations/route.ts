import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { startConversationSchema, firstZodError } from "@/lib/validate";
import { getOrCreateConversation } from "@/lib/conversation";
import { notifyChat, ROOM_USER, fetchOnlineUserIds } from "@/lib/notify";
import { logSystem } from "@/lib/logger";

/** GET /api/conversations — list my conversations with last message + unread count */
export async function GET(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const parts = await db.participation.findMany({
      where: { userId: me.id, deletedAt: null },
      include: {
        conversation: {
          include: {
            participations: { include: { user: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    const online = new Set(await fetchOnlineUserIds());

    const items = await Promise.all(
      parts.map(async (p) => {
        const conv = p.conversation;
        const otherPart = conv.participations.find((x) => x.userId !== me.id);
        const other = otherPart?.user ?? null;
        const lastMsg = conv.messages[0] ?? null;

        const unread = await db.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: me.id },
            createdAt: { gt: p.lastReadAt ?? new Date(0) },
          },
        });

        return {
          conversationId: conv.id,
          lastMessageAt: conv.lastMessageAt.toISOString(),
          unread,
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                senderId: lastMsg.senderId,
                content: lastMsg.content.slice(0, 120),
                messageType: lastMsg.messageType,
                createdAt: lastMsg.createdAt.toISOString(),
              }
            : null,
          other: other
            ? {
                id: other.id,
                username: other.username,
                displayName: other.displayName,
                avatarColor: other.avatarColor,
                isVerified: other.isVerified,
                online: online.has(other.id),
                lastSeen: other.lastSeen.toISOString(),
                deleted: !!other.deletedAt,
              }
            : null,
          otherLastReadAt: otherPart?.lastReadAt?.toISOString() ?? null,
          otherLastDeliveredAt: otherPart?.lastDeliveredAt?.toISOString() ?? null,
        };
      })
    );

    items.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
    return Response.json({ ok: true, conversations: items });
  } catch (e) {
    logSystem("error", "conversations", e instanceof Error ? e.message : String(e));
    return jsonError("خطای سرور", 500);
  }
}

/** POST /api/conversations — start (or find) a conversation by username */
export async function POST(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const body = await req.json().catch(() => null);
    const parsed = startConversationSchema.safeParse(body);
    if (!parsed.success)
      return jsonError(firstZodError(parsed.error), 400);

    const lower = parsed.data.username.trim().toLowerCase();
    if (lower === me.usernameLower) return jsonError("نمی‌توانید با خودتان گفت‌وگو کنید", 400);

    const target = await db.user.findUnique({ where: { usernameLower: lower } });
    if (!target || target.deletedAt)
      return jsonError("کاربری با این آیدی پیدا نشد", 404);
    if (target.isBanned) return jsonError("این حساب مسدود شده است", 403);

    const iBlocked = await db.block.findFirst({
      where: { blockerId: me.id, blockedId: target.id },
    });
    const blockedMe = await db.block.findFirst({
      where: { blockerId: target.id, blockedId: me.id },
    });
    if (blockedMe) return jsonError("امکان شروع گفت‌وگو با این کاربر نیست", 403);

    const { conversationId, created } = await getOrCreateConversation(me.id, target.id);

    if (created) {
      notifyChat("conversation:new", { conversationId, userId: me.id }, [
        ROOM_USER(target.id),
      ]);
    }

    return Response.json({
      ok: true,
      conversationId,
      created,
      other: {
        id: target.id,
        username: target.username,
        displayName: target.displayName,
        avatarColor: target.avatarColor,
        isVerified: target.isVerified,
      },
      iBlocked: !!iBlocked,
    });
  } catch (e) {
    logSystem("error", "conversations/post", e instanceof Error ? e.message : String(e));
    return jsonError("خطای سرور", 500);
  }
}
