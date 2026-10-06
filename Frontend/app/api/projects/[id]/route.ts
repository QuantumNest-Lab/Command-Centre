import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  name: string;
  project_code: string | null;
  client_name: string;
  status: string;
  target_end_date: string;
  start_date: string;
  priority: string;
  owner: { id: string; name: string; email: string } | null;
  updated_at: string;
};

const input = z.object({
  name: z.string().trim().min(2).max(180).optional(),
  projectType: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  startDate: z.string().date().optional(),
  targetEndDate: z.string().date().optional(),
  estimatedDuration: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  ownerUserId: z.string().uuid().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  budget: z.number().nonnegative().max(999999999999.99).optional(),
  currency: z.string().trim().min(3).max(8).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
}).refine(data => !data.startDate || !data.targetEndDate || data.targetEndDate >= data.startDate, {
  path: ["targetEndDate"],
  message: "Target end date must be on or after start date.",
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("projects.view")) throw new AppError("FORBIDDEN", "You do not have permission to view projects.", 403);
    const { id } = await params;
    const [item] = await db()<ProjectRow[]>`select p.id,p.name,p.project_code,c.name as client_name,p.status::text,p.target_end_date,p.start_date,p.priority::text,case when u.id is null then null else json_build_object('id',u.id,'name',u.name,'email',u.email) end as owner,p.updated_at from projects p join clients c on c.id=p.client_id left join users u on u.id=p.owner_user_id where p.id=${id}::uuid and p.workspace_id=${context.workspaceId} and p.archived_at is null and (${context.role} <> 'MEMBER' or c.owner_user_id=${context.userId}::uuid)`;
    if (!item) throw new AppError("NOT_FOUND", "Project not found.", 404);
    return NextResponse.json({ item });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("projects.edit")) throw new AppError("FORBIDDEN", "You do not have permission to edit projects.", 403);
    const { id } = await params;
    const data = input.parse(await request.json());
    const [existing] = await db()<{ id: string }[]>`select id from projects where id=${id}::uuid and workspace_id=${context.workspaceId} and archived_at is null`;
    if (!existing) throw new AppError("NOT_FOUND", "Project not found.", 404);
    if (data.ownerUserId && data.ownerUserId !== context.userId && !context.permissions.includes("projects.assign")) throw new AppError("FORBIDDEN", "You do not have permission to assign project owners.", 403);
    if (data.ownerUserId) {
      const [owner] = await db()<{ user_id: string }[]>`select user_id from workspace_memberships where workspace_id=${context.workspaceId} and user_id=${data.ownerUserId}::uuid and status='ACTIVE'::membership_status`;
      if (!owner) throw new AppError("VALIDATION_ERROR", "Project owner must be an active workspace member.", 400);
    }
    const [item] = await db()<ProjectRow[]>`update projects set
      name=coalesce(${data.name ?? null},name),
      project_type=coalesce(${data.projectType ?? null},project_type),
      description=coalesce(${data.description ?? null},description),
      start_date=coalesce(${data.startDate ? data.startDate : null}::date,start_date),
      target_end_date=coalesce(${data.targetEndDate ? data.targetEndDate : null}::date,target_end_date),
      estimated_duration=coalesce(${data.estimatedDuration ?? null},estimated_duration),
      status=coalesce(${data.status ?? null}::project_status,status),
      owner_user_id=coalesce(${data.ownerUserId ?? null}::uuid,owner_user_id),
      priority=coalesce(${data.priority ?? null}::project_priority,priority),
      tags=coalesce(${data.tags ?? null},tags),
      budget=coalesce(${data.budget ?? null},budget),
      currency=coalesce(${data.currency ?? null},currency),
      notes=coalesce(${data.notes ?? null},notes),
      updated_at=now()
      where id=${id}::uuid
      returning id,name,project_code,status::text,target_end_date,start_date,priority::text,updated_at`;
    const [row] = await db()<ProjectRow[]>`select p.id,p.name,p.project_code,c.name as client_name,p.status::text,p.target_end_date,p.start_date,p.priority::text,case when u.id is null then null else json_build_object('id',u.id,'name',u.name,'email',u.email) end as owner,p.updated_at from projects p join clients c on c.id=p.client_id left join users u on u.id=p.owner_user_id where p.id=${id}::uuid`;
    return NextResponse.json({ item: row });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("projects.edit")) throw new AppError("FORBIDDEN", "You do not have permission to archive projects.", 403);
    const { id } = await params;
    const [existing] = await db()<{ id: string; name: string }[]>`select id,name from projects where id=${id}::uuid and workspace_id=${context.workspaceId} and archived_at is null`;
    if (!existing) throw new AppError("NOT_FOUND", "Project not found.", 404);
    await db()`update projects set archived_at=now(), updated_at=now() where id=${id}::uuid`;
    await db()`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'project',${id}::uuid,'ARCHIVED'::activity_action,${JSON.stringify({ name: existing.name })}::jsonb)`;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
