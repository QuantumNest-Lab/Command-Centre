import { NextResponse } from "next/server";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("settings.view")) throw new AppError("FORBIDDEN", "You do not have permission to view storage settings.", 403);

    const [usage] = await db()<{ total_files: number; total_bytes: number | null; images: number; videos: number; documents: number; other: number }[]>`
      select
        count(*)::int as total_files,
        coalesce(sum(size_bytes), 0) as total_bytes,
        count(*) filter (where media_type like 'image/%') as images,
        count(*) filter (where media_type like 'video/%') as videos,
        count(*) filter (where media_type not like 'image/%' and media_type not like 'video/%') as documents,
        count(*) filter (where media_type is null and is_folder = false) as other
      from file_objects
      where workspace_id = ${context.workspaceId} and archived_at is null and is_folder = false`;

    const [subscription] = await db()<{ seat_limit: number | null; storage_limit_bytes: number | null }[]>`
      select s.seat_limit, null as storage_limit_bytes
      from workspace_subscriptions s
      where s.workspace_id = ${context.workspaceId}`;

    const limitBytes = 50 * 1024 * 1024 * 1024; // 50 GB default
    const usedBytes = Number(usage.total_bytes || 0);
    const usedPercent = Math.round((usedBytes / limitBytes) * 100);

    return NextResponse.json({
      stats: {
        totalFiles: Number(usage.total_files || 0),
        totalBytes: usedBytes,
        images: Number(usage.images || 0),
        videos: Number(usage.videos || 0),
        documents: Number(usage.documents || 0),
        other: Number(usage.other || 0),
        usedPercent,
        limitBytes,
      },
    });
  } catch (error) { return apiError(error); }
}