import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";
const input = z.object({ clientId: z.string().uuid(), projectId: z.string().uuid().nullable().optional(), title: z.string().trim().min(2).max(240), recordType: z.enum(["RECEIVABLE", "PAYMENT", "EXPENSE", "INVOICE", "BILL"]), status: z.enum(["DRAFT", "PENDING", "SENT", "PAID", "OVERDUE", "VOID"]).default("DRAFT"), dueAt: z.string().datetime().nullable().optional(), amount: z.number().min(0).max(999999999999.99).default(0), currency: z.string().trim().length(3).default("INR") });
type FinanceRow = { id: string; title: string; record_type: string; status: string; due_at: string | null; amount: number | null; currency: string | null; paid_at: string | null; client_id: string; client_name: string; project_id: string | null; project_name: string | null; created_at: string; updated_at: string };

export async function GET(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("finance.view")) throw new AppError("FORBIDDEN", "You do not have permission to view finance records.", 403);
    const type = new URL(request.url).searchParams.get("type") || "";
    const items = await db()<FinanceRow[]>`select f.id,f.title,f.record_type,f.status,f.due_at,f.amount,f.currency,f.paid_at,f.client_id,c.name as client_name,f.project_id,p.name as project_name,f.created_at,f.updated_at from finance_records f join clients c on c.id=f.client_id left join projects p on p.id=f.project_id where f.workspace_id=${context.workspaceId} and f.archived_at is null and (${type}='' or f.record_type=${type}) and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid) order by coalesce(f.due_at,f.updated_at) asc`;
    return NextResponse.json({ items });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("finance.create")) throw new AppError("FORBIDDEN", "You do not have permission to create finance records.", 403);
    const data = input.parse(await request.json());
    const [client] = await db()<{ id: string }[]>`select id from clients where id=${data.clientId}::uuid and workspace_id=${context.workspaceId} and archived_at is null and (${context.role}<>'MEMBER' or owner_user_id=${context.userId}::uuid)`;
    if (!client) throw new AppError("VALIDATION_ERROR", "Choose an accessible active client.", 400);
    if (data.projectId) { const [project] = await db()<{ id: string }[]>`select id from projects where id=${data.projectId}::uuid and workspace_id=${context.workspaceId} and client_id=${data.clientId}::uuid and archived_at is null`; if (!project) throw new AppError("VALIDATION_ERROR", "Project must belong to the selected client.", 400); }
    const [item] = await db().begin(async sql => { const [created] = await sql<FinanceRow[]>`insert into finance_records(workspace_id,client_id,project_id,title,record_type,status,due_at,amount,currency) values (${context.workspaceId},${data.clientId}::uuid,${data.projectId || null}::uuid,${data.title},${data.recordType},${data.status},${data.dueAt || null}::timestamptz,${data.amount ?? 0},${data.currency || 'INR'}) returning id,title,record_type,status,due_at,amount,currency,paid_at,client_id,project_id,created_at,updated_at`; await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'finance',${created.id}::uuid,'CREATED'::activity_action,${JSON.stringify({ name:data.title, recordType:data.recordType })}::jsonb)`; return [created]; });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) { return apiError(error); }
}
