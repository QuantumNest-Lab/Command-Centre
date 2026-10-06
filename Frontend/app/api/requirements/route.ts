import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({ clientId: z.string().uuid(), projectId: z.string().uuid().nullable().optional(), title: z.string().trim().min(2).max(240), status: z.enum(["REQUESTED", "REVIEWING", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]).default("REQUESTED"), source: z.enum(["MEETING", "CALL", "EMAIL", "WHATSAPP", "CLIENT_MESSAGE", "INTERNAL", "OTHER"]).default("INTERNAL"), dueAt: z.string().datetime().nullable().optional() });
type RequirementRow = { id: string; requirement_code: string; title: string; status: string; source: string; due_at: string | null; client_id: string; client_name: string; project_id: string | null; project_name: string | null; created_at: string; updated_at: string };

export async function GET() {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("requirements.view")) throw new AppError("FORBIDDEN", "You do not have permission to view requirements.", 403);
    const items = await db()<RequirementRow[]>`select r.id, r.requirement_code, r.title, r.status, r.source, r.due_at, r.client_id, c.name as client_name, r.project_id, p.name as project_name, r.created_at, r.updated_at from requirements r join clients c on c.id = r.client_id left join projects p on p.id = r.project_id where r.workspace_id = ${context.workspaceId} and r.archived_at is null and (${context.role} <> 'MEMBER' or c.owner_user_id = ${context.userId}::uuid) order by coalesce(r.due_at, r.updated_at) asc`;
    return NextResponse.json({ items });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("requirements.create")) throw new AppError("FORBIDDEN", "You do not have permission to create requirements.", 403);
    const data = input.parse(await request.json());
    const [client] = await db()<{ id: string }[]>`select id from clients where id = ${data.clientId}::uuid and workspace_id = ${context.workspaceId} and archived_at is null and (${context.role} <> 'MEMBER' or owner_user_id = ${context.userId}::uuid)`;
    if (!client) throw new AppError("VALIDATION_ERROR", "Choose an accessible active client.", 400);
    if (data.projectId) { const [project] = await db()<{ id: string }[]>`select id from projects where id = ${data.projectId}::uuid and workspace_id = ${context.workspaceId} and client_id = ${data.clientId}::uuid and archived_at is null`; if (!project) throw new AppError("VALIDATION_ERROR", "Project must belong to the selected client.", 400); }
    const [item] = await db().begin(async sql => { const [created] = await sql<RequirementRow[]>`insert into requirements (workspace_id, client_id, project_id, title, status, source, due_at) values (${context.workspaceId}, ${data.clientId}::uuid, ${data.projectId || null}::uuid, ${data.title}, ${data.status}, ${data.source}, ${data.dueAt || null}::timestamptz) returning id, requirement_code, title, status, source, due_at, client_id, project_id, created_at, updated_at`; await sql`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${context.workspaceId}, ${context.userId}, 'requirement', ${created.id}::uuid, 'CREATED'::activity_action, ${JSON.stringify({ name: data.title, requirementCode: created.requirement_code, source: data.source })}::jsonb)`; return [created]; });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) { return apiError(error); }
}
