import postgres from 'postgres'
import { AppError } from './errors'

let client: ReturnType<typeof postgres> | undefined

export const db = () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new AppError('INTERNAL_ERROR', 'Database configuration is unavailable.', 500)
  client ??= postgres(databaseUrl, { max: 10, idle_timeout: 20, connect_timeout: 10 })
  return client
}
