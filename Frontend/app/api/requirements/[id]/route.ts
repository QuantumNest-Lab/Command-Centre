import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const update = z.object({ title: z.string().trim().min(2).max(240).optional(), status: z.enum(["REQUESTED", "REVIEWING", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]).optional(), archived: z.boolean().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("requirements.edit")) throw new AppError("FORBIDDEN", "You do not have permission to edit requirements.", 403);
    const { id } = await params, data = update.parse(await request.json());
    const [item] = await db().begin(async sql => {
      const [updated] = await sql<{ id: string; title: string; status: string }[]>`update requirements r set title = coalesce(${data.title || null}, r.title), status = coalesce(${data.status || null}, r.status), archived_at = case when ${data.archived === true} then now() else r.archived_at end where r.id = ${id}::uuid and r.workspace_id = ${context.workspaceId} and r.archived_at is null and (${context.role} <> 'MEMBER' or exists (select 1 from clients c where c.id = r.client_id and c.owner_user_id = ${context.userId}::uuid)) returning r.id, r.title, r.status`;
      if (!updated) return [];
      if (data.archived) {
        await sql`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${context.workspaceId}, ${context.userId}, 'requirement', ${updated.id}::uuid, 'ARCHIVED'::activity_action, ${JSON.stringify({ name: updated.title })}::jsonb)`;
        return [updated];
      }
      const [recentActivity] = await sql<{ id: string }[]>`select id from activities where workspace_id = ${context.workspaceId} and entity_type = 'requirement' and entity_id = ${updated.id}::uuid and action in ('CREATED'::activity_action, 'UPDATED'::activity_action) and created_at >= now() - interval '24 hours' order by created_at desc limit 1 for update`;
      if (recentActivity) {
        await sql`update activities set actor_user_id = ${context.userId}::uuid, metadata = ${JSON.stringify({ name: updated.title })}::jsonb where id = ${recentActivity.id}::uuid`;
      } else {
        await sql`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${context.workspaceId}, ${context.userId}, 'requirement', ${updated.id}::uuid, 'UPDATED'::activity_action, ${JSON.stringify({ name: updated.title })}::jsonb)`;
      }
      return [updated];
    });
    if (!item) throw new AppError("NOT_FOUND", "Requirement not found.", 404);
    return NextResponse.json({ item });
  } catch (error) { return apiError(error); }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization(), { id } = await params
    if (!context.permissions.includes('requirements.view')) throw new AppError('FORBIDDEN', 'You do not have permission to view requirements.', 403)
    const [item] = await db()`select r.id,r.requirement_code,r.title,r.status,r.created_at,r.updated_at,c.name as client_name,p.name as project_name from requirements r join clients c on c.id=r.client_id left join projects p on p.id=r.project_id where r.id=${id}::uuid and r.workspace_id=${context.workspaceId} and r.archived_at is null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)`
    if (!item) throw new AppError('NOT_FOUND', 'Requirement not found.', 404)
    return NextResponse.json(item)
  } catch (error) { return apiError(error) }
}
