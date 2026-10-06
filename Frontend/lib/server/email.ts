import nodemailer from 'nodemailer'

type TransactionalMessage = { to: string; subject: string; text: string; html: string }

const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)

export async function sendTransactionalEmail(message: TransactionalMessage) {
  if (!configured()) {
    console.warn('Transactional email was not sent because SMTP credentials are not configured.')
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' as const }
  }
  const port = Number(process.env.SMTP_PORT || 465)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
  const result = await transport.sendMail({
    from: process.env.SMTP_FROM || `Quantum Nest Lab Support <${process.env.SMTP_USER}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
  return { sent: true, messageId: result.messageId }
}
