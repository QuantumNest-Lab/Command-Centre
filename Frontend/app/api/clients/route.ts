import { NextResponse } from 'next/server'
import { apiError } from '@/lib/server/errors'
import { ClientService } from '@/lib/server/services/client-service'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { AppError } from '@/lib/server/errors'
import { z } from 'zod'

export const runtime = 'nodejs'
export async function GET(request: Request) { try { const context = await requireAuthorization(); if (!context.permissions.includes('clients.view')) throw new AppError('FORBIDDEN', 'You do not have permission to view clients.', 403); const url = new URL(request.url); return NextResponse.json(await new ClientService().list({ search: url.searchParams.get('search') ?? undefined, status: url.searchParams.get('status') ?? undefined, page: Number(url.searchParams.get('page') ?? 1), limit: Number(url.searchParams.get('limit') ?? 25) })) } catch (error) { return apiError(error) } }
const optional = (max: number) => z.string().trim().max(max).optional().or(z.literal(''))
const createInput = z.object({ name: z.string().trim().min(2).max(180), kind: z.enum(['ORGANIZATION', 'INDIVIDUAL']).default('ORGANIZATION'), email: z.string().trim().email().max(255).optional().or(z.literal('')), phone: optional(40), website: optional(2048), shortName: optional(80), industry: optional(120), description: optional(500), contactName: optional(180), designation: optional(120), addressLine1: optional(255), addressLine2: optional(255), city: optional(120), state: optional(120), postalCode: optional(40), country: optional(120), taxId: optional(120), paymentTerms: optional(40), currency: optional(40), ownerUserId: z.string().uuid().optional(), status: z.enum(['ACTIVE', 'REVIEWING', 'INACTIVE']).default('ACTIVE') })
export async function POST(request: Request) {
  try {
    const context = await requireAuthorization()
    if (!context.permissions.includes('clients.create')) throw new AppError('FORBIDDEN', 'You do not have permission to create clients.', 403)
    const data = createInput.parse(await request.json()), owner = data.ownerUserId || context.userId
    if (owner !== context.userId && !context.permissions.includes('clients.assign')) throw new AppError('FORBIDDEN', 'You do not have permission to assign client owners.', 403)
    const [member] = await db()<{ user_id: string }[]>`select user_id from workspace_memberships where workspace_id=${context.workspaceId} and user_id=${owner}::uuid and status='ACTIVE'::membership_status`
    if (!member) throw new AppError('VALIDATION_ERROR', 'Client owner must be an active workspace member.', 400)
    const [duplicate] = await db()<{ id: string }[]>`select id from clients where workspace_id=${context.workspaceId} and lower(name)=lower(${data.name}) and archived_at is null`
    if (duplicate) throw new AppError('CONFLICT', 'A client with this name already exists in this workspace.', 409)
    const [item] = await db().begin(async sql => { const [created] = await sql`insert into clients(workspace_id,name,kind,email,phone,website,short_name,industry,description,contact_name,designation,address_line1,address_line2,city,state,postal_code,country,tax_id,payment_terms,currency,status,owner_user_id) values(${context.workspaceId},${data.name},${data.kind}::client_kind,nullif(${data.email ?? ''},''),nullif(${data.phone ?? ''},''),nullif(${data.website ?? ''},''),nullif(${data.shortName ?? ''},''),nullif(${data.industry ?? ''},''),nullif(${data.description ?? ''},''),nullif(${data.contactName ?? ''},''),nullif(${data.designation ?? ''},''),nullif(${data.addressLine1 ?? ''},''),nullif(${data.addressLine2 ?? ''},''),nullif(${data.city ?? ''},''),nullif(${data.state ?? ''},''),nullif(${data.postalCode ?? ''},''),nullif(${data.country ?? ''},''),nullif(${data.taxId ?? ''},''),nullif(${data.paymentTerms ?? ''},''),nullif(${data.currency ?? ''},''),${data.status}::client_status,${owner}::uuid) returning id,name`; await sql`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'client',${created.id}::uuid,'CREATED'::activity_action,${JSON.stringify({ name: data.name })}::jsonb)`; return [created] })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) { return apiError(error) }
}
