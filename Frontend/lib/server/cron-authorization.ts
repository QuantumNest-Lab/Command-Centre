import { AppError } from './errors'

/** Machine-to-machine authorization for scheduled jobs; never accepts a browser session. */
export function requireCronAuthorization(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) throw new AppError('UNAUTHORIZED', 'Unauthorized.', 401)
}
