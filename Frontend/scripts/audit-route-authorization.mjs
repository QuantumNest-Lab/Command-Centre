import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'app', 'api')
const publicRoute = file => { const path = relative(root, file).replaceAll('\\', '/'); return path === 'health/route.ts' || path.startsWith('auth/') || path === 'invitations/accept/route.ts' || path === 'invitations/[token]/route.ts' }
const files = async directory => (await readdir(directory, { withFileTypes: true })).flatMap(async entry => entry.isDirectory() ? files(join(directory, entry.name)) : entry.name === 'route.ts' ? [join(directory, entry.name)] : []).reduce(async (all, next) => [...await all, ...await next], Promise.resolve([]))
const routes = await files(root), findings = []
for (const file of routes) {
  const source = await readFile(file, 'utf8'), exports = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)]
  for (const [index, match] of exports.entries()) {
    const body = source.slice(match.index, exports[index + 1]?.index), auth = body.search(/requireAuthorization|requirePermission|requireCronAuthorization/), validation = body.search(/\.parse\(|safeParse|request\.json\(|await params|new URL\(/), database = body.search(/\bdb\(\)/)
    if (!publicRoute(file) && (auth < 0 || validation >= 0 && validation < auth || database >= 0 && database < auth)) findings.push({ route: `/api/${relative(root, file).replaceAll('\\', '/').replace(/\/route\.ts$/, '')}`, method: match[1], auth, validation, database, issue: auth < 0 ? 'No session authorization call' : validation >= 0 && validation < auth ? 'Validation precedes authorization' : 'Database access precedes authorization' })
  }
}
console.table(findings)
if (findings.length) process.exitCode = 1
