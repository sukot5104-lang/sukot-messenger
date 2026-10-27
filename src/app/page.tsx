"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthView } from "@/components/messenger/auth-view";
import { ChatList } from "@/components/messenger/chat-list";
import { ChatView } from "@/components/messenger/chat-view";
import { SearchView } from "@/components/messenger/search-view";
import { ProfileView } from "@/components/messenger/profile-view";
import { AdminView } from "@/components/messenger/admin-view";
import { getSocket, resetSocket } from "@/hooks/use-socket";
import { api } from "@/lib/client";
import { useToast } from "@/hooks/use-toast";
import type {
  ConversationItem,
  PublicUser,
  PresenceEvent,
  MessageStatusEvent,
  TypingEvent,
} from "@/lib/types";
import { MessageCircle, Search, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";

type View = "chats" | "chat" | "search" | "profile" | "admin";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function SukotMessenger() {
  const { toast } = useToast();
  const [booted, setBooted] = useState(false);
  const [me, setMe] = useState<PublicUser | null>(null);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [view, setView] = useState<View>("chats");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [typing, setTyping] = useState<Record<string, string[]>>({});
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- PWA install prompt ----
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ---- service worker ----
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!me) return;
    try {
      const res = await api<{ conversations: ConversationItem[] }>("/api/conversations");
      setConversations(res.conversations);
    } catch {
      /* ignore */
    }
  }, [me]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => refreshConversations(), 250);
  }, [refreshConversations]);

  // ---- boot: restore session ----
  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ user: PublicUser; online: string[] }>("/api/auth/me");
        setMe(res.user);
        setOnline(new Set(res.online ?? []));
      } catch {
        setMe(null);
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  // ---- logout ----
  const logoutLocal = useCallback(() => {
    resetSocket();
    setMe(null);
    setConversations([]);
    setActiveConvId(null);
    setView("chats");
    setTyping({});
  }, []);

  // ---- socket lifecycle (authed) ----
  useEffect(() => {
    if (!me) return;
    const s = getSocket();

    const onConnect = () => {
      s.emit("conversations:sync");
    };
    const onPresence = (d: PresenceEvent) => {
      setOnline((prev) => {
        const next = new Set(prev);
        if (d.online) next.add(d.userId);
        else next.delete(d.userId);
        return next;
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.other && c.other.id === d.userId
            ? { ...c, other: { ...c.other, online: d.online, lastSeen: d.lastSeen ?? c.other.lastSeen } }
            : c
        )
      );
    };
    const onConvNew = () => scheduleRefresh();
    const onMessageNewList = (data: { message: { id: string; conversationId: string; senderId: string; content: string; createdAt: string } }) => {
      const msg = data.message;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.conversationId === msg.conversationId);
        if (idx === -1) {
          scheduleRefresh();
          return prev;
        }
        const item = { ...prev[idx] };
        item.lastMessage = msg;
        item.lastMessageAt = msg.createdAt;
        if (msg.senderId !== me.id) {
          item.unread = item.unread + 1;
        } else {
          item.otherLastReadAt = null; // will refresh
        }
        const copy = [...prev];
        copy.splice(idx, 1);
        return [item, ...copy];
      });
    };
    const onStatusList = (d: MessageStatusEvent) => {
      if (d.userId === me.id) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === d.conversationId
            ? {
                ...c,
                otherLastReadAt:
                  d.kind === "read" && (!c.otherLastReadAt || c.otherLastReadAt < d.at)
                    ? d.at
                    : c.otherLastReadAt,
                otherLastDeliveredAt:
                  !c.otherLastDeliveredAt || c.otherLastDeliveredAt < d.at ? d.at : c.otherLastDeliveredAt,
              }
            : c
        )
      );
    };
    const onTyping = (d: TypingEvent) => {
      if (d.userId === me.id) return;
      setTyping((prev) => {
        const forConv = new Set(prev[d.conversationId] ?? []);
        if (d.isTyping) forConv.add(d.userId);
        else forConv.delete(d.userId);
        const next = { ...prev, [d.conversationId]: Array.from(forConv) };
        return next;
      });
    };
    const onAccountDeleted = (d: { userId: string }) => {
      if (d.userId === me.id) {
        toast({ title: "حساب شما حذف شد", variant: "destructive" });
        logoutLocal();
      } else {
        scheduleRefresh();
      }
    };
    const onForceLogout = (d: { reason?: string }) => {
      toast({
        title: d.reason || "حساب شما مسدود شده است",
        description: "از دسترسی به حساب جلوگیری شد",
        variant: "destructive",
      });
      logoutLocal();
    };

    if (s.connected) onConnect();
    s.on("connect", onConnect);
    s.on("presence", onPresence);
    s.on("conversation:new", onConvNew);
    s.on("message:new", onMessageNewList);
    s.on("message:status", onStatusList);
    s.on("typing", onTyping);
    s.on("account:deleted", onAccountDeleted);
    s.on("force:logout", onForceLogout);

    return () => {
      s.off("connect", onConnect);
      s.off("presence", onPresence);
      s.off("conversation:new", onConvNew);
      s.off("message:new", onMessageNewList);
      s.off("message:status", onStatusList);
      s.off("typing", onTyping);
      s.off("account:deleted", onAccountDeleted);
      s.off("force:logout", onForceLogout);
    };
  }, [me, scheduleRefresh, logoutLocal, toast]);

  // initial conversation load
  useEffect(() => {
    if (me) refreshConversations();
  }, [me, refreshConversations]);

  // refresh unread when a chat window regains focus
  useEffect(() => {
    const onFocus = () => {
      if (me) {
        scheduleRefresh();
        const s = getSocket();
        if (activeConvId) s.emit("message:read", { conversationId: activeConvId });
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [me, activeConvId, scheduleRefresh]);

  const onAuthed = (user: { id: string; username: string; displayName: string }, onlineIds: string[]) => {
    resetSocket();
    setMe((prev) =>
      prev
        ? prev
        : {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            bio: "",
            avatarColor: "#8b5cf6",
            isVerified: false,
            isAdmin: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }
    );
    setOnline(new Set(onlineIds ?? []));
    setView("chats");
    // fetch complete profile right away
    api<{ user: PublicUser; online: string[] }>("/api/auth/me")
      .then((res) => {
        setMe(res.user);
        setOnline(new Set(res.online ?? []));
      })
      .catch(() => undefined);
  };

  const openConversation = (convId: string) => {
    setActiveConvId(convId);
    setView("chat");
    // clear local unread badge for this conv
    setConversations((prev) => prev.map((c) => (c.conversationId === convId ? { ...c, unread: 0 } : c)));
    const s = getSocket();
    if (s.connected) s.emit("message:read", { conversationId: convId });
  };

  const activeTypingUsers = activeConvId ? (typing[activeConvId] ?? []) : [];

  // ---- boot loader ----
  if (!booted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0b0614]">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 animate-pulse shadow-[0_0_32px_rgba(139,92,246,0.5)]" />
      </div>
    );
  }

  // ---- unauthenticated ----
  if (!me) {
    return (
      <>
        <AuthViewShell onAuthed={onAuthed} />
        <Toaster />
      </>
    );
  }

  const mobileMainVisible = view !== "chats";
  const sidebarVisible = view === "chats";

  // ---- admin fullscreen ----
  if (view === "admin") {
    return (
      <>
        <AdminView onBack={() => setView("chats")} />
        <Toaster />
      </>
    );
  }

  const activeConv = conversations.find((c) => c.conversationId === activeConvId) ?? null;

  return (
    <>
      <div className="min-h-dvh bg-[#0b0614] text-[#ece6f8]">
        {/* mobile header spacer for safe areas */}
        <div className="md:h-dvh h-dvh md:max-h-dvh md:p-4 lg:p-6 flex justify-center">
          <div className="w-full max-w-6xl md:rounded-2xl md:overflow-hidden overflow-hidden md:border md:border-[#221639] md:shadow-[0_0_60px_rgba(139,92,246,0.08)] grid md:grid-cols-[380px_1fr] bg-[#0b0614]">
            {/* sidebar / chat list */}
            <aside
              className={cn(
                "h-full min-h-0 min-w-0 overflow-hidden flex flex-col border-l border-[#221639] md:border-l-0",
                sidebarVisible ? "flex" : "hidden md:flex"
              )}
            >
              <ChatList
                me={me}
                conversations={conversations}
                online={online}
                activeConvId={activeConvId}
                onOpen={openConversation}
                onOpenSearch={() => setView("search")}
                onOpenProfile={() => setView("profile")}
                onOpenAdmin={() => setView("admin")}
              />
              {/* mobile bottom nav */}
              <nav className="md:hidden flex border-t border-[#221639] bg-[#120b22] pb-[env(safe-area-inset-bottom)]">
                <NavBtn
                  active={view === "chats"}
                  onClick={() => setView("chats")}
                  icon={<MessageCircle className="w-5 h-5" />}
                  label="گفت‌وگوها"
                />
                <NavBtn
                  active={view === "search"}
                  onClick={() => setView("search")}
                  icon={<Search className="w-5 h-5" />}
                  label="جست‌وجو"
                />
                <NavBtn
                  active={view === "profile"}
                  onClick={() => setView("profile")}
                  icon={<UserIcon className="w-5 h-5" />}
                  label="پروفایل"
                />
              </nav>
            </aside>

            {/* main pane */}
            <main
              className={cn(
                "h-full min-h-0 min-w-0 overflow-hidden flex flex-col",
                mobileMainVisible ? "flex" : "hidden md:flex"
              )}
            >
              {view === "chat" && activeConvId ? (
                <ChatView
                  key={activeConvId}
                  me={me}
                  conversationId={activeConvId}
                  typingUserIds={activeTypingUsers}
                  onBack={() => {
                    setView("chats");
                    scheduleRefresh();
                  }}
                  onConversationHidden={() => {
                    setActiveConvId(null);
                    setView("chats");
                    scheduleRefresh();
                  }}
                  onConversationListDirty={scheduleRefresh}
                  onBlockChange={scheduleRefresh}
                />
              ) : view === "search" ? (
                <SearchView
                  meId={me.id}
                  online={online}
                  onBack={() => setView("chats")}
                  onOpenConversation={(convId) => openConversation(convId)}
                />
              ) : view === "profile" ? (
                <ProfileView
                  me={me}
                  onBack={() => setView("chats")}
                  onLogout={logoutLocal}
                  onOpenAdmin={() => setView("admin")}
                  onUserUpdated={(u) => setMe(u)}
                  installPrompt={installPrompt}
                />
              ) : (
                /* desktop empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-[#0b0614]">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.35)] mb-5">
                    <MessageCircle className="w-9 h-9 text-white" />
                  </div>
                  <h2 className="text-xl font-black text-white" dir="ltr">
                    SUKOT MESSENGER
                  </h2>
                  <p className="text-sm text-[#8d7fb0] mt-2 max-w-sm">
                    یک گفت‌وگو را از فهرست انتخاب کنید یا با جست‌وجوی آیدی، چت جدیدی را شروع کنید
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}

function AuthViewShell({
  onAuthed,
}: {
  onAuthed: (user: { id: string; username: string; displayName: string }, online: string[]) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  return <AuthView onAuthed={onAuthed} mode={mode} onSwitchMode={setMode} />;
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10.5px] transition-colors",
        active ? "text-violet-300" : "text-[#6f6195]"
      )}
    >
      <span className={cn(active && "drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]")}>{icon}</span>
      {label}
    </button>
  );
}
