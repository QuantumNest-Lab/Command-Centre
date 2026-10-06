import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const querySchema = z.string().trim().min(2).max(120)

/** Global, workspace-scoped search. Add a branch here as each ERP module gains a persisted model. */
export async function GET(request: Request) {
  try {
    const context = await requireAuthorization(), query = querySchema.parse(new URL(request.url).searchParams.get('q') || '')
    const term = `%${query}%`, items: { id: string; label: string; type: string; path: string }[] = []
    if (context.permissions.includes('clients.view')) {
      const clients = await db()<{ id: string; name: string }[]>`select id, name from clients where workspace_id = ${context.workspaceId} and archived_at is null and name ilike ${term} order by name limit 10`
      items.push(...clients.map(client => ({ id: client.id, label: client.name, type: 'Client', path: '/clients' })))
    }
    if (context.permissions.includes('projects.view')) {
      const projects = await db()<{ id: string; name: string }[]>`select id, name from projects where workspace_id = ${context.workspaceId} and archived_at is null and name ilike ${term} and (${context.role} <> 'MEMBER' or owner_user_id = ${context.userId}::uuid) order by name limit 10`
      items.push(...projects.map(project => ({ id: project.id, label: project.name, type: 'Project', path: '/projects' })))
    }
    if (context.permissions.includes('requirements.view')) {
      const requirements = await db()<{ id: string; title: string }[]>`select r.id, r.title from requirements r join clients c on c.id = r.client_id where r.workspace_id = ${context.workspaceId} and r.archived_at is null and r.title ilike ${term} and (${context.role} <> 'MEMBER' or c.owner_user_id = ${context.userId}::uuid) order by r.updated_at desc limit 10`
      items.push(...requirements.map(requirement => ({ id: requirement.id, label: requirement.title, type: 'Requirement', path: '/requirements' })))
    }
    if (context.permissions.includes('tasks.view')) {
      const tasks = await db()<{ id: string; title: string }[]>`select t.id, t.title from tasks t join clients c on c.id = t.client_id where t.workspace_id = ${context.workspaceId} and t.archived_at is null and t.title ilike ${term} and (${context.role} <> 'MEMBER' or c.owner_user_id = ${context.userId}::uuid) order by t.updated_at desc limit 10`
      items.push(...tasks.map(task => ({ id: task.id, label: task.title, type: 'Task', path: '/tasks' })))
    }
    if (context.permissions.includes('team.view')) {
      const members = await db()<{ id: string; name: string }[]>`select u.id, coalesce(u.display_name, u.name) as name from workspace_memberships m join users u on u.id = m.user_id where m.workspace_id = ${context.workspaceId} and m.status <> 'REMOVED'::membership_status and (u.name ilike ${term} or u.email ilike ${term}) order by u.name limit 10`
      items.push(...members.map(member => ({ id: member.id, label: member.name, type: 'Team member', path: '/team' })))
    }
    if (context.permissions.includes('activity.view')) {
      const activity = await db()<{ id: string; label: string }[]>`select id, coalesce(metadata->>'name', metadata->>'event', entity_type) as label from activities where workspace_id = ${context.workspaceId} and (entity_type ilike ${term} or metadata::text ilike ${term}) order by created_at desc limit 10`
      items.push(...activity.map(item => ({ id: item.id, label: item.label, type: 'Activity', path: '/activity' })))
    }
    return NextResponse.json({ items })
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError('VALIDATION_ERROR', 'Enter at least two characters to search.', 400) : error) }
}
