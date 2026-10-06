import { AppError } from '../errors'
import { requirePermission } from '../authorization'
import { clientCreateSchema } from '../validation'
import { ClientRepository } from '../repositories/client-repository'

const clients = new ClientRepository()

export class ClientService {
  async list(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const session = await requirePermission('clients.view')
    const page = Math.max(1, query.page ?? 1), limit = Math.min(100, Math.max(1, query.limit ?? 25))
    return clients.list(session.workspaceId, { ...query, page, limit })
  }
  async create(input: unknown) {
    const session = await requirePermission('clients.create')
    const parsed = clientCreateSchema.safeParse(input)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Client details are invalid.', 400)
    const data = parsed.data
    const existing = await clients.findByName(session.workspaceId, data.name)
    if (existing) throw new AppError('CONFLICT', 'A client with this name already exists in this workspace.', 409)
    return clients.createWithActivity(session.workspaceId, session.userId, { name: data.name, kind: data.kind, email: data.email || null, phone: data.phone || null, website: data.website || null, status: data.status, owner_user_id: data.ownerUserId ?? session.userId })
  }
}
