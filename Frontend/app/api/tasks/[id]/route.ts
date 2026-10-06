import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const update = z.object({ title: z.string().trim().min(2).max(240).optional(), status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"]).optional(), dueAt: z.string().datetime().nullable().optional() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization(), { id } = await params
    if (!context.permissions.includes('tasks.view')) throw new AppError('FORBIDDEN', 'You do not have permission to view tasks.', 403)
    const [item] = await db()`select t.id,t.title,t.status,t.due_at,t.created_at,t.updated_at,c.name as client_name,p.name as project_name from tasks t join clients c on c.id=t.client_id left join projects p on p.id=t.project_id where t.id=${id}::uuid and t.workspace_id=${context.workspaceId} and t.archived_at is null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)`
    if (!item) throw new AppError('NOT_FOUND', 'Task not found.', 404)
    return NextResponse.json(item)
  } catch (error) { return apiError(error) }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("tasks.edit")) throw new AppError("FORBIDDEN", "You do not have permission to edit tasks.", 403);
    const { id } = await params, data = update.parse(await request.json());
    const [item] = await db()<{ id: string; title: string; status: string; due_at: string | null }[]>`update tasks t set title = coalesce(${data.title || null}, t.title), status = coalesce(${data.status || null}, t.status), due_at = case when ${data.dueAt === undefined} then t.due_at else ${data.dueAt || null}::timestamptz end where t.id = ${id}::uuid and t.workspace_id = ${context.workspaceId} and t.archived_at is null and (${context.role} <> 'MEMBER' or exists (select 1 from clients c where c.id = t.client_id and c.owner_user_id = ${context.userId}::uuid)) returning t.id, t.title, t.status, t.due_at`;
    if (!item) throw new AppError("NOT_FOUND", "Task not found.", 404);
    await db()`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${context.workspaceId}, ${context.userId}, 'task', ${item.id}::uuid, 'UPDATED'::activity_action, ${JSON.stringify({ name: item.title })}::jsonb)`;
    return NextResponse.json({ item });
  } catch (error) { return apiError(error); }
}
