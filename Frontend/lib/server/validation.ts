import { z } from 'zod'

export const passwordSchema = z.string().min(10, 'Use at least 10 characters.').max(128).regex(/[a-z]/, 'Include a lowercase letter.').regex(/[A-Z]/, 'Include an uppercase letter.').regex(/\d/, 'Include a number.').regex(/[^A-Za-z0-9]/, 'Include a symbol.')
export const signUpSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(255), password: passwordSchema, confirmPassword: passwordSchema.optional() }).refine(data => !data.confirmPassword || data.password === data.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] })
export const signInSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(128) })
const websiteInput = z.preprocess(value => {
  if (typeof value !== 'string') return value
  const website = value.trim()
  if (!website) return undefined
  return /^[a-z][a-z\d+.-]*:\/\//i.test(website) ? website : `https://${website}`
}, z.string().url().max(2048).optional())
export const clientCreateSchema = z.object({ name: z.string().trim().min(2).max(180), kind: z.enum(['ORGANIZATION', 'INDIVIDUAL']).default('ORGANIZATION'), email: z.string().trim().email().max(255).optional().or(z.literal('')), phone: z.string().trim().max(40).optional(), website: websiteInput, ownerUserId: z.string().uuid().optional(), status: z.enum(['ACTIVE', 'REVIEWING', 'INACTIVE']).default('ACTIVE') })
export const clientUpdateSchema = clientCreateSchema.partial().extend({ version: z.number().int().positive() })
