"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";
import { Loader2, Lock, User as UserIcon, Sparkles, Check, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthViewProps {
  onAuthed: (me: { id: string; username: string; displayName: string }, online: string[]) => void;
  mode: "login" | "register";
  onSwitchMode: (m: "login" | "register") => void;
}

export function AuthView({ onAuthed, mode, onSwitchMode }: AuthViewProps) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-[#0b0614] relative overflow-hidden">
      {/* neon glow background */}
      <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-fuchsia-600/15 blur-3xl" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.45)] mb-4">
            <Sparkles className="w-9 h-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white" dir="ltr">
            SUKOT <span className="bg-gradient-to-l from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">MESSENGER</span>
          </h1>
          <p className="text-sm text-[#9d8fbf] mt-2">پیام‌رسان سریع، امن و ساده</p>
        </div>

        {mode === "login" ? <LoginForm onAuthed={onAuthed} /> : <RegisterForm onAuthed={onAuthed} />}

        <div className="mt-6 text-center text-sm">
          {mode === "login" ? (
            <button
              className="text-violet-300 hover:text-violet-200 transition-colors"
              onClick={() => onSwitchMode("register")}
            >
              حساب ندارید؟ <span className="font-bold">ساخت حساب جدید</span>
            </button>
          ) : (
            <button
              className="text-violet-300 hover:text-violet-200 transition-colors"
              onClick={() => onSwitchMode("login")}
            >
              قبلاً ثبت‌نام کرده‌اید؟ <span className="font-bold">ورود به حساب</span>
            </button>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#6f6195]">
          <ShieldCheck className="w-4 h-4" />
          <span>ثبت‌نام بدون شماره موبایل — فقط با آیدی اختصاصی</span>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onAuthed }: { onAuthed: AuthViewProps["onAuthed"] }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast({ title: "لطفاً آیدی و رمز عبور را وارد کنید", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ ok: true; online: string[]; user: { id: string; username: string; displayName: string } }>(
        "/api/auth/login",
        { method: "POST", json: { username: username.trim(), password } }
      );
      onAuthed(res.user, res.online ?? []);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا در ورود", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 bg-[#140b24]/80 border border-[#2a1d45] rounded-2xl p-6 backdrop-blur">
      <div className="space-y-2">
        <Label htmlFor="login-id" className="text-[#c9bfe4]">آیدی اختصاصی</Label>
        <div className="relative">
          <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f6195]" />
          <Input
            id="login-id"
            dir="ltr"
            className="bg-[#0f081d] border-[#2a1d45] text-right pr-9 placeholder:text-[#584c78] focus-visible:ring-violet-500/50"
            placeholder="Sukot"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-pass" className="text-[#c9bfe4]">رمز عبور</Label>
        <div className="relative">
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f6195]" />
          <Input
            id="login-pass"
            type="password"
            dir="ltr"
            className="bg-[#0f081d] border-[#2a1d45] text-right pr-9 placeholder:text-[#584c78] focus-visible:ring-violet-500/50"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold shadow-[0_4px_24px_rgba(139,92,246,0.35)]"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ورود به حساب"}
      </Button>
    </form>
  );
}

function RegisterForm({ onAuthed }: { onAuthed: AuthViewProps["onAuthed"] }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [avail, setAvail] = useState<null | { ok: boolean; reason: string | null }>(null);
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // live username availability check (server-side)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const u = username.trim();
    if (!u) {
      setAvail(null);
      return;
    }
    setChecking(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await api<{ available: boolean; reason: string | null }>(
          `/api/auth/check-username?username=${encodeURIComponent(u)}`
        );
        setAvail({ ok: res.available, reason: res.reason });
      } catch {
        setAvail(null);
      } finally {
        setChecking(false);
      }
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    if (!u || !displayName.trim() || !password || !confirm) {
      toast({ title: "همه فیلدها الزامی است", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "تکرار رمز عبور مطابقت ندارد", variant: "destructive" });
      return;
    }
    if (avail && !avail.ok) {
      toast({ title: avail.reason || "این آیدی قابل ثبت نیست", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ ok: true; user: { id: string; username: string; displayName: string } }>(
        "/api/auth/register",
        { method: "POST", json: { username: u, displayName: displayName.trim(), password } }
      );
      toast({ title: "حساب شما ساخته شد! خوش آمدید 🎉" });
      onAuthed(res.user, []);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا در ثبت‌نام", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "bg-[#0f081d] border-[#2a1d45] text-right placeholder:text-[#584c78] focus-visible:ring-violet-500/50";

  return (
    <form onSubmit={submit} className="space-y-4 bg-[#140b24]/80 border border-[#2a1d45] rounded-2xl p-6 backdrop-blur">
      <div className="space-y-2">
        <Label htmlFor="reg-id" className="text-[#c9bfe4]">آیدی اختصاصی</Label>
        <div className="relative">
          <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6f6195]" />
          <Input
            id="reg-id"
            dir="ltr"
            className={cn(inputCls, "pr-9 pl-10")}
            placeholder="my_id"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            maxLength={20}
            autoComplete="off"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            {checking ? (
              <Loader2 className="w-4 h-4 text-[#6f6195] animate-spin" />
            ) : avail ? (
              avail.ok ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <X className="w-4 h-4 text-red-400" />
              )
            ) : null}
          </span>
        </div>
        {avail && !avail.ok && <p className="text-xs text-red-400">{avail.reason}</p>}
        {!avail && username && (
          <p className="text-xs text-[#6f6195]">۳ تا ۲۰ کاراکتر؛ حروف انگلیسی، عدد و _</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-name" className="text-[#c9bfe4]">نام نمایشی</Label>
        <Input
          id="reg-name"
          className={inputCls}
          placeholder="مثلاً علی رضایی"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={30}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-pass" className="text-[#c9bfe4]">رمز عبور</Label>
        <Input
          id="reg-pass"
          type="password"
          dir="ltr"
          className={inputCls}
          placeholder="حداقل ۶ کاراکتر"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-pass2" className="text-[#c9bfe4]">تکرار رمز عبور</Label>
        <Input
          id="reg-pass2"
          type="password"
          dir="ltr"
          className={inputCls}
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <Button
        type="submit"
        disabled={loading || (avail !== null && !avail.ok)}
        className="w-full h-11 bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold shadow-[0_4px_24px_rgba(139,92,246,0.35)]"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ساخت حساب"}
      </Button>
      <p className="text-[11px] text-center text-[#6f6195]">
        بدون شماره موبایل، بدون ایمیل، بدون کد پیامکی
      </p>
    </form>
  );
}
