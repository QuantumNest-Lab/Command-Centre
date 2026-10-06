import bcrypt from 'bcryptjs'
import { db } from '../db'
import { AppError } from '../errors'
import { createSession } from '../session'
import { signInSchema, signUpSchema } from '../validation'
import { issueAuthEmail } from './auth-email-service'

type AccountRow = { id: string; workspace_id: string; role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'; password_hash: string }
const slugify = (name: string) => `${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 65)}-${crypto.randomUUID().slice(0, 8)}`

export class AuthService {
  async signUp(input: unknown) {
    const parsed = signUpSchema.safeParse(input)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Enter a valid name, email address, and password of at least 8 characters.', 400)
    const { name, password } = parsed.data, email = parsed.data.email.toLowerCase(), passwordHash = await bcrypt.hash(password, 12)
    try {
      const account = await db().begin(async sql => {
        const [user] = await sql<{ id: string }[]>`insert into users (name, display_name, first_name, last_name, email, password_hash) values (${name}, ${name}, ${name.split(/\\s+/)[0]}, ${name.split(/\\s+/).slice(1).join(' ') || null}, ${email}, ${passwordHash}) returning id`
        const [workspace] = await sql<{ id: string }[]>`insert into workspaces (name, slug, company_setup_completed) values (${`${name}'s Workspace`}, ${slugify(name)}, false) returning id`
        await sql`insert into workspace_memberships (workspace_id, user_id, role, status, joined_at) values (${workspace.id}, ${user.id}, 'OWNER'::workspace_role, 'ACTIVE'::membership_status, now())`
        await sql`insert into workspace_subscriptions (workspace_id, plan_code, status, seat_limit) values (${workspace.id}, 'FREE', 'TRIALING'::subscription_status, 5)`
        await sql`insert into integration_connections (workspace_id, provider, display_name) values
          (${workspace.id}, 'GOOGLE_DRIVE'::integration_provider, 'Google Drive'),
          (${workspace.id}, 'GOOGLE_CALENDAR'::integration_provider, 'Google Calendar'),
          (${workspace.id}, 'MICROSOFT_CALENDAR'::integration_provider, 'Microsoft 365 Calendar'),
          (${workspace.id}, 'GOOGLE_GMAIL'::integration_provider, 'Gmail'),
          (${workspace.id}, 'WHATSAPP_CLOUD'::integration_provider, 'WhatsApp Business'),
          (${workspace.id}, 'STRIPE'::integration_provider, 'Stripe'),
          (${workspace.id}, 'RAZORPAY'::integration_provider, 'Razorpay')`
        return { userId: user.id, workspaceId: workspace.id, role: 'OWNER' as const }
      })
      await createSession(account)
      try { await issueAuthEmail(account.userId, email, 'VERIFY_EMAIL') } catch (error) { console.error('Unable to send verification email', error) }
      return { userId: account.userId, workspaceId: account.workspaceId }
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') throw new AppError('CONFLICT', 'An account with this email address already exists.', 409)
      throw error
    }
  }
  async signIn(input: unknown) {
    const parsed = signInSchema.safeParse(input)
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Enter a valid email address and password.', 400)
    const email = parsed.data.email.toLowerCase()
    const [account] = await db()<AccountRow[]>`select u.id, m.workspace_id, m.role, u.password_hash from users u join workspace_memberships m on m.user_id = u.id where u.email = ${email} and u.account_status = 'ACTIVE'::account_status and m.status = 'ACTIVE'::membership_status order by case m.role when 'OWNER' then 0 else 1 end limit 1`
    if (!account || !(await bcrypt.compare(parsed.data.password, account.password_hash))) throw new AppError('UNAUTHORIZED', 'Invalid email address or password.', 401)
    await db()`update users set last_login_at = now() where id = ${account.id}`
    await createSession({ userId: account.id, workspaceId: account.workspace_id, role: account.role })
    return { userId: account.id, workspaceId: account.workspace_id }
  }
}
