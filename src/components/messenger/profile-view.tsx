"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client";
import type { PublicUser } from "@/lib/types";
import { Avatar, UserName, VerifiedBadge } from "./common";
import {
  ChevronRight,
  Copy,
  Pencil,
  Download,
  Ban,
  LogOut,
  Trash2,
  Loader2,
  Heart,
  Smartphone,
  ShieldCheck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_SWATCHES = ["#8b5cf6", "#a855f7", "#d946ef", "#e879f9", "#7c3aed", "#c026d3", "#6d28d9", "#ec4899"];

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  isVerified: boolean;
}

interface ProfileViewProps {
  me: PublicUser;
  onBack: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onUserUpdated: (u: PublicUser) => void;
  installPrompt: { prompt: () => void } | null;
}

export function ProfileView({ me, onBack, onLogout, onOpenAdmin, onUserUpdated, installPrompt }: ProfileViewProps) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(me.displayName);
  const [editBio, setEditBio] = useState(me.bio || "");
  const [editColor, setEditColor] = useState(me.avatarColor);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  const loadBlocked = async () => {
    try {
      const res = await api<{ blocked: BlockedUser[] }>("/api/blocks");
      setBlocked(res.blocked);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (blockedOpen) loadBlocked();
  }, [blockedOpen]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(me.username);
      toast({ title: "آیدی شما کپی شد ✅" });
    } catch {
      toast({ title: "کپی نشد؛ دستی انتخاب کنید", variant: "destructive" });
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      toast({ title: "نام نمایشی خالی است", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ user: PublicUser }>("/api/profile", {
        method: "PUT",
        json: { displayName: editName.trim(), bio: editBio.trim(), avatarColor: editColor },
      });
      onUserUpdated(res.user);
      setEditOpen(false);
      toast({ title: "پروفایل به‌روزرسانی شد ✅" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (username: string) => {
    try {
      await api(`/api/blocks?username=${encodeURIComponent(username)}`, { method: "DELETE" });
      setBlocked((prev) => prev.filter((b) => b.username !== username));
      toast({ title: "کاربر رفع مسدودی شد" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    onLogout();
  };

  const deleteAccount = async () => {
    if (!deletePassword) {
      toast({ title: "رمز عبور را وارد کنید", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      await api("/api/account", { method: "DELETE", json: { password: deletePassword } });
      setDeleteOpen(false);
      onLogout();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "خطا", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  const memberSince = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(
    new Date(me.createdAt)
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
        <h2 className="font-bold text-[15px] text-white">پروفایل و تنظیمات</h2>
      </header>

      <div className="flex-1 overflow-y-auto su-scroll">
        {/* identity */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <Avatar name={me.displayName} color={me.avatarColor} size={96} online />
          <div className="flex items-center gap-1.5 mt-3">
            <h3 className="text-lg font-black text-white">{me.displayName}</h3>
            {me.isVerified && <VerifiedBadge size={18} />}
          </div>
          <button
            onClick={copyId}
            className="mt-1 flex items-center gap-1.5 text-[13px] text-violet-300 hover:text-violet-200 bg-[#160d2a] border border-[#2a1d45] rounded-full px-3 py-1 transition-colors"
            dir="ltr"
          >
            @{me.username}
            <Copy className="w-3.5 h-3.5" />
          </button>
          {me.bio && <p className="text-[13px] text-[#8d7fb0] mt-3 text-center max-w-xs">{me.bio}</p>}
          <p className="text-[11px] text-[#6f6195] mt-2">عضو از {memberSince}</p>

          <Button
            onClick={() => {
              setEditName(me.displayName);
              setEditBio(me.bio || "");
              setEditColor(me.avatarColor);
              setEditOpen(true);
            }}
            variant="outline"
            className="mt-4 border-violet-500/40 text-violet-300 hover:bg-violet-500/10 gap-2"
          >
            <Pencil className="w-4 h-4" />
            ویرایش پروفایل
          </Button>
        </div>

        {/* menu */}
        <div className="px-3 pb-6 space-y-2 max-w-md mx-auto">
          <MenuButton
            icon={<Download className="w-5 h-5 text-violet-300" />}
            title="نصب برنامه روی دستگاه"
            subtitle={installPrompt ? "نصب مستقیم — یک کلیک" : "راهنمای نصب"}
            onClick={() => {
              if (installPrompt) installPrompt.prompt();
              else setIosHelpOpen(true);
            }}
          />
          <MenuButton
            icon={<Ban className="w-5 h-5 text-violet-300" />}
            title="کاربران مسدودشده"
            subtitle="مدیریت فهرست مسدودها"
            onClick={() => setBlockedOpen(true)}
          />
          <MenuButton
            icon={<ShieldCheck className="w-5 h-5 text-violet-300" />}
            title="پنل مدیریت"
            subtitle="دسترسی ویژه مدیر سیستم"
            onClick={onOpenAdmin}
          />
          <MenuButton
            icon={<Info className="w-5 h-5 text-violet-300" />}
            title="درباره SUKOT MESSENGER"
            subtitle="نسخه ۱.۰.۰"
            onClick={() =>
              toast({
                title: "SUKOT MESSENGER v1.0.0",
                description: "پیام‌رسان آنلاین سریع و امن با آیدی اختصاصی — ساخته‌شده توسط Sukot",
              })
            }
          />
          <MenuButton
            icon={<LogOut className="w-5 h-5 text-amber-400" />}
            title="خروج از حساب"
            subtitle="ورود مجدد با آیدی و رمز عبور"
            onClick={logout}
          />

          {/* danger zone */}
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors text-right"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="font-bold text-[13.5px] text-red-300">حذف حساب</p>
              <p className="text-[11.5px] text-[#8d7fb0]">حذف کامل اطلاعات و پیام‌ها</p>
            </div>
          </button>

          {/* maker credit */}
          <div className="flex items-center justify-center gap-1.5 pt-4 pb-2 text-[12px] text-[#6f6195]">
            <span>ساخته‌شده با</span>
            <Heart className="w-3.5 h-3.5 text-fuchsia-500 fill-fuchsia-500" />
            <span>توسط</span>
            <span className="font-bold text-violet-300 flex items-center gap-1" dir="ltr">
              Sukot <VerifiedBadge size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#140b24] border-[#2a1d45] text-[#ece6f8] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-right">ویرایش پروفایل</DialogTitle>
            <DialogDescription className="text-right text-[#8d7fb0]">
              آیدی اختصاصی شما قابل تغییر نیست
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#c9bfe4]">نام نمایشی</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="bg-[#0f081d] border-[#2a1d45] focus-visible:ring-violet-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#c9bfe4]">بیوگرافی</Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={160}
                rows={2}
                className="bg-[#0f081d] border-[#2a1d45] resize-none focus-visible:ring-violet-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#c9bfe4]">رنگ آواتار</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    aria-label={`رنگ ${c}`}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      editColor === c ? "ring-2 ring-white scale-110" : "hover:scale-105"
                    )}
                    style={{ background: `linear-gradient(135deg, ${c}, #6d28d9)` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-start gap-2">
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "ذخیره"}
            </Button>
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-[#c9bfe4]">
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* blocked users dialog */}
      <Dialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <DialogContent className="bg-[#140b24] border-[#2a1d45] text-[#ece6f8] max-w-sm rounded-2xl max-h-[70vh] overflow-y-auto su-scroll">
          <DialogHeader>
            <DialogTitle className="text-right">کاربران مسدودشده</DialogTitle>
            <DialogDescription className="text-right text-[#8d7fb0]">
              کاربران مسدودشده نمی‌توانند به شما پیام دهند
            </DialogDescription>
          </DialogHeader>
          {blocked.length === 0 ? (
            <p className="text-center text-sm text-[#8d7fb0] py-6">فهرست مسدودها خالی است</p>
          ) : (
            <ul className="space-y-1">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center gap-3 p-2 rounded-xl bg-[#0f081d]">
                  <Avatar name={b.displayName} color={b.avatarColor} size={38} />
                  <div className="flex-1 min-w-0">
                    <UserName name={b.displayName} verified={b.isVerified} className="font-bold text-[13.5px]" />
                    <p className="text-[11px] text-[#8d7fb0]" dir="ltr">
                      @{b.username}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unblock(b.username)}
                    className="border-violet-500/40 text-violet-300 h-8"
                  >
                    رفع مسدودی
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* install help dialog */}
      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent className="bg-[#140b24] border-[#2a1d45] text-[#ece6f8] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-violet-300" />
              نصب برنامه
            </DialogTitle>
          </DialogHeader>
          <div className="text-[13px] leading-7 text-[#c9bfe4] space-y-2">
            <p>
              <b className="text-white">اندروید (کروم):</b> منوی سه‌نقطه ← «Add to Home screen» یا دکمه نصب بالای صفحه
            </p>
            <p>
              <b className="text-white">iOS (سافاری):</b> دکمه اشتراک‌گذاری ← «Add to Home Screen»
            </p>
            <p>
              <b className="text-white">ویندوز (Edge/کروم):</b> منوی سه‌نقطه ← «Apps» ← «Install SUKOT MESSENGER»
            </p>
          </div>
          <DialogFooter className="flex-row justify-start">
            <Button onClick={() => setIosHelpOpen(false)} className="bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white">
              متوجه شدم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete account alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#140b24] border-[#2a1d45] text-[#ece6f8] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف حساب کاربری</AlertDialogTitle>
            <AlertDialogDescription className="text-right text-[#8d7fb0] leading-6">
              همه پیام‌ها و اطلاعات شما حذف می‌شود و قابل بازیابی نیست. برای تأیید، رمز عبور خود را وارد کنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            dir="ltr"
            placeholder="رمز عبور"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="bg-[#0f081d] border-[#2a1d45] text-right focus-visible:ring-red-500/50"
          />
          <AlertDialogFooter className="flex-row justify-start gap-2">
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteAccount();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف حساب"}
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

function MenuButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[#140b24] border border-[#221639] hover:border-violet-500/40 transition-colors text-right"
    >
      <div className="w-10 h-10 rounded-xl bg-[#1b1130] flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[13.5px] text-[#ece6f8]">{title}</p>
        <p className="text-[11.5px] text-[#8d7fb0]">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#4a3a6e] -scale-x-100" />
    </button>
  );
}
