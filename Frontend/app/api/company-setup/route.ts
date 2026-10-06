import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'

export const runtime = 'nodejs'
const input = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(240).optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  website: z.string().trim().url().max(2048).optional().or(z.literal('')),
  taxId: z.string().trim().max(80).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  locale: z.string().trim().min(2).max(20).optional(),
  currency: z.string().trim().length(3).optional(),
})

export async function POST(request: Request) {
  try {
    const context = await requireAuthorization()
    if (context.role !== 'OWNER') throw new AppError('FORBIDDEN', 'Only the workspace owner can complete company setup.', 403)
    const data = input.parse(await request.json())
    await db()`update workspaces set name=${data.name}, legal_name=${data.legalName || null}, business_email=${data.email}, business_phone=${data.phone || null}, business_address=${data.address || null}, business_city=${data.city || null}, business_state=${data.state || null}, business_postal_code=${data.postalCode || null}, website=${data.website || null}, tax_id=${data.taxId || null}, timezone=${data.timezone || 'UTC'}, locale=${data.locale || 'en'}, currency=${data.currency?.toUpperCase() || 'INR'}, company_setup_completed=true, onboarding_completed_at=now(), updated_at=now() where id=${context.workspaceId}`
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
