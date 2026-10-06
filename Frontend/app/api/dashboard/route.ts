import { NextResponse } from "next/server";
import { requireAuthorization } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiError } from "@/lib/server/errors";

export const runtime = "nodejs";

type ActivityRow = {
  id: string;
  entity_id: string;
  actor: string | null;
  entity_type: string;
  entity_name: string | null;
  context: string | null;
  action: "CREATED" | "UPDATED" | "ARCHIVED" | "STATUS_CHANGED";
  event: string | null;
  created_at: string;
};
type DueWorkRow = { id: string; entity_type: "task" | "approval" | "requirement" | "document" | "finance" | "meeting"; title: string; status: string; due_at: string; client_name: string; project_name: string | null };

function activityCopy(row: ActivityRow) {
  const recordType = row.entity_type === "membership" ? "team member" : row.entity_type;
  const recordName = row.entity_name || `a ${recordType}`;
  const eventCopy: Record<string, string> = {
    client_assignment_changed: "changed the owner of",
    client_status_changed: "changed the status of",
    client_archived: "archived",
    client_edited: "updated",
    member_invited: "invited a team member",
    member_joined: "added a team member",
    role_changed: "changed a team member's role",
    client_ownership_reassigned_before_membership_change: "reassigned client ownership",
  };
  const verb = eventCopy[row.event || ""] ||
    (row.action === "CREATED" ? "created" : row.action === "ARCHIVED" ? "archived" : row.action === "STATUS_CHANGED" ? "changed the status of" : "updated");
  const standaloneEventCopy: Record<string, string> = {
    member_invited: "invited a team member",
    member_joined: "added a team member",
    role_changed: "changed a team member's role",
    client_ownership_reassigned_before_membership_change: "reassigned client ownership",
  };
  return {
    actor: row.actor || "A team member",
    summary: standaloneEventCopy[row.event || ""] || `${verb} ${row.entity_name ? `“${recordName}”` : recordName}`,
    detail: recordType[0].toUpperCase() + recordType.slice(1),
    context: row.context,
    kind: row.entity_type,
  };
}

