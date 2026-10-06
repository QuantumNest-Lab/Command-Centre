import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";

const input = z.object({
  title: z.string().trim().min(2).max(240).optional(),
  recordType: z.enum(["RECEIVABLE", "PAYMENT", "EXPENSE", "INVOICE", "BILL"]).optional(),
  status: z.enum(["DRAFT", "PENDING", "SENT", "PAID", "OVERDUE", "VOID"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  amount: z.number().min(0).max(999999999999.99).optional(),
  currency: z.string().trim().length(3).optional(),
  paidAt: z.string().datetime().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

type FinanceRow = { id: string; title: string; record_type: string; status: string; due_at: string | null; amount: number | null; currency: string | null; paid_at: string | null; client_id: string; client_name: string; project_id: string | null; project_name: string | null; created_at: string; updated_at: string };
const selectFinanceRecord = (id: string, workspaceId: string, userId: string, role: string) => db()<FinanceRow[]>`select f.id,f.title,f.record_type,f.status,f.due_at,f.amount,f.currency,f.paid_at,f.client_id,c.name as client_name,f.project_id,p.name as project_name,f.created_at,f.updated_at from finance_records f join clients c on c.id=f.client_id left join projects p on p.id=f.project_id where f.id=${id}::uuid and f.workspace_id=${workspaceId} and f.archived_at is null and (${role}<>'MEMBER' or c.owner_user_id=${userId}::uuid)`

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("finance.view")) throw new AppError("FORBIDDEN", "You do not have permission to view finance records.", 403);
    const { id } = await params;
    const [item] = await selectFinanceRecord(id, context.workspaceId, context.userId, context.role);
    if (!item) throw new AppError("NOT_FOUND", "Finance record not found.", 404);
    return NextResponse.json({ item });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("finance.edit")) throw new AppError("FORBIDDEN", "You do not have permission to edit finance records.", 403);
    const { id } = await params;
    const data = input.parse(await request.json());
    const [existing] = await db()<{ id: string; client_id: string }[]>`select f.id,f.client_id from finance_records f join clients c on c.id=f.client_id where f.id=${id}::uuid and f.workspace_id=${context.workspaceId} and f.archived_at is null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)`;
    if (!existing) throw new AppError("NOT_FOUND", "Finance record not found.", 404);
    if (data.projectId) { const [project] = await db()<{ id: string }[]>`select id from projects where id=${data.projectId}::uuid and workspace_id=${context.workspaceId} and client_id=${existing.client_id}::uuid and archived_at is null`; if (!project) throw new AppError("VALIDATION_ERROR", "Project must belong to the finance record client.", 400); }
    const [item] = await db()<FinanceRow[]>`update finance_records set
      title=coalesce(${data.title ?? null},title),
      record_type=coalesce(${data.recordType ?? null},record_type),
      status=coalesce(${data.status ?? null},status),
      due_at=coalesce(${data.dueAt ? new Date(data.dueAt).toISOString() : null}::timestamptz,due_at),
      amount=coalesce(${data.amount ?? null},amount),
      currency=coalesce(${data.currency ?? null},currency),
      paid_at=coalesce(${data.paidAt ? new Date(data.paidAt).toISOString() : null}::timestamptz,paid_at),
      project_id=coalesce(${data.projectId ?? null}::uuid,project_id),
      updated_at=now()
      where id=${id}::uuid
      returning id,title,record_type,status,due_at,amount,currency,paid_at,client_id,project_id,created_at,updated_at`;
    const [row] = await selectFinanceRecord(id, context.workspaceId, context.userId, context.role);
    await db()`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'finance',${id}::uuid,'UPDATED'::activity_action,${JSON.stringify({ name: row.title })}::jsonb)`;
    return NextResponse.json({ item: row });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("finance.edit")) throw new AppError("FORBIDDEN", "You do not have permission to archive finance records.", 403);
    const { id } = await params;
    const [existing] = await db()<{ id: string; title: string }[]>`select f.id,f.title from finance_records f join clients c on c.id=f.client_id where f.id=${id}::uuid and f.workspace_id=${context.workspaceId} and f.archived_at is null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)`;
    if (!existing) throw new AppError("NOT_FOUND", "Finance record not found.", 404);
    await db()`update finance_records set archived_at=now(), updated_at=now() where id=${id}::uuid`;
    await db()`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'finance',${id}::uuid,'ARCHIVED'::activity_action,${JSON.stringify({ name: existing.title })}::jsonb)`;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
