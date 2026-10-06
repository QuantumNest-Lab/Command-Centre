import { NextResponse } from "next/server";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError } from "@/lib/server/errors";
import { AppError } from "@/lib/server/errors";
import { z } from 'zod'
import { PROJECT_REQUIREMENT_TEMPLATES, PROJECT_TYPES } from '@/lib/project-requirement-templates'

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  project_code: string | null;
  client_name: string;
  status: string;
  target_end_date: string;
  start_date: string;
  priority: string;
  owner: { id: string; name: string; email: string } | null;
  updated_at: string;
  task_count: number;
  completed_count: number;
};

export async function GET(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("projects.view")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to view projects." } },
        { status: 403 },
      );
    }
    const search = new URL(request.url).searchParams.get("search")?.trim() || "";
    const items = await db()<ProjectRow[]>`
      select p.id, p.client_id, p.name, p.project_code, c.name as client_name, p.status::text,
        p.target_end_date, p.start_date, p.priority::text,
        case when u.id is null then null else json_build_object('id', u.id, 'name', u.name, 'email', u.email) end as owner,
        p.updated_at,
        (select count(*)::int from tasks t where t.workspace_id = p.workspace_id and t.project_id = p.id and t.archived_at is null) as task_count,
        (select count(*)::int from tasks t where t.workspace_id = p.workspace_id and t.project_id = p.id and t.archived_at is null and t.status = 'COMPLETED') as completed_count
      from projects p
      join clients c on c.id = p.client_id
      left join users u on u.id = p.owner_user_id
      where p.workspace_id = ${context.workspaceId}
        and p.archived_at is null
        and (${context.role} <> 'MEMBER' or p.owner_user_id = ${context.userId}::uuid)
        and (${search} = '' or p.name ilike ${`%${search}%`} or coalesce(p.project_code, '') ilike ${`%${search}%`} or c.name ilike ${`%${search}%`})
      order by p.updated_at desc
    `;
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}

const projectInput = z.object({ name: z.string().trim().min(2).max(180), clientId: z.string().uuid(), projectType: z.enum(PROJECT_TYPES), description: z.string().trim().max(1000).optional().or(z.literal('')), startDate: z.string().date(), targetEndDate: z.string().date(), estimatedDuration: z.string().trim().max(80).optional().or(z.literal('')), status: z.enum(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNED'), ownerUserId: z.string().uuid(), priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'), tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]), budget: z.number().nonnegative().max(999999999999.99).optional(), currency: z.string().trim().min(3).max(8).default('INR'), notes: z.string().trim().max(500).optional().or(z.literal('')) }).refine(data => data.targetEndDate >= data.startDate, { path: ['targetEndDate'], message: 'Target end date must be on or after start date.' })

export async function POST(request: Request) {
  try {
    const context = await requireAuthorization()
    if (!context.permissions.includes('projects.create')) throw new AppError('FORBIDDEN', 'You do not have permission to create projects.', 403)
    const data = projectInput.parse(await request.json())
    const idempotencyKey = request.headers.get('idempotency-key')
    if (idempotencyKey && !z.string().uuid().safeParse(idempotencyKey).success) throw new AppError('VALIDATION_ERROR', 'The project creation request identifier is invalid.', 400)
    if (data.ownerUserId !== context.userId && !context.permissions.includes('projects.assign')) throw new AppError('FORBIDDEN', 'You do not have permission to assign project owners.', 403)
    const [client] = await db()<{ id: string }[]>`select id from clients where id=${data.clientId}::uuid and workspace_id=${context.workspaceId} and archived_at is null and (${context.role} <> 'MEMBER' or owner_user_id=${context.userId}::uuid)`
    if (!client) throw new AppError('VALIDATION_ERROR', 'Choose an accessible active client.', 400)
    const [owner] = await db()<{ user_id: string }[]>`select user_id from workspace_memberships where workspace_id=${context.workspaceId} and user_id=${data.ownerUserId}::uuid and status='ACTIVE'::membership_status`
    if (!owner) throw new AppError('VALIDATION_ERROR', 'Project owner must be an active workspace member.', 400)
    const [item] = await db().begin(async sql => { const [created] = await sql<{ id: string; project_code: string | null; inserted: boolean }[]>`insert into projects(workspace_id,client_id,name,project_type,description,start_date,target_end_date,estimated_duration,status,owner_user_id,priority,tags,budget,currency,notes,create_request_id) values(${context.workspaceId},${data.clientId}::uuid,${data.name},${data.projectType},${data.description || null},${data.startDate}::date,${data.targetEndDate}::date,${data.estimatedDuration || null},${data.status}::project_status,${data.ownerUserId}::uuid,${data.priority}::project_priority,${data.tags},${data.budget ?? null},${data.currency},${data.notes || null},${idempotencyKey || null}::uuid) on conflict (workspace_id,create_request_id) where create_request_id is not null do update set create_request_id=excluded.create_request_id returning id,project_code,(xmax = 0) as inserted`; if (!created.inserted) return [{ id: created.id, project_code: created.project_code, seededRequirementCount: 0 }]; const template = PROJECT_REQUIREMENT_TEMPLATES[data.projectType]; for (const title of template) { const [requirement] = await sql<{ id: string; requirement_code: string }[]>`insert into requirements(workspace_id,client_id,project_id,title,status,source) values(${context.workspaceId},${data.clientId}::uuid,${created.id}::uuid,${title},'REQUESTED','INTERNAL') returning id,requirement_code`; await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'requirement',${requirement.id}::uuid,'CREATED'::activity_action,${JSON.stringify({ name: title, requirementCode: requirement.requirement_code, source: 'INTERNAL', seededFromProjectType: data.projectType })}::jsonb)` } await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'project',${created.id}::uuid,'CREATED'::activity_action,${JSON.stringify({ name: data.name, projectCode: created.project_code, projectType: data.projectType, seededRequirementCount: template.length })}::jsonb)`; return [{ id: created.id, project_code: created.project_code, seededRequirementCount: template.length }] })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) { return apiError(error) }
}
