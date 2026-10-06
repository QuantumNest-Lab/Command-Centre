import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '../db'
import { AppError } from '../errors'
import { sendTransactionalEmail } from '../email'

type Purpose = 'VERIFY_EMAIL' | 'RESET_PASSWORD'
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const origin = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

function authEmailTemplate({ action, heading, intro, lifetime, url }: { action: string; heading: string; intro: string; lifetime: string; url: string }) {
  const safeUrl = escapeHtml(url)
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f6f4;color:#183c33;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6f4;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe7e1;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:21px 30px;background:#103f34;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
              <td><p style="margin:0;color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.4px;">QNL</p></td>
              <td align="right"><p style="margin:0;color:#b9d3ca;font-size:10px;font-weight:700;letter-spacing:1.2px;">COMMAND CENTRE</p></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:31px 30px 26px;border-top:3px solid #43af88;">
            <p style="margin:0 0 10px;color:#168064;font-size:11px;font-weight:700;letter-spacing:1.15px;">ACCOUNT SECURITY</p>
            <h1 style="margin:0;color:#183c33;font-size:26px;line-height:1.2;letter-spacing:-0.6px;">${heading}</h1>
            <p style="margin:14px 0 0;color:#5d776f;font-size:15px;line-height:1.55;">${intro}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;"><tr><td style="border-radius:7px;background:#14785e;"><a href="${safeUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:14px;font-weight:700;line-height:18px;text-decoration:none;">${action} &nbsp;&rarr;</a></td></tr></table>
            <p style="margin:21px 0 0;padding-top:18px;border-top:1px solid #e4ece8;color:#5d776f;font-size:13px;line-height:1.55;">This secure link expires in <strong style="color:#183c33;">${lifetime}</strong> and can only be used once.</p>
            <p style="margin:10px 0 0;color:#7a9088;font-size:12px;line-height:1.5;">Didn’t request this? You can safely ignore this email.</p>
          </td></tr>
          <tr><td style="padding:15px 30px 17px;background:#f7faf8;border-top:1px solid #e4ece8;">
            <p style="margin:0;color:#7a9088;font-size:11px;line-height:1.45;">Button not working? Copy this secure link into your browser:</p>
            <p style="margin:6px 0 0;word-break:break-all;"><a href="${safeUrl}" style="color:#14785e;font-size:11px;line-height:1.4;text-decoration:underline;">${safeUrl}</a></p>
          </td></tr>
        </table>
        <p style="margin:13px 0 0;color:#81958e;font-size:11px;">&copy; ${new Date().getFullYear()} Quantum Nest Lab</p>
      </td></tr>
    </table>
  </body>
</html>`
}

export async function issueAuthEmail(userId: string, email: string, purpose: Purpose) {
  const token = randomBytes(32).toString('base64url')
  const lifetime = purpose === 'VERIFY_EMAIL' ? '24 hours' : '1 hour'
  await db()`update auth_email_tokens set consumed_at=now() where user_id=${userId} and purpose=${purpose} and consumed_at is null`
  await db()`insert into auth_email_tokens (user_id, purpose, token_hash, expires_at) values (${userId}, ${purpose}, ${hash(token)}, now() + ${lifetime}::interval)`
  const path = purpose === 'VERIFY_EMAIL' ? '/verify-email' : '/reset-password'
  const url = `${origin()}${path}?token=${encodeURIComponent(token)}`
  const subject = purpose === 'VERIFY_EMAIL' ? 'Verify your QNL email' : 'Reset your QNL password'
  const action = purpose === 'VERIFY_EMAIL' ? 'Verify email address' : 'Reset password'
  const heading = purpose === 'VERIFY_EMAIL' ? 'Verify your email address' : 'Reset your password'
  const intro = purpose === 'VERIFY_EMAIL' ? 'Confirm your email address to secure your QNL workspace and complete your account setup.' : 'We received a request to reset the password for your QNL account.'
  return sendTransactionalEmail({
    to: email,
    subject,
    text: `${heading}\n\n${intro}\n\n${action}: ${url}\n\nFor your security, this link expires in ${lifetime} and can only be used once.\n\nIf you did not request this, you can safely ignore this email.`,
    html: authEmailTemplate({ action, heading, intro, lifetime, url }),
  })
}

async function consume(token: string, purpose: Purpose) {
  const [row] = await db()<{ user_id: string }[]>`update auth_email_tokens set consumed_at=now() where token_hash=${hash(token)} and purpose=${purpose} and consumed_at is null and expires_at > now() returning user_id`
  if (!row) throw new AppError('UNAUTHORIZED', 'This link is invalid or has expired.', 401)
  return row.user_id
}

export async function verifyEmail(token: string) {
  const userId = await consume(token, 'VERIFY_EMAIL')
  await db()`update users set email_verified_at=coalesce(email_verified_at, now()) where id=${userId}`
}

export async function resetPassword(token: string, password: string) {
  const userId = await consume(token, 'RESET_PASSWORD')
  await db()`update users set password_hash=${await bcrypt.hash(password, 12)} where id=${userId}`
}

export async function requestPasswordReset(email: string) {
  const [user] = await db()<{ id: string; email: string }[]>`select id, email from users where email=${email.toLowerCase()} and account_status='ACTIVE'::account_status limit 1`
  if (user) await issueAuthEmail(user.id, user.email, 'RESET_PASSWORD')
}
