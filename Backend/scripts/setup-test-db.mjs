import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is required. Refusing to prepare an unspecified database.')
const target = new URL(url)
if (target.hostname.includes('supabase') || process.env.NODE_ENV === 'production') throw new Error('Refusing to prepare a Supabase or production database.')
if (!target.pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must target a dedicated database whose name ends in _test.')

const sql = postgres(url, { max: 1 })
try {
  await sql.unsafe('drop schema public cascade; create schema public; grant all on schema public to public;')
  const migrationsDirectory = new URL('../../Frontend/db/migrations/', import.meta.url)
  const migrationNames = (await readdir(fileURLToPath(migrationsDirectory)))
    .filter(name => /^\d{3}_.+\.sql$/.test(name))
    .sort()
  if (!migrationNames.includes('024_finance_amounts.sql')) throw new Error('Expected the Finance amounts migration to be present.')
  for (const migrationName of migrationNames) {
    const source = await readFile(fileURLToPath(new URL(`../../Frontend/db/migrations/${migrationName}`, import.meta.url)), 'utf8')
    // PostgreSQL does not allow an enum value to be used until the transaction
    // that adds it has committed. Migration 022 intentionally seeds the new
    // providers, so its enum alterations must be committed first.
    if (migrationName === '022_calendar_and_google_connections.sql') {
      await sql.unsafe("alter type integration_provider add value if not exists 'GOOGLE_CALENDAR'")
      await sql.unsafe("alter type integration_provider add value if not exists 'MICROSOFT_CALENDAR'")
      const remainder = source.replace(/alter type integration_provider add value if not exists 'GOOGLE_CALENDAR';\s*alter type integration_provider add value if not exists 'MICROSOFT_CALENDAR';/, '')
      await sql.unsafe(remainder)
    } else {
      await sql.unsafe(source)
    }
  }
  console.log(`PASS test database prepared: ${target.hostname}${target.pathname}`)
} finally {
  await sql.end({ timeout: 5 })
}
