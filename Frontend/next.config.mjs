import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Local convenience only: production/deployed environments provide their own
// DATABASE_URL and SESSION_SECRET. Never overwrite an explicitly supplied value.
const localBackendEnv = resolve(process.cwd(), '../Backend/.env')
if (existsSync(localBackendEnv)) {
  for (const line of readFileSync(localBackendEnv, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

export default nextConfig
