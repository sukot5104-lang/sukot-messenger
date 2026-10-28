"use client";

import { cn } from "@/lib/utils";

/** Circular avatar with the user's initial and stored color.
 *  Official Sukot account renders the brand logo image instead of an initial. */
export const OFFICIAL_LOGO_SRC = "/logo.png";

export function isOfficialUser(username?: string | null): boolean {
  return !!username && username.trim().toLowerCase() === "sukot";
}

export function Avatar({
  name,
  color,
  size = 44,
  online,
  className,
  src,
}: {
  name: string;
  color: string;
  size?: number;
  online?: boolean;
  className?: string;
  src?: string;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-bold text-white select-none overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, #6d28d9 100%)`,
          fontSize: size * 0.42,
          boxShadow: `0 0 ${size / 4}px ${color}55`,
        }}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          initial
        )}
      </div>
      {online && (
        <span
          className="absolute -bottom-0.5 -left-0.5 rounded-full bg-[#22c55e] border-2 border-[#120b22]"
          style={{ width: Math.max(10, size * 0.26), height: Math.max(10, size * 0.26) }}
        />
      )}
    </div>
  );
}

/** Green verified tick (official accounts) */
export function VerifiedBadge({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
      aria-label="حساب رسمی"
      role="img"
    >
      <circle cx="12" cy="12" r="11" fill="#22c55e" />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Name with optional verified tick */
export function UserName({
  name,
  verified,
  className,
  badgeSize = 15,
}: {
  name: string;
  verified?: boolean;
  className?: string;
  badgeSize?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 min-w-0", className)}>
      <span className="truncate">{name}</span>
      {verified && <VerifiedBadge size={badgeSize} />}
    </span>
  );
}

/** Delivery ticks for my messages */
export function MessageTicks({
  status,
  read,
}: {
  status: "pending" | "sent" | "failed" | undefined;
  read: boolean;
}) {
  if (status === "pending")
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" className="inline-block opacity-60">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    );
  if (status === "failed")
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" className="inline-block text-red-300">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <path d="M10 6.5v4.5M10 13.4v.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  if (read)
    return (
      <svg viewBox="0 0 22 20" width="18" height="15" className="inline-block text-violet-300 drop-shadow-[0_0_3px_rgba(139,92,246,0.8)]">
        <path d="M2 11l3.5 3.5L12 8" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 11l3.5 3.5L19 8" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 22 20" width="18" height="15" className="inline-block opacity-70">
      <path d="M2 11l3.5 3.5L12 8" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11l3.5 3.5L19 8" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fa = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" });
const faDay = new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" });
const faFull = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" });

export function formatTime(iso: string): string {
  return fa.format(new Date(iso));
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - day.getTime()) / 86400000;
  if (diff === 0) return "امروز";
  if (diff === 1) return "دیروز";
  if (diff < 7) return faDay.format(d);
  return faFull.format(d);
}

export function formatLastSeen(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "چند لحظه پیش";
  if (sec < 3600) return `آخرین بازدید ${Math.floor(sec / 60)} دقیقه پیش`;
  if (sec < 86400) return `آخرین بازدید ${Math.floor(sec / 3600)} ساعت پیش`;
  if (sec < 2 * 86400) return "آخرین بازدید دیروز";
  return `آخرین بازدید ${faFull.format(d)}`;
}

export function formatListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - day.getTime()) / 86400000;
  if (diff === 0) return fa.format(d);
  if (diff === 1) return "دیروز";
  return faFull.format(d);
}
