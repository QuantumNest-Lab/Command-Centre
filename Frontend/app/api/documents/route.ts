import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError, AppError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const input = z.object({ clientId: z.string().uuid(), projectId: z.string().uuid().nullable().optional(), title: z.string().trim().min(2).max(240), documentType: z.enum(["QUOTATION", "PROPOSAL", "CONTRACT", "INVOICE", "BILL", "OTHER"]), status: z.enum(["DRAFT", "SENT", "APPROVED", "REJECTED", "SIGNED", "VOID"]).default("DRAFT"), dueAt: z.string().datetime().nullable().optional(), referenceNumber: z.string().trim().min(1).max(80).optional(), issueAt: z.string().datetime().nullable().optional() });
type DocumentRow = { id: string; title: string; document_type: string; status: string; due_at: string | null; expires_at?: string | null; reference_number?: string | null; total_amount?: number; currency?: string; client_id: string; client_name: string; project_id: string | null; project_name: string | null; created_at: string; updated_at: string };

export async function GET(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("documents.view")) throw new AppError("FORBIDDEN", "You do not have permission to view documents.", 403);
    const type = new URL(request.url).searchParams.get("type");
    const items = await db()<DocumentRow[]>`select d.id, d.title, d.document_type, d.status, d.due_at, d.expires_at, d.reference_number, d.total_amount, d.currency, d.client_id, c.name as client_name, d.project_id, p.name as project_name, d.created_at, d.updated_at from documents d join clients c on c.id = d.client_id left join projects p on p.id = d.project_id where d.workspace_id = ${context.workspaceId} and d.archived_at is null and (${type || ''} = '' or d.document_type = ${type || ''}) and (${context.role} <> 'MEMBER' or c.owner_user_id = ${context.userId}::uuid) order by coalesce(d.due_at, d.updated_at) asc`;
    return NextResponse.json({ items });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuthorization();
    if (!context.permissions.includes("documents.create")) throw new AppError("FORBIDDEN", "You do not have permission to create documents.", 403);
    const data = input.parse(await request.json());
    const [client] = await db()<{ id: string }[]>`select id from clients where id=${data.clientId}::uuid and workspace_id=${context.workspaceId} and archived_at is null and (${context.role} <> 'MEMBER' or owner_user_id=${context.userId}::uuid)`;
    if (!client) throw new AppError("VALIDATION_ERROR", "Choose an accessible active client.", 400);
    if (data.projectId) { const [project] = await db()<{ id: string }[]>`select id from projects where id=${data.projectId}::uuid and workspace_id=${context.workspaceId} and client_id=${data.clientId}::uuid and archived_at is null`; if (!project) throw new AppError("VALIDATION_ERROR", "Project must belong to the selected client.", 400); }
    const [item] = await db().begin(async sql => { const [created] = await sql<DocumentRow[]>`insert into documents (workspace_id,client_id,project_id,title,document_type,status,due_at,reference_number,issue_at) values (${context.workspaceId},${data.clientId}::uuid,${data.projectId || null}::uuid,${data.title},${data.documentType},${data.status},${data.dueAt || null}::timestamptz,${data.referenceNumber || null},${data.issueAt || null}::timestamptz) returning id,title,document_type,status,due_at,client_id,project_id,created_at,updated_at`; await sql`insert into activities (workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values (${context.workspaceId},${context.userId},'document',${created.id}::uuid,'CREATED'::activity_action,${JSON.stringify({ name:data.title, documentType:data.documentType })}::jsonb)`; return [created]; });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) { return apiError(error); }
}
