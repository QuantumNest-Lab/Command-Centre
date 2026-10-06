import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthorization } from '@/lib/server/authorization'
import { db } from '@/lib/server/db'
import { apiError, AppError } from '@/lib/server/errors'
export const runtime = 'nodejs'
const input=z.object({status:z.enum(['APPROVED','REJECTED','CHANGES_REQUESTED'])})
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const context=await requireAuthorization(),{id}=await params,data=input.parse(await request.json());if(!context.permissions.includes(data.status==='APPROVED'?'approvals.approve':'approvals.reject'))throw new AppError('FORBIDDEN','You do not have permission to decide approvals.',403);const [item]=await db()<{id:string;title:string}[]>`update approvals a set status=${data.status},decided_by_user_id=${context.userId}::uuid,decided_at=now() where a.id=${id}::uuid and a.workspace_id=${context.workspaceId} and a.archived_at is null and a.status='REQUESTED' and (${context.role}<>'MEMBER' or exists(select 1 from clients c where c.id=a.client_id and c.owner_user_id=${context.userId}::uuid)) returning a.id,a.title`;if(!item)throw new AppError('NOT_FOUND','Pending approval not found.',404);await db()`insert into activities(workspace_id,actor_user_id,entity_type,entity_id,action,metadata) values(${context.workspaceId},${context.userId},'approval',${item.id}::uuid,'UPDATED'::activity_action,${JSON.stringify({name:item.title,status:data.status})}::jsonb)`;return NextResponse.json({item})}catch(error){return apiError(error)}}
