"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";
import { Avatar, UserName, VerifiedBadge, formatListTime } from "./common";
import {
  ChevronRight,
  Lock,
  Loader2,
  Users,
  Zap,
  MessageSquare,
  Flag,
  Ban,
  UserX,
  KeyRound,
  ScrollText,
  MoreVertical,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Search as SearchIcon,
  BadgeCheck,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  deletedUsers: number;
  totalMessages: number;
  totalConversations: number;
  openReports: number;
  reservedCount: number;
  onlineCount: number;
}

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  isVerified: boolean;
  isBanned: boolean;
  banReason: string;
  deletedAt: string | null;
  lastSeen: string;
  createdAt: string;
  online: boolean;
}

interface AdminReport {
  id: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  reporter: { username: string; displayName: string; deleted: boolean } | null;
  reported: { username: string; displayName: string; deleted: boolean; isBanned: boolean } | null;
}

interface ReservedItem {
  id: string;
  nameLower: string;
  note: string;
}

const REASON_FA: Record<string, string> = {
  spam: "هرزنامه",
  harassment: "آزار و اذیت",
  impersonation: "جعل هویت",
  illegal: "محتوای غیرقانونی",
  other: "سایر",
};

export function AdminView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reserved, setReserved] = useState<ReservedItem[]>([]);
  const [newReserved, setNewReserved] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [policy, setPolicy] = useState<"release" | "reserve">("reserve");
  const [savingPolicy, setSavingPolicy] = useState(false);

  // check existing admin session
  useEffect(() => {
    (async () => {
      try {
        await api("/api/admin/stats");
        setAuthed(true);
      } catch {
        setAuthed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [s, u, r, rv, st] = await Promise.all([
        api<{ stats: AdminStats }>("/api/admin/stats"),
        api<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(userQuery)}`),
        api<{ reports: AdminReport[] }>("/api/admin/reports"),
        api<{ reserved: ReservedItem[] }>("/api/admin/reserved"),
        api<{ settings: { id_delete_policy: "release" | "reserve" } }>("/api/admin/settings"),
      ]);
      setStats(s.stats);
      setUsers(u.users);
      setReports(r.reports);
      setReserved(rv.reserved);
      setPolicy(st.settings.id_delete_policy);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  }, [userQuery, toast]);

  const loadLogs = useCallback(async () => {
    try {
      const res = await api<{ lines: string[] }>("/api/admin/logs");
      setLogs(res.lines);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadAll();
      loadLogs();
    }
  }, [authed, loadAll, loadLogs]);

  // re-fetch users when query changes (debounced)
  useEffect(() => {
    if (!authed) return;
    const t = setTimeout(() => {
      api<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(userQuery)}`)
        .then((res) => setUsers(res.users))
        .catch(() => undefined);
    }, 400);
    return () => clearTimeout(t);
  }, [userQuery, authed]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      await api("/api/admin/login", { method: "POST", json: { password } });
      setAuthed(true);
      toast({ title: "خوش آمدید مدیر 👑" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    } finally {
      setLoggingIn(false);
    }
  };

  const userAction = async (userId: string, action: string, reason = "") => {
    try {
      await api("/api/admin/users", { method: "PATCH", json: { userId, action, reason } });
      toast({ title: "انجام شد ✅" });
      loadAll();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const reportAction = async (reportId: string, status: string) => {
    try {
      await api("/api/admin/reports", { method: "PATCH", json: { reportId, status } });
      loadAll();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const addReserved = async () => {
    if (!newReserved.trim()) return;
    try {
      await api("/api/admin/reserved", { method: "POST", json: { name: newReserved.trim() } });
      setNewReserved("");
      toast({ title: "آیدی رزرو شد ✅" });
      loadAll();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const removeReserved = async (id: string) => {
    try {
      await api(`/api/admin/reserved?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      loadAll();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      await api("/api/admin/settings", { method: "PATCH", json: { id_delete_policy: policy } });
      toast({ title: "سیاست ذخیره شد ✅" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    } finally {
      setSavingPolicy(false);
    }
  };

  // ---- login gate ----
  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0b0614]">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4 bg-[#0b0614] relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-1/4 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl" />
        <form
          onSubmit={login}
          className="w-full max-w-xs bg-[#140b24] border border-[#2a1d45] rounded-2xl p-6 space-y-4 relative"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.4)] mb-3">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-black text-white">پنل مدیریت SUKOT</h1>
            <p className="text-xs text-[#8d7fb0] mt-1">دسترسی فقط برای مدیر سیستم</p>
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f6195]" />
            <Input
              type="password"
              dir="ltr"
              placeholder="رمز مدیریت"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#0f081d] border-[#2a1d45] pr-9 text-right focus-visible:ring-violet-500/50"
            />
          </div>
          <Button
            type="submit"
            disabled={loggingIn}
            className="w-full h-10 bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white font-bold"
          >
            {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "ورود مدیر"}
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="w-full text-center text-xs text-[#8d7fb0] hover:text-violet-300"
          >
            بازگشت به پیام‌رسان
          </button>
        </form>
      </div>
    );
  }

  // ---- dashboard ----
  const faNum = new Intl.NumberFormat("fa-IR");

  return (
    <div className="min-h-dvh bg-[#0b0614] flex flex-col">
      <header className="flex items-center gap-2 px-3 py-3 bg-[#120b22] border-b border-[#221639] sticky top-0 z-10">
        <button
          onClick={onBack}
          aria-label="بازگشت"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#c9bfe4] hover:bg-[#1b1130]"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <h1 className="font-black text-white text-[15px]">پنل مدیریت SUKOT MESSENGER</h1>
        </div>
        <button
          onClick={() => {
            loadAll();
            loadLogs();
          }}
          aria-label="به‌روزرسانی"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#8d7fb0] hover:bg-[#1b1130] hover:text-violet-300"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto px-3 py-4 space-y-4">
        {/* stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <StatCard icon={<Users className="w-5 h-5" />} label="کل کاربران" value={faNum.format(stats.totalUsers)} />
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              label="آنلاین"
              value={faNum.format(stats.onlineCount)}
              accent="text-green-400"
              glow="rgba(34,197,94,0.2)"
            />
            <StatCard icon={<MessageSquare className="w-5 h-5" />} label="کل پیام‌ها" value={faNum.format(stats.totalMessages)} />
            <StatCard icon={<Users className="w-5 h-5" />} label="گفت‌وگوها" value={faNum.format(stats.totalConversations)} />
            <StatCard
              icon={<Flag className="w-5 h-5" />}
              label="گزارش‌های باز"
              value={faNum.format(stats.openReports)}
              accent="text-amber-400"
              glow="rgba(251,191,36,0.15)"
            />
            <StatCard icon={<Ban className="w-5 h-5" />} label="مسدودشده" value={faNum.format(stats.bannedUsers)} />
            <StatCard icon={<UserX className="w-5 h-5" />} label="حساب‌های حذف‌شده" value={faNum.format(stats.deletedUsers)} />
            <StatCard icon={<KeyRound className="w-5 h-5" />} label="آیدی رزروشده" value={faNum.format(stats.reservedCount)} />
          </div>
        )}

        <Tabs defaultValue="users" dir="rtl">
          <TabsList className="bg-[#140b24] border border-[#221639] w-full flex-wrap h-auto gap-1 justify-start p-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-violet-600/30 data-[state=active]:text-white text-[#9d8fbf]">
              کاربران
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-violet-600/30 data-[state=active]:text-white text-[#9d8fbf]">
              گزارش‌ها {stats && stats.openReports > 0 && <span className="mr-1 bg-amber-500 text-black text-[10px] px-1.5 rounded-full">{faNum.format(stats.openReports)}</span>}
            </TabsTrigger>
            <TabsTrigger value="reserved" className="data-[state=active]:bg-violet-600/30 data-[state=active]:text-white text-[#9d8fbf]">
              آیدی‌های رزرو
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-violet-600/30 data-[state=active]:text-white text-[#9d8fbf]">
              تنظیمات
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-violet-600/30 data-[state=active]:text-white text-[#9d8fbf]">
              لاگ‌ها
            </TabsTrigger>
          </TabsList>

          {/* users */}
          <TabsContent value="users" className="space-y-2">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f6195]" />
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="جست‌وجوی کاربران..."
                className="bg-[#140b24] border-[#2a1d45] pr-9 focus-visible:ring-violet-500/50"
              />
            </div>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto su-scroll">
              {users.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl bg-[#140b24] border",
                    u.deletedAt ? "border-[#2a1d45]/50 opacity-60" : "border-[#221639]"
                  )}
                >
                  <Avatar name={u.displayName} color={u.avatarColor} size={40} online={u.online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <UserName name={u.displayName} verified={u.isVerified} className="font-bold text-[13.5px] text-white" />
                      {u.username.toLowerCase() === "sukot" && (
                        <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 rounded">رسمی</span>
                      )}
                      {u.isBanned && <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 rounded">مسدود</span>}
                      {u.deletedAt && <span className="text-[10px] bg-[#4a3a6e] text-[#c9bfe4] px-1.5 rounded">حذف‌شده</span>}
                    </div>
                    <p className="text-[11.5px] text-[#8d7fb0]">
                      <span dir="ltr">@{u.username}</span> · عضویت {formatListTime(u.createdAt)}
                      {u.banReason ? ` · ${u.banReason}` : ""}
                    </p>
                  </div>
                  {u.username.toLowerCase() !== "sukot" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="عملیات"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8d7fb0] hover:bg-[#1b1130]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-[#160d2a] border-[#2a1d45] text-[#ece6f8]">
                        {!u.deletedAt && (
                          <>
                            <DropdownMenuItem
                              onClick={() => userAction(u.id, u.isBanned ? "unban" : "ban")}
                              className="gap-2 cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                              {u.isBanned ? "رفع مسدودی" : "مسدودکردن"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => userAction(u.id, u.isVerified ? "unverify" : "verify")}
                              className="gap-2 cursor-pointer"
                            >
                              <BadgeCheck className="w-4 h-4" />
                              {u.isVerified ? "لغو تیک تأیید" : "تأیید حساب (تیک سبز)"}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => userAction(u.id, u.deletedAt ? "free" : "delete")}
                          className="gap-2 cursor-pointer text-red-400 focus:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                          {u.deletedAt ? "حذف و آزادسازی آیدی" : "حذف حساب و آزادسازی آیدی"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
              {users.length === 0 && <p className="text-center text-sm text-[#8d7fb0] py-8">کاربری پیدا نشد</p>}
            </div>
          </TabsContent>

          {/* reports */}
          <TabsContent value="reports" className="space-y-1.5 max-h-[65vh] overflow-y-auto su-scroll">
            {reports.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-[#140b24] border border-[#221639] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px]">
                    <span className="text-[#8d7fb0]">گزارش‌دهنده: </span>
                    <b className="text-[#ece6f8]">{r.reporter?.displayName ?? "کاربر حذف‌شده"}</b>
                    {r.reporter && <span className="text-[#6f6195]" dir="ltr"> @{r.reporter.username}</span>}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full",
                      r.status === "open"
                        ? "bg-amber-500/15 text-amber-400"
                        : r.status === "resolved"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-[#4a3a6e] text-[#9d8fbf]"
                    )}
                  >
                    {r.status === "open" ? "باز" : r.status === "resolved" ? "رسیدگی شد" : "رد شد"}
                  </span>
                </div>
                <p className="text-[13px]">
                  <span className="text-[#8d7fb0]">شاکی از: </span>
                  <b className="text-red-300">{r.reported?.displayName ?? "کاربر حذف‌شده"}</b>
                  {r.reported && <span className="text-[#6f6195]" dir="ltr"> @{r.reported.username}</span>}
                  <span className="text-[#8d7fb0]"> · علت: </span>
                  <span className="text-[#ece6f8]">{REASON_FA[r.reason] ?? r.reason}</span>
                </p>
                {r.details && <p className="text-[12px] text-[#9d8fbf] bg-[#0f081d] rounded-lg p-2">{r.details}</p>}
                <p className="text-[10.5px] text-[#6f6195]">{formatListTime(r.createdAt)}</p>
                <div className="flex gap-2 flex-wrap">
                  {r.status === "open" && (
                    <>
                      <Button size="sm" onClick={() => reportAction(r.id, "resolved")} className="h-8 bg-green-600 hover:bg-green-500 text-white">
                        رسیدگی شد
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reportAction(r.id, "dismissed")}
                        className="h-8 border-[#2a1d45] text-[#c9bfe4]"
                      >
                        رد گزارش
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {reports.length === 0 && <p className="text-center text-sm text-[#8d7fb0] py-8">گزارشی ثبت نشده است</p>}
          </TabsContent>

          {/* reserved ids */}
          <TabsContent value="reserved" className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newReserved}
                onChange={(e) => setNewReserved(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="آیدی جدید برای رزرو (لاتین)"
                dir="ltr"
                maxLength={20}
                className="bg-[#140b24] border-[#2a1d45] focus-visible:ring-violet-500/50"
              />
              <Button
                onClick={addReserved}
                className="bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                رزرو
              </Button>
            </div>
            <div className="space-y-1 max-h-[55vh] overflow-y-auto su-scroll">
              {reserved.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#140b24] border border-[#221639]">
                  <KeyRound className="w-4 h-4 text-violet-400" />
                  <span className="font-bold text-[13px] text-[#ece6f8]" dir="ltr">
                    @{r.nameLower}
                  </span>
                  <span className="text-[11px] text-[#6f6195] flex-1">{r.note}</span>
                  <button
                    onClick={() => removeReserved(r.id)}
                    aria-label="حذف رزرو"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* settings */}
          <TabsContent value="settings">
            <div className="p-4 rounded-xl bg-[#140b24] border border-[#221639] space-y-4">
              <div>
                <h3 className="font-bold text-[14px] text-white mb-1">سیاست آیدی پس از حذف حساب</h3>
                <p className="text-[12px] text-[#8d7fb0]">
                  تعیین می‌کند آیدی کاربر بعد از حذف حساب چه شود
                </p>
              </div>
              <RadioGroup value={policy} onValueChange={(v) => setPolicy(v as "release" | "reserve")} className="gap-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0f081d] border border-[#221639]">
                  <RadioGroupItem value="reserve" id="pol-reserve" className="mt-1 border-[#4a3a6e] text-violet-400" />
                  <div>
                    <Label htmlFor="pol-reserve" className="text-[13.5px] text-white cursor-pointer font-bold">
                      رزرو دائمی آیدی
                    </Label>
                    <p className="text-[12px] text-[#8d7fb0] mt-1">
                      آیدی حذف‌شده برای همیشه رزرو می‌ماند و هیچ‌کس نمی‌تواند آن را ثبت کند (امن‌تر)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0f081d] border border-[#221639]">
                  <RadioGroupItem value="release" id="pol-release" className="mt-1 border-[#4a3a6e] text-violet-400" />
                  <div>
                    <Label htmlFor="pol-release" className="text-[13.5px] text-white cursor-pointer font-bold">
                      آزادسازی آیدی
                    </Label>
                    <p className="text-[12px] text-[#8d7fb0] mt-1">
                      پس از حذف کامل حساب، آیدی آزاد می‌شود و کاربر دیگری می‌تواند آن را ثبت کند
                    </p>
                  </div>
                </div>
              </RadioGroup>
              <Button
                onClick={savePolicy}
                disabled={savingPolicy}
                className="bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white gap-2"
              >
                {savingPolicy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره سیاست
              </Button>
            </div>
          </TabsContent>

          {/* logs */}
          <TabsContent value="logs">
            <div className="rounded-xl bg-[#0a0512] border border-[#221639] p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-bold text-[#c9bfe4] flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4" />
                  لاگ سیستم (۲۰۰ خط آخر)
                </h3>
                <button onClick={loadLogs} className="text-[#8d7fb0] hover:text-violet-300">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <pre
                dir="ltr"
                className="text-[10.5px] leading-5 text-green-300/80 font-mono max-h-[55vh] overflow-auto su-scroll whitespace-pre-wrap"
              >
                {logs.length > 0 ? logs.join("\n") : "لاگی ثبت نشده است"}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = "text-violet-300",
  glow = "rgba(139,92,246,0.15)",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  glow?: string;
}) {
  return (
    <div
      className="p-3.5 rounded-xl bg-[#140b24] border border-[#221639]"
      style={{ boxShadow: `0 0 20px ${glow}` }}
    >
      <div className={cn("flex items-center gap-2", accent)}>
        {icon}
        <span className="text-[11.5px] text-[#9d8fbf]">{label}</span>
      </div>
      <p className="text-xl font-black text-white mt-1.5 tabular-nums">{value}</p>
    </div>
  );
}