export async function GET() {
  try {
    const context = await requireAuthorization();
    const [member, workspace, [{ total }], [{ active }], [{ openWork }], [{ awaitingApproval }], [{ receivables }], [{ overdueTasks }], [{ blockedTasks }], activity, dueWork] =
      await Promise.all([
        db()<
          { name: string }[]
        >`select coalesce(display_name, name) as name from users where id = ${context.userId}`.then(
          (rows) => rows[0],
        ),
        db()<
          { name: string }[]
        >`select name from workspaces where id = ${context.workspaceId}`.then(
          (rows) => rows[0],
        ),
        db()<
          { total: string }[]
        >`select count(*)::text as total from clients where workspace_id = ${context.workspaceId} and archived_at is null`,
        db()<
          { active: string }[]
        >`select count(*)::text as active from clients where workspace_id = ${context.workspaceId} and archived_at is null and status = 'ACTIVE'::client_status`,
        context.permissions.includes("tasks.view") ? db()<{ openWork: string }[]>`select count(*)::text as "openWork" from tasks t join clients c on c.id=t.client_id where t.workspace_id=${context.workspaceId} and t.archived_at is null and t.status <> 'COMPLETED' and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)` : Promise.resolve([{ openWork: "0" }]),
        context.permissions.includes("approvals.view") ? db()<{ awaitingApproval: string }[]>`select count(*)::text as "awaitingApproval" from approvals a join clients c on c.id=a.client_id where a.workspace_id=${context.workspaceId} and a.archived_at is null and a.status='REQUESTED' and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)` : Promise.resolve([{ awaitingApproval: "0" }]),
        context.permissions.includes("finance.view") ? db()<{ receivables: string }[]>`select count(*)::text as receivables from finance_records f join clients c on c.id=f.client_id where f.workspace_id=${context.workspaceId} and f.archived_at is null and f.record_type in ('RECEIVABLE','INVOICE') and f.status not in ('PAID','VOID') and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)` : Promise.resolve([{ receivables: "0" }]),
        context.permissions.includes("tasks.view") ? db()<{ overdueTasks: string }[]>`select count(*)::text as "overdueTasks" from tasks t join clients c on c.id=t.client_id where t.workspace_id=${context.workspaceId} and t.archived_at is null and t.status <> 'COMPLETED' and t.due_at < now() and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)` : Promise.resolve([{ overdueTasks: "0" }]),
        context.permissions.includes("tasks.view") ? db()<{ blockedTasks: string }[]>`select count(*)::text as "blockedTasks" from tasks t join clients c on c.id=t.client_id where t.workspace_id=${context.workspaceId} and t.archived_at is null and t.status='BLOCKED' and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)` : Promise.resolve([{ blockedTasks: "0" }]),
        context.permissions.includes("activity.view")
          ? db()<ActivityRow[]>`select a.id, a.entity_id, coalesce(actor.display_name, actor.name) as actor, a.entity_type, coalesce(client.name, project.name, requirement.title, a.metadata->>'name') as entity_name, case when a.entity_type = 'requirement' then nullif(concat_ws(' · ', requirement_project.name, requirement_client.name), '') end as context, a.action::text, a.metadata->>'event' as event, a.created_at from activities a left join users actor on actor.id = a.actor_user_id left join clients client on a.entity_type = 'client' and client.id = a.entity_id left join projects project on a.entity_type = 'project' and project.id = a.entity_id left join requirements requirement on a.entity_type = 'requirement' and requirement.id = a.entity_id left join clients requirement_client on requirement_client.id = requirement.client_id left join projects requirement_project on requirement_project.id = requirement.project_id where a.workspace_id = ${context.workspaceId} and not (a.entity_type = 'client' and (a.action = 'CREATED'::activity_action or (a.action = 'UPDATED'::activity_action and coalesce(a.metadata->>'event', '') not in ('client_assignment_changed', 'client_status_changed'))) and exists (select 1 from activities newer where newer.workspace_id = a.workspace_id and newer.entity_type = 'client' and newer.entity_id = a.entity_id and (newer.action = 'CREATED'::activity_action or (newer.action = 'UPDATED'::activity_action and coalesce(newer.metadata->>'event', '') not in ('client_assignment_changed', 'client_status_changed'))) and newer.created_at > a.created_at and newer.created_at <= a.created_at + interval '24 hours')) order by a.created_at desc limit 50`
          : Promise.resolve([]),
        db()<DueWorkRow[]>`select * from (
          select t.id,'task'::text as entity_type,t.title,t.status,t.due_at,c.name as client_name,p.name as project_name from tasks t join clients c on c.id=t.client_id left join projects p on p.id=t.project_id where t.workspace_id=${context.workspaceId} and t.archived_at is null and t.status <> 'COMPLETED' and t.due_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
          union all select a.id,'approval',a.title,a.status,a.due_at,c.name,p.name from approvals a join clients c on c.id=a.client_id left join projects p on p.id=a.project_id where a.workspace_id=${context.workspaceId} and a.archived_at is null and a.status='REQUESTED' and a.due_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
          union all select r.id,'requirement',r.title,r.status,r.due_at,c.name,p.name from requirements r join clients c on c.id=r.client_id left join projects p on p.id=r.project_id where r.workspace_id=${context.workspaceId} and r.archived_at is null and r.status not in ('COMPLETED','REJECTED') and r.due_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
          union all select d.id,'document',d.title,d.status,d.due_at,c.name,p.name from documents d join clients c on c.id=d.client_id left join projects p on p.id=d.project_id where d.workspace_id=${context.workspaceId} and d.archived_at is null and d.status not in ('VOID','SIGNED') and d.due_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
          union all select f.id,'finance',f.title,f.status,f.due_at,c.name,p.name from finance_records f join clients c on c.id=f.client_id left join projects p on p.id=f.project_id where f.workspace_id=${context.workspaceId} and f.archived_at is null and f.status not in ('PAID','VOID') and f.due_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
          union all select m.id,'meeting',m.title,m.status,m.starts_at,c.name,p.name from meetings m join clients c on c.id=m.client_id left join projects p on p.id=m.project_id where m.workspace_id=${context.workspaceId} and m.archived_at is null and m.status='SCHEDULED' and m.starts_at is not null and (${context.role}<>'MEMBER' or c.owner_user_id=${context.userId}::uuid)
        ) due_work where due_at between now() and now() + interval '7 days' order by due_at asc limit 50`,
      ]);
    // These modules do not yet have persisted tables; expose explicit live zeroes rather than seeded demo values.
    return NextResponse.json({
      name: member?.name || "there",
      workspaceName: workspace?.name || "your workspace",
      clients: { total: Number(total), active: Number(active) },
      metrics: { openWork: Number(openWork), awaitingApproval: Number(awaitingApproval), receivables: Number(receivables) },
      attention: { overdueTasks: Number(overdueTasks), blockedTasks: Number(blockedTasks), pendingApprovals: Number(awaitingApproval) },
      dueWork: dueWork.map(item => ({ id: item.id, type: item.entity_type, title: item.title, status: item.status, dueAt: item.due_at, clientName: item.client_name, projectName: item.project_name })),
      activity: activity.map((item) => ({ id: item.id, entityId: item.entity_id, entityName: item.entity_name, ...activityCopy(item), createdAt: item.created_at })),
    });
  } catch (error) {
    return apiError(error);
  }
}
