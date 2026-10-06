import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization, type AuthorizationContext } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'

const text = (max: number) => z.string().trim().max(max).optional().or(z.literal(''))
const website = z.preprocess(value => {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
}, z.string().url().max(2048).optional())
const updateInput = z.object({
  name: z.string().trim().min(2).max(180).optional(), kind: z.enum(['ORGANIZATION', 'INDIVIDUAL']).optional(), email: z.string().trim().email().max(255).optional().or(z.literal('')), phone: text(40), website, shortName: text(80), industry: text(120), description: text(500), contactName: text(180), designation: text(120), addressLine1: text(255), addressLine2: text(255), city: text(120), state: text(120), postalCode: text(40), country: text(120), taxId: text(120), paymentTerms: text(40), currency: text(40), ownerUserId: z.string().uuid().optional(), status: z.enum(['ACTIVE', 'REVIEWING', 'INACTIVE']).optional(),
})
type ClientRow = { id: string; owner_user_id: string | null }

async function accessible(context: AuthorizationContext, id: string) {
  const [client] = await db()<ClientRow[]>`select id, owner_user_id from clients where id=${id}::uuid and workspace_id=${context.workspaceId} and archived_at is null and (${context.role} <> 'MEMBER' or owner_user_id=${context.userId}::uuid)`
  if (!client) throw new AppError('NOT_FOUND', 'Client not found.', 404)
  return { context, client }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization()
    const { id } = await params, { client } = await accessible(context, id)
    if (!context.permissions.includes('clients.edit')) throw new AppError('FORBIDDEN', 'You do not have permission to edit clients.', 403)
    const data = updateInput.parse(await request.json())
    if (data.ownerUserId && data.ownerUserId !== client.owner_user_id) {
      if (!context.permissions.includes('clients.assign')) throw new AppError('FORBIDDEN', 'You do not have permission to assign client owners.', 403)
      const [member] = await db()<{ user_id: string }[]>`select user_id from workspace_memberships where workspace_id=${context.workspaceId} and user_id=${data.ownerUserId}::uuid and status='ACTIVE'::membership_status`
      if (!member) throw new AppError('VALIDATION_ERROR', 'Client owner must be an active workspace member.', 400)
    }
    const [item] = await db()<{ id: string }[]>`update clients set name=coalesce(${data.name ?? null},name), kind=coalesce(${data.kind ?? null}::client_kind,kind), email=case when ${data.email === undefined} then email else nullif(${data.email ?? ''}, '') end, phone=case when ${data.phone === undefined} then phone else nullif(${data.phone ?? ''}, '') end, website=case when ${data.website === undefined} then website else ${data.website ?? null} end, short_name=case when ${data.shortName === undefined} then short_name else nullif(${data.shortName ?? ''}, '') end, industry=case when ${data.industry === undefined} then industry else nullif(${data.industry ?? ''}, '') end, description=case when ${data.description === undefined} then description else nullif(${data.description ?? ''}, '') end, contact_name=case when ${data.contactName === undefined} then contact_name else nullif(${data.contactName ?? ''}, '') end, designation=case when ${data.designation === undefined} then designation else nullif(${data.designation ?? ''}, '') end, address_line1=case when ${data.addressLine1 === undefined} then address_line1 else nullif(${data.addressLine1 ?? ''}, '') end, address_line2=case when ${data.addressLine2 === undefined} then address_line2 else nullif(${data.addressLine2 ?? ''}, '') end, city=case when ${data.city === undefined} then city else nullif(${data.city ?? ''}, '') end, state=case when ${data.state === undefined} then state else nullif(${data.state ?? ''}, '') end, postal_code=case when ${data.postalCode === undefined} then postal_code else nullif(${data.postalCode ?? ''}, '') end, country=case when ${data.country === undefined} then country else nullif(${data.country ?? ''}, '') end, tax_id=case when ${data.taxId === undefined} then tax_id else nullif(${data.taxId ?? ''}, '') end, payment_terms=case when ${data.paymentTerms === undefined} then payment_terms else nullif(${data.paymentTerms ?? ''}, '') end, currency=case when ${data.currency === undefined} then currency else nullif(${data.currency ?? ''}, '') end, status=coalesce(${data.status ?? null}::client_status,status), owner_user_id=coalesce(${data.ownerUserId ?? null}::uuid,owner_user_id), updated_at=now() where id=${client.id}::uuid returning id`
    await db()`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'client',${item.id}::uuid,'UPDATED'::activity_action,${JSON.stringify({ event: 'client_edited' })}::jsonb)`
    return NextResponse.json({ item })
  } catch (error) { return apiError(error) }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireAuthorization()
    const { id } = await params, { client } = await accessible(context, id)
    if (!context.permissions.includes('clients.archive')) throw new AppError('FORBIDDEN', 'You do not have permission to archive clients.', 403)
    await db().begin(async sql => { await sql`update clients set archived_at=now(),updated_at=now() where id=${client.id}::uuid`; await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'client',${client.id}::uuid,'ARCHIVED'::activity_action,'{}'::jsonb)` })
    return new NextResponse(null, { status: 204 })
  } catch (error) { return apiError(error) }
}
