"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";
import type { SearchResult } from "@/lib/types";
import { Avatar, UserName, formatLastSeen } from "./common";
import {
  ChevronRight,
  Search as SearchIcon,
  Loader2,
  MessageCircle,
  BadgeCheck,
  Loader2 as Spinner,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchViewProps {
  meId: string;
  online: Set<string>;
  onBack: () => void;
  onOpenConversation: (conversationId: string) => void;
}

export function SearchView({ meId, online, onBack, onOpenConversation }: SearchViewProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [official, setOfficial] = useState<SearchResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load official Sukot support account
  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ results: SearchResult[] }>("/api/users/search?q=sukot");
        const sukot = res.results.find((u) => u.username.toLowerCase() === "sukot");
        if (sukot) setOfficial(sukot);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      setSearched(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await api<{ results: SearchResult[] }>(
          `/api/users/search?q=${encodeURIComponent(q)}`
        );
        setResults(res.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const startChat = async (username: string) => {
    setOpening(username);
    try {
      const res = await api<{ conversationId: string }>("/api/conversations", {
        method: "POST",
        json: { username },
      });
      onOpenConversation(res.conversationId);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    } finally {
      setOpening(null);
    }
  };

  const UserRow = ({ u }: { u: SearchResult }) => (
    <button
      onClick={() => startChat(u.username)}
      disabled={opening !== null}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1e1338] transition-colors text-right disabled:opacity-60"
    >
      <Avatar
        name={u.displayName}
        color={u.avatarColor}
        size={46}
        online={online.has(u.id)}
      />
      <div className="flex-1 min-w-0">
        <UserName name={u.displayName} verified={u.isVerified} className="font-bold text-[14px] text-[#ece6f8]" />
        <p className="text-[12px] text-[#8d7fb0]" dir="ltr">
          @{u.username}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {opening === u.username ? (
          <Spinner className="w-4 h-4 text-violet-400 animate-spin" />
        ) : (
          <MessageCircle className="w-4.5 h-4.5 text-violet-400" />
        )}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#0b0614]">
      <header className="flex items-center gap-2 px-3 py-3 bg-[#120b22] border-b border-[#221639]">
        <button
          onClick={onBack}
          aria-label="بازگشت"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#c9bfe4] hover:bg-[#1b1130] md:hidden"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f6195]" />
          <Input
            autoFocus
            dir="ltr"
            className="bg-[#0f081d] border-[#2a1d45] pr-9 placeholder:text-[#584c78] focus-visible:ring-violet-500/50 text-left"
            placeholder="جست‌وجوی آیدی... مثلا Sukot"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 animate-spin" />
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-3 su-scroll">
        {/* Official support card — always visible */}
        {official && (
          <div className="mb-4 mx-1">
            <p className="text-[11px] text-[#6f6195] px-2 mb-2">پشتیبانی رسمی</p>
            <button
              onClick={() => startChat(official.username)}
              disabled={opening !== null}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-l from-violet-600/15 to-fuchsia-600/10 border border-violet-500/30 hover:border-violet-400/50 transition-all text-right shadow-[0_0_24px_rgba(139,92,246,0.12)]"
            >
              <Avatar
                name={official.displayName}
                color={official.avatarColor}
                size={52}
                online={online.has(official.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-[15px] text-white" dir="ltr">
                    {official.displayName}
                  </span>
                  <BadgeCheck className="w-4.5 h-4.5 text-green-400" />
                </div>
                <p className="text-[12px] text-violet-300 mt-0.5" dir="ltr">
                  @{official.username}
                </p>
                <p className="text-[11.5px] text-[#8d7fb0] mt-1">
                  هر مشکل یا پیشنهادی دارید، همین‌جا پیام بدهید
                </p>
              </div>
              {opening === official.username ? (
                <Spinner className="w-5 h-5 text-violet-300 animate-spin" />
              ) : (
                <MessageCircle className="w-5 h-5 text-violet-300" />
              )}
            </button>
          </div>
        )}

        {query.trim() && (
          <div className="mx-1">
            <p className="text-[11px] text-[#6f6195] px-2 mb-2">نتایج جست‌وجو</p>
            {results.length > 0 ? (
              <ul className="space-y-0.5">
                {results.map((u) => (
                  <li key={u.id}>
                    <UserRow u={u} />
                  </li>
                ))}
              </ul>
            ) : searched && !searching ? (
              <p className="text-center text-sm text-[#8d7fb0] py-8">
                کاربری با آیدی «{query}» پیدا نشد
              </p>
            ) : null}
          </div>
        )}

        {!query.trim() && !official && (
          <p className="text-center text-sm text-[#8d7fb0] py-10">در حال بارگذاری...</p>
        )}
      </div>
    </div>
  );
}
