"use client";

import { Avatar, UserName, formatListTime, isOfficialUser, OFFICIAL_LOGO_SRC } from "./common";
import type { ConversationItem, PublicUser } from "@/lib/types";
import { Search, ShieldCheck, Sparkles, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatListProps {
  me: PublicUser;
  conversations: ConversationItem[];
  online: Set<string>;
  activeConvId: string | null;
  onOpen: (convId: string) => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
}

export function ChatList({
  me,
  conversations,
  online,
  activeConvId,
  onOpen,
  onOpenSearch,
  onOpenProfile,
  onOpenAdmin,
}: ChatListProps) {
  const onlineCount = conversations.filter((c) => c.other && online.has(c.other.id)).length;

  return (
    <div className="flex flex-col h-full bg-[#0f081d]">
      {/* header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#221639]">
        <div className="flex items-center gap-2">
          { }
          <img
            src="/logo.png"
            alt="SUKOT"
            className="w-9 h-9 rounded-xl shadow-[0_0_16px_rgba(139,92,246,0.45)]"
          />
          <div>
            <h1 className="font-black text-[15px] text-white leading-tight" dir="ltr">
              SUKOT MESSENGER
            </h1>
            <p className="text-[11px] text-[#8d7fb0]">
              {onlineCount > 0 ? `${new Intl.NumberFormat("fa-IR").format(onlineCount)} نفر آنلاین` : "آنلاین باشید و چت کنید"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenAdmin}
            title="پنل مدیریت"
            aria-label="پنل مدیریت"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#8d7fb0] hover:bg-[#1b1130] hover:text-violet-300 transition-colors"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
          <button onClick={onOpenProfile} aria-label="پروفایل من" className="rounded-full focus:outline-none">
            <Avatar name={me.displayName} color={me.avatarColor} size={36} online />
          </button>
        </div>
      </header>

      {/* search trigger */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 bg-[#160d2a] border border-[#2a1d45] rounded-xl px-3 py-2.5 text-sm text-[#8d7fb0] hover:border-violet-500/50 transition-colors"
        >
          <Search className="w-4 h-4" />
          جست‌وجوی کاربران با آیدی...
        </button>
      </div>

      {/* conversations */}
      <div className="flex-1 overflow-y-auto px-2 py-2 su-scroll">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16 text-[#8d7fb0]">
            <div className="w-16 h-16 rounded-2xl bg-[#1b1130] flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-violet-400" />
            </div>
            <p className="font-bold text-[#c9bfe4] mb-1">هنوز گفت‌وگویی ندارید</p>
            <p className="text-sm">با جست‌وجوی آیدی کاربران اولین چت را شروع کنید</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.conversationId}>
                <button
                  onClick={() => onOpen(c.conversationId)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-right transition-colors",
                    activeConvId === c.conversationId
                      ? "bg-[#1e1338] shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]"
                      : "hover:bg-[#160d2a]"
                  )}
                >
                  <Avatar
                    name={c.other?.displayName ?? "؟"}
                    color={c.other?.avatarColor ?? "#3f3352"}
                    size={48}
                    online={c.other ? online.has(c.other.id) && !c.other.deleted : false}
                    src={isOfficialUser(c.other?.username) ? OFFICIAL_LOGO_SRC : undefined}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <UserName
                        name={c.other?.displayName || "کاربر حذف‌شده"}
                        verified={c.other?.isVerified}
                        className="font-bold text-[14px] text-[#ece6f8]"
                      />
                      {c.lastMessage && (
                        <span className="text-[10.5px] text-[#6f6195] shrink-0">
                          {formatListTime(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[12.5px] text-[#8d7fb0] truncate">
                        {!c.lastMessage
                          ? "گفت‌وگو را شروع کنید"
                          : c.lastMessage.messageType === "image"
                          ? c.lastMessage.senderId === me.id
                            ? "شما: 📷 عکس"
                            : "📷 عکس"
                          : c.lastMessage.senderId === me.id
                          ? `شما: ${c.lastMessage.content}`
                          : c.lastMessage.content}
                      </p>
                      {c.unread > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {new Intl.NumberFormat("fa-IR").format(c.unread)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* support hint */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 text-[10.5px] text-[#6f6195] bg-[#160d2a] border border-[#221639] rounded-lg px-3 py-2">
          <BadgeCheck className="w-4 h-4 text-green-400 shrink-0" />
          <span>پشتیبانی رسمی با آیدی <b dir="ltr" className="text-violet-300">Sukot</b> همیشه در جست‌وجو در دسترس شماست</span>
        </div>
      </div>
    </div>
  );
}
