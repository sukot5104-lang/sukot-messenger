import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { logSystem } from "@/lib/logger";

/** GET /api/admin/reports — list reports with reporter/reported info */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);

  const reports = await db.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      reporter: { select: { username: true, displayName: true, deletedAt: true } },
      reported: { select: { username: true, displayName: true, deletedAt: true, isBanned: true } },
    },
  });

  return Response.json({
    ok: true,
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: r.reporter
        ? { username: r.reporter.username, displayName: r.reporter.displayName, deleted: !!r.reporter.deletedAt }
        : null,
      reported: r.reported
        ? {
            username: r.reported.username,
            displayName: r.reported.displayName,
            deleted: !!r.reported.deletedAt,
            isBanned: r.reported.isBanned,
          }
        : null,
    })),
  });
}

/** PATCH /api/admin/reports — change report status */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);

  const body = await req.json().catch(() => null);
  const reportId = typeof body?.reportId === "string" ? body.reportId : "";
  const status = body?.status;
  if (!reportId || !["open", "resolved", "dismissed"].includes(status))
    return jsonError("ورودی نامعتبر", 400);

  await db.report.update({ where: { id: reportId }, data: { status } });
  logSystem("action", "admin", `report ${reportId} → ${status}`);
  return Response.json({ ok: true });
}
