import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const migrationDirectory = join(process.cwd(), 'db', 'migrations')
const files = (await readdir(migrationDirectory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort()
const compose = ['compose', '-f', '../docker-compose.yml', 'exec', '-T', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'qnl', '-d', 'qnl_command_centre']
const run = args => { const result = spawnSync('docker', args, { encoding: 'utf8' }); if (result.status !== 0) throw new Error(result.stderr || result.stdout || `docker exited ${result.status}`); return result.stdout }
run([...compose, '-c', 'create table if not exists schema_migrations (version text primary key, checksum text not null, applied_at timestamptz not null default now())'])
const ledgerCount = Number(run([...compose, '-tAc', 'select count(*) from schema_migrations']).trim())
const existingSchema = run([...compose, '-tAc', "select to_regclass('public.workspaces') is not null"]).trim() === 't'
// Existing developer databases predate the ledger. Baseline only the historic set once;
// new migrations still run normally and a fresh database starts from 001.
if (ledgerCount === 0 && existingSchema) {
  for (const file of files.filter(name => Number(name.slice(0, 3)) <= 10)) {
    const checksum = createHash('sha256').update(await readFile(join(migrationDirectory, file))).digest('hex')
    run([...compose, '-c', `insert into schema_migrations(version, checksum) values ('${file}', '${checksum}')`])
    console.log(`BASELINE ${file}`)
  }
}
for (const file of files) {
  const contents = await readFile(join(migrationDirectory, file)), checksum = createHash('sha256').update(contents).digest('hex')
  const applied = run([...compose, '-tAc', `select checksum from schema_migrations where version = '${file.replaceAll("'", "''")}'`]).trim()
  if (applied) { if (applied !== checksum) throw new Error(`Migration checksum changed after application: ${file}`); console.log(`SKIP ${file}`); continue }
  run([...compose, '-f', `/frontend-migrations/${file}`])
  run([...compose, '-c', `insert into schema_migrations(version, checksum) values ('${file.replaceAll("'", "''")}', '${checksum}')`])
  console.log(`APPLY ${file}`)
}
