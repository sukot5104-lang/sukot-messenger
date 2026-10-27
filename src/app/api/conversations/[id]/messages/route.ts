import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/conversations/[id]/messages?before=<ISO>&limit=50 — message history */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);
    const { id } = await ctx.params;

    const myPart = await db.participation.findFirst({
      where: { conversationId: id, userId: me.id },
    });
    if (!myPart) return jsonError("گفت‌وگو پیدا نشد", 404);

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50,
      100
    );
    const before = req.nextUrl.searchParams.get("before");

    const messages = await db.message.findMany({
      where: {
        conversationId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return Response.json({
      ok: true,
      messages: messages
        .map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))
        .reverse(),
      hasMore: messages.length === limit,
    });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
