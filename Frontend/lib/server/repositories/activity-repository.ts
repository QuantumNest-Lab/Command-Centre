import { db } from '../db'

export class ActivityRepository {
  async create(workspaceId: string, actorUserId: string, entityType: string, entityId: string, action: 'CREATED' | 'UPDATED' | 'ARCHIVED' | 'STATUS_CHANGED', metadata: Record<string, unknown>) {
    await db()`insert into activities (workspace_id, actor_user_id, entity_type, entity_id, action, metadata) values (${workspaceId}, ${actorUserId}, ${entityType}, ${entityId}::uuid, ${action}::activity_action, ${JSON.stringify(metadata)}::jsonb)`
  }
}
