"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";
import { getSocket } from "@/hooks/use-socket";
import type { ChatMessage, PublicUser } from "@/lib/types";
import {
  Avatar,
  UserName,
  MessageTicks,
  formatTime,
  formatDayLabel,
  formatLastSeen,
} from "./common";
import {
  ChevronRight,
  MoreVertical,
  Send,
  Ban,
  Flag,
  Trash2,
  Loader2,
  Sparkles,
  UserRoundX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationInfo {
  id: string;
  other: {
    id: string;
    username: string;
    displayName: string;
    bio: string;
    avatarColor: string;
    isVerified: boolean;
    lastSeen: string;
    deleted: boolean;
  } | null;
  otherLastReadAt: string | null;
  otherLastDeliveredAt: string | null;
  iBlocked: boolean;
  blockedMe: boolean;
}

interface ChatViewProps {
  me: PublicUser;
  conversationId: string;
  typingUserIds: string[];
  onBack: () => void;
  onConversationHidden: () => void;
  onConversationListDirty: () => void;
  onBlockChange: () => void;
}

export function ChatView({
  me,
  conversationId,
  typingUserIds,
  onBack,
  onConversationHidden,
  onConversationListDirty,
  onBlockChange,
}: ChatViewProps) {
  const { toast } = useToast();
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const [otherDeliveredAt, setOtherDeliveredAt] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomAnchor = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);
  const nearBottom = useRef(true);

  // ---- load conversation info + history (component remounts per conversation via key) ----
  useEffect(() => {
    let alive = true;
    nearBottom.current = true;

    (async () => {
      try {
        const infoRes = await api<{ conversation: ConversationInfo }>(
          `/api/conversations/${conversationId}`
        );
        if (!alive) return;
        setInfo(infoRes.conversation);
        setOtherReadAt(infoRes.conversation.otherLastReadAt);
        setOtherDeliveredAt(infoRes.conversation.otherLastDeliveredAt);

        const msgRes = await api<{ messages: ChatMessage[]; hasMore: boolean }>(
          `/api/conversations/${conversationId}/messages?limit=50`
        );
        if (!alive) return;
        setMessages(msgRes.messages);
        setHasMore(msgRes.hasMore);
        setLoading(false);

        // mark as read
        const s = getSocket();
        s.emit("message:read", { conversationId });
      } catch (err) {
        if (!alive) return;
        setLoading(false);
        toast({
          title: err instanceof Error ? err.message : "خطا در بارگذاری گفت‌وگو",
          variant: "destructive",
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [conversationId]);

  // ---- live events for this conversation ----
  useEffect(() => {
    const s = getSocket();

    const onNew = (data: { message: ChatMessage; clientId?: string }) => {
      const msg = data.message;
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        // already have the real message (ack arrived first) → nothing to do
        if (prev.some((m) => m.id === msg.id)) return prev;
        // echo of my own optimistic message → replace it with the real one
        const echoIdx = data.clientId
          ? prev.findIndex((m) => m.id === data.clientId)
          : -1;
        if (echoIdx !== -1) {
          const copy = [...prev];
          copy[echoIdx] = { ...msg, status: "sent" };
          return copy;
        }
        return [...prev, msg];
      });
      if (msg.senderId !== me.id) {
        // mark delivered+read
        setTimeout(() => {
          s.emit("message:read", { conversationId });
        }, 350);
        onConversationListDirty();
      }
    };

    const onStatus = (d: {
      conversationId: string;
      userId: string;
      kind: "delivered" | "read";
      at: string;
    }) => {
      if (d.conversationId !== conversationId) return;
      if (!info || d.userId !== info.other?.id) return;
      if (d.kind === "read") {
        setOtherReadAt((prev) => (!prev || prev < d.at ? d.at : prev));
        setOtherDeliveredAt((prev) => (!prev || prev < d.at ? d.at : prev));
      } else {
        setOtherDeliveredAt((prev) => (!prev || prev < d.at ? d.at : prev));
      }
    };

    s.on("message:new", onNew);
    s.on("message:status", onStatus);
    return () => {
      s.off("message:new", onNew);
      s.off("message:status", onStatus);
    };
  }, [conversationId, info, me.id, onConversationListDirty]);

  // ---- auto scroll ----
  useEffect(() => {
    if (nearBottom.current) {
      bottomAnchor.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;

    // load older messages when scrolled to top
    if (el.scrollTop < 60 && hasMore && messages.length > 0 && !loading) {
      const oldest = messages[0];
      try {
        const res = await api<{ messages: ChatMessage[]; hasMore: boolean }>(
          `/api/conversations/${conversationId}/messages?limit=50&before=${encodeURIComponent(oldest.createdAt)}`
        );
        if (res.messages.length) {
          const prevHeight = el.scrollHeight;
          setMessages((prev) => [...res.messages, ...prev]);
          setHasMore(res.hasMore);
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
            }
          });
        }
      } catch {
        /* ignore */
      }
    }
  }, [conversationId, hasMore, messages, loading]);

  // ---- typing ----
  const onInputChange = (v: string) => {
    setInput(v);
    const s = getSocket();
    if (!typingActive.current && v.trim()) {
      typingActive.current = true;
      s.emit("typing", { conversationId, isTyping: true });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingActive.current = false;
      s.emit("typing", { conversationId, isTyping: false });
    }, 1600);
  };

  // ---- send ----
  const send = () => {
    const content = input.trim();
    if (!content || sending) return;
    const s = getSocket();
    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}-${Math.random()}`;

    const temp: ChatMessage = {
      id: clientId,
      conversationId,
      senderId: me.id,
      content,
      createdAt: new Date().toISOString(),
      clientId,
      status: "pending",
    };
    setMessages((prev) => [...prev, temp]);
    setInput("");
    setSending(true);
    nearBottom.current = true;

    if (typingActive.current) {
      typingActive.current = false;
      s.emit("typing", { conversationId, isTyping: false });
    }

    s.timeout(15000).emit(
      "message:send",
      { conversationId, content, clientId },
      (err: unknown, resp: { ok: boolean; message?: ChatMessage; error?: string }) => {
        setSending(false);
        if (err || !resp?.ok) {
          setMessages((prev) =>
            prev.map((m) => (m.id === clientId ? { ...m, status: "failed" } : m))
          );
          toast({
            title: err ? "ارسال پیام ناموفق بود" : resp?.error || "ارسال ناموفق",
            variant: "destructive",
          });
          return;
        }
        if (resp.message) {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === clientId);
            if (idx === -1) {
              if (prev.some((m) => m.id === resp.message!.id)) return prev;
              return [...prev, { ...resp.message!, status: "sent" }];
            }
            const copy = [...prev];
            copy[idx] = { ...resp.message!, status: "sent" };
            return copy;
          });
          onConversationListDirty();
        }
      }
    );
  };

  // ---- block / unblock / report / delete ----
  const toggleBlock = async () => {
    if (!info?.other) return;
    try {
      if (info.iBlocked) {
        await api(`/api/blocks?username=${encodeURIComponent(info.other.username)}`, { method: "DELETE" });
        toast({ title: "کاربر رفع مسدودی شد" });
        setInfo((p) => (p ? { ...p, iBlocked: false } : p));
      } else {
        await api("/api/blocks", { method: "POST", json: { username: info.other.username } });
        toast({ title: "کاربر مسدود شد" });
        setInfo((p) => (p ? { ...p, iBlocked: true } : p));
      }
      onBlockChange();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const submitReport = async () => {
    if (!info?.other) return;
    try {
      await api("/api/reports", {
        method: "POST",
        json: { username: info.other.username, reason: reportReason, details: reportDetails },
      });
      setReportOpen(false);
      setReportDetails("");
      toast({ title: "گزارش شما ثبت شد و برای مدیر ارسال شد ✅" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const deleteConversation = async () => {
    try {
      await api(`/api/conversations/${conversationId}`, { method: "DELETE" });
      setDeleteOpen(false);
      toast({ title: "گفت‌وگو از فهرست شما حذف شد" });
      onConversationHidden();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const other = info?.other;
  const isTypingNow = typingUserIds.length > 0;

  const statusLine = isTypingNow
    ? "در حال نوشتن..."
    : other?.deleted
    ? "حساب حذف شده"
    : other
    ? formatLastSeen(other.lastSeen)
    : "";

  return (
    <div className="flex flex-col h-full bg-[#0b0614] relative">
      {/* header */}
      <header className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-[#120b22] border-b border-[#221639] z-10">
        <button
          onClick={onBack}
          aria-label="بازگشت"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#c9bfe4] hover:bg-[#1b1130] md:hidden"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        {other ? (
          <>
            <Avatar name={other.displayName} color={other.avatarColor} size={40} online={!other.deleted} />
            <div className="flex-1 min-w-0">
              <UserName
                name={other.deleted ? "کاربر حذف‌شده" : other.displayName}
                verified={other.isVerified}
                className="font-bold text-[14.5px] text-white"
              />
              <p className={cn("text-[11px]", isTypingNow ? "text-violet-300" : "text-[#8d7fb0]")}>
                {isTypingNow ? statusLine : (
                  <span dir="ltr" className="inline-block">
                    @{other.username}
                  </span>
                )}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 h-10" />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="منوی گفت‌وگو"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#c9bfe4] hover:bg-[#1b1130]"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#160d2a] border-[#2a1d45] text-[#ece6f8]">
            <DropdownMenuItem onClick={toggleBlock} className="gap-2 cursor-pointer">
              <Ban className="w-4 h-4" />
              {info?.iBlocked ? "رفع مسدودی کاربر" : "مسدودکردن کاربر"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2 cursor-pointer">
              <Flag className="w-4 h-4" />
              گزارش تخلف
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="gap-2 cursor-pointer text-red-400 focus:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              حذف گفت‌وگو
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1 su-scroll"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#8d7fb0] py-16">
            <div className="w-16 h-16 rounded-full bg-[#160d2a] flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7 text-violet-400" />
            </div>
            <p className="font-bold text-[#c9bfe4]">اولین پیام را بفرستید</p>
            <p className="text-sm mt-1">گفت‌وگوی شما کاملاً خصوصی است</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === me.id;
            const prev = messages[i - 1];
            const showDay = !prev || formatDayLabel(prev.createdAt) !== formatDayLabel(m.createdAt);
            const read = mine && !!otherReadAt && m.createdAt <= otherReadAt;
            const delivered = mine && !!otherDeliveredAt && m.createdAt <= otherDeliveredAt;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-[#8d7fb0] bg-[#160d2a] border border-[#221639] rounded-full px-3 py-1">
                      {formatDayLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                <div className={cn("flex", mine ? "justify-end" : "justify-start", "px-1")}>
                  <div
                    className={cn(
                      "max-w-[82%] sm:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm animate-pop",
                      mine
                        ? "bg-gradient-to-bl from-violet-600 to-purple-700 text-white rounded-bl-md"
                        : "bg-[#1e1633] text-[#ece6f8] rounded-br-md border border-[#2a1d45]"
                    )}
                  >
                    <p className="text-[13.5px] leading-6 whitespace-pre-wrap break-words">{m.content}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1 justify-end mt-0.5",
                        mine ? "text-white/70" : "text-[#6f6195]"
                      )}
                    >
                      <span className="text-[10px] tabular-nums">{formatTime(m.createdAt)}</span>
                      {mine && <MessageTicks status={m.status} read={read && delivered} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isTypingNow && (
          <div className="flex justify-start px-1">
            <div className="bg-[#1e1633] border border-[#2a1d45] rounded-2xl rounded-br-md px-4 py-3 flex items-center gap-1.5">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
              <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
        <div ref={bottomAnchor} />
      </div>

      {/* banners */}
      {(info?.iBlocked || info?.blockedMe || other?.deleted) && (
        <div className="mx-3 mb-2 flex items-center justify-center gap-2 text-[12.5px] text-[#c9bfe4] bg-[#160d2a] border border-[#2a1d45] rounded-xl px-3 py-2.5">
          <UserRoundX className="w-4 h-4 text-red-300 shrink-0" />
          <span>
            {info?.blockedMe
              ? "شما توسط این کاربر مسدود شده‌اید و امکان ارسال پیام نیست"
              : info?.iBlocked
              ? "شما این کاربر را مسدود کرده‌اید"
              : "این حساب حذف شده است"}
          </span>
          {info?.iBlocked && !info.blockedMe && (
            <button onClick={toggleBlock} className="text-violet-300 font-bold underline underline-offset-4">
              رفع مسدودی
            </button>
          )}
        </div>
      )}

      {/* composer */}
      <div className="px-2 sm:px-3 pb-3 pt-1 bg-[#0b0614]">
        <div className="flex items-end gap-2 bg-[#160d2a] border border-[#2a1d45] focus-within:border-violet-500/60 rounded-2xl px-2 py-1.5 transition-colors">
          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={info?.iBlocked || info?.blockedMe || other?.deleted ? "ارسال پیام ممکن نیست" : "پیام خود را بنویسید..."}
            disabled={info?.iBlocked || info?.blockedMe || other?.deleted}
            rows={1}
            className="min-h-10 max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[13.5px] text-[#ece6f8] placeholder:text-[#584c78]"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || sending || info?.iBlocked || info?.blockedMe || other?.deleted}
            size="icon"
            aria-label="ارسال پیام"
            className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-bl from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]"
          >
            <Send className="w-4.5 h-4.5 -scale-x-100" />
          </Button>
        </div>
      </div>

      {/* report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-[#140b24] border-[#2a1d45] text-[#ece6f8] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-right">گزارش تخلف کاربر</DialogTitle>
            <DialogDescription className="text-right text-[#8d7fb0]">
              گزارش شما برای مدیر سیستم ارسال می‌شود
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={reportReason} onValueChange={setReportReason} className="gap-3">
            {[
              { v: "spam", l: "ارسال هرزنامه (اسپم)" },
              { v: "harassment", l: "آزار و اذیت" },
              { v: "impersonation", l: "جعل هویت" },
              { v: "illegal", l: "محتوای غیرقانونی" },
              { v: "other", l: "سایر" },
            ].map((r) => (
              <div key={r.v} className="flex items-center gap-2">
                <RadioGroupItem value={r.v} id={`r-${r.v}`} className="border-[#4a3a6e] text-violet-400" />
                <Label htmlFor={`r-${r.v}`} className="text-[13.5px] cursor-pointer">{r.l}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="توضیحات بیشتر (اختیاری)"
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            maxLength={500}
            className="bg-[#0f081d] border-[#2a1d45] text-[13.5px] resize-none"
            rows={3}
          />
          <DialogFooter className="flex-row justify-start gap-2">
            <Button onClick={submitReport} className="bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white">
              ثبت گزارش
            </Button>
            <Button onClick={() => setReportOpen(false)} variant="ghost" className="text-[#c9bfe4]">
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete conversation alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#140b24] border-[#2a1d45] text-[#ece6f8] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف گفت‌وگو</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-[#8d7fb0]">
              این گفت‌وگو از فهرست شما حذف می‌شود. اگر کاربر پیام جدیدی بفرستد، دوباره نمایش داده می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-start gap-2">
            <AlertDialogAction
              onClick={deleteConversation}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              حذف کن
            </AlertDialogAction>
            <AlertDialogCancel className="bg-transparent border-[#2a1d45] text-[#c9bfe4]">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
