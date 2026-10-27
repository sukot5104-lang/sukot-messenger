import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/config";
import { cookieOptions } from "@/lib/api-helpers";
import { registerSchema, checkUsername, firstZodError } from "@/lib/validate";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logSystem } from "@/lib/logger";
import { getOrCreateConversation } from "@/lib/conversation";
import { notifyChat, ROOM_USER } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 8 registrations / 10 minutes / IP
    const rl = rateLimit(`register:${clientIp(req)}`, 8, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `تعداد تلاش‌ها زیاد است. لطفاً ${Math.ceil(rl.retryAfterSec / 60)} دقیقه دیگر تلاش کنید`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ ok: false, error: firstZodError(parsed.error) }, { status: 400 });

    const username = parsed.data.username.trim();
    const displayName = parsed.data.displayName.trim();
    const password = parsed.data.password;

    // Server-side uniqueness + reserved + brand protection
    const check = await checkUsername(username);
    if (!check.ok)
      return NextResponse.json({ ok: false, error: check.reason }, { status: 409 });

    const user = await db.user.create({
      data: {
        username,
        usernameLower: username.toLowerCase(),
        passwordHash: hashPassword(password),
        displayName,
        avatarColor: pickColor(username),
      },
    });

    // Welcome conversation from the official Sukot support account
    const sukot = await db.user.findUnique({ where: { usernameLower: "sukot" } });
    if (sukot && sukot.id !== user.id) {
      const { conversationId } = await getOrCreateConversation(user.id, sukot.id);
      const msg = await db.message.create({
        data: {
          conversationId,
          senderId: sukot.id,
          content:
            `سلام ${displayName} عزیز! 👋\n\n` +
            `به SUKOT MESSENGER خوش اومدی!\n\n` +
            `من Sukot هستم، پشتیبانی رسمی پیام‌رسان. هر مشکل، سؤال یا پیشنهادی داری همین‌جا برام بنویس؛ در اولین فرصت جوابت رو می‌دم ✉️`,
        },
      });
      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: msg.createdAt },
      });
      await db.participation.updateMany({
        where: { conversationId, userId: user.id },
        data: { lastDeliveredAt: msg.createdAt, lastReadAt: msg.createdAt },
      });
      notifyChat(
        "conversation:new",
        { conversationId, userId: user.id, username: user.username },
        [ROOM_USER(sukot.id)]
      );
    }

    logSystem("info", "auth", `new registration @${user.username}`);

    const token = signSession(user.id);
    const res = NextResponse.json({
      ok: true,
      token, // socket handshake auth
      user: { id: user.id, username: user.username, displayName: user.displayName },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      ...cookieOptions(req),
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    logSystem("error", "auth/register", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, error: "خطای سرور در ثبت‌نام" }, { status: 500 });
  }
}

const PALETTE = [
  "#8b5cf6", "#a855f7", "#d946ef", "#c026d3", "#7c3aed",
  "#e879f9", "#9333ea", "#b453af", "#8b5cf6", "#c084fc",
];
function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
