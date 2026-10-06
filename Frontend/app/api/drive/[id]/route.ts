import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const idSchema = z.string().uuid()
const updateSchema = z.object({ name: z.string().trim().min(1).max(500).optional(), parentFileId: z.string().uuid().nullable().optional(), restore: z.boolean().optional() }).refine(value => value.name !== undefined || value.parentFileId !== undefined || value.restore !== undefined, 'Choose a file update.')
type FileRow = { id: string; name: string; is_folder: boolean; parent_file_id: string | null; archived_at: string | null; external_url: string | null; media_type: string | null; size_bytes: number | null; created_at: string; updated_at: string }

const findFile = async (workspaceId: string, id: string, includeArchived = false) => { const [file] = await db()<FileRow[]>`select id,name,is_folder,parent_file_id,archived_at,external_url,media_type,size_bytes,created_at,updated_at from file_objects where id=${id}::uuid and workspace_id=${workspaceId} and (${includeArchived} or archived_at is null)`; return file }

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await requireAuthorization(); if (!context.permissions.includes('drive.view')) throw new AppError('FORBIDDEN', 'You do not have permission to view files.', 403); const file = await findFile(context.workspaceId, idSchema.parse((await params).id), true); if (!file) throw new AppError('NOT_FOUND', 'File not found.', 404); return NextResponse.json({ item: file }) } catch (error) { return apiError(error) }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization(), id = idSchema.parse((await params).id), data = updateSchema.parse(await request.json()), file = await findFile(context.workspaceId, id, true)
    if (!file) throw new AppError('NOT_FOUND', 'File not found.', 404)
    const moving = data.parentFileId !== undefined && data.parentFileId !== file.parent_file_id
    const permission = moving ? 'drive.move' : 'drive.rename'
    if (!context.permissions.includes(data.restore ? 'drive.manage' : permission)) throw new AppError('FORBIDDEN', 'You do not have permission to update this Drive record.', 403)
    if (data.parentFileId) {
      if (data.parentFileId === id) throw new AppError('VALIDATION_ERROR', 'A folder cannot contain itself.', 400)
      const [parent] = await db()<{ id: string }[]>`select id from file_objects where id=${data.parentFileId}::uuid and workspace_id=${context.workspaceId} and is_folder=true and archived_at is null`
      if (!parent) throw new AppError('VALIDATION_ERROR', 'Destination folder is invalid.', 400)
      const [cycle] = await db()<{ id: string }[]>`with recursive ancestors as (select id,parent_file_id from file_objects where id=${data.parentFileId}::uuid and workspace_id=${context.workspaceId} union all select f.id,f.parent_file_id from file_objects f join ancestors a on f.id=a.parent_file_id where f.workspace_id=${context.workspaceId}) select id from ancestors where id=${id}::uuid limit 1`
      if (cycle) throw new AppError('VALIDATION_ERROR', 'A folder cannot be moved into one of its descendants.', 400)
    }
    const [item] = await db().begin(async sql => { const [updated] = await sql<FileRow[]>`update file_objects set name=coalesce(${data.name ?? null},name),parent_file_id=case when ${data.parentFileId !== undefined} then ${data.parentFileId || null}::uuid else parent_file_id end,archived_at=case when ${data.restore === true} then null else archived_at end where id=${id}::uuid and workspace_id=${context.workspaceId} returning id,name,is_folder,parent_file_id,archived_at,external_url,media_type,size_bytes,created_at,updated_at`; await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'file',${id}::uuid,${data.restore ? 'UPDATED' : 'UPDATED'}::activity_action,${JSON.stringify({ name: updated.name, event: data.restore ? 'restored' : moving ? 'moved' : 'renamed' })}::jsonb)`; return [updated] }); return NextResponse.json({ item })
  } catch (error) { return apiError(error) }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await requireAuthorization(), id = idSchema.parse((await params).id); if (!context.permissions.includes('drive.delete')) throw new AppError('FORBIDDEN', 'You do not have permission to archive Drive records.', 403); const file = await findFile(context.workspaceId, id); if (!file) throw new AppError('NOT_FOUND', 'File not found.', 404); await db().begin(async sql => { await sql`update file_objects set archived_at=now() where id=${id}::uuid and workspace_id=${context.workspaceId}`; await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'file',${id}::uuid,'ARCHIVED'::activity_action,${JSON.stringify({ name: file.name })}::jsonb)` }); return new NextResponse(null, { status: 204 }) } catch (error) { return apiError(error) }
}
