'use client'

import { ArrowLeft, ArrowRight, CheckCircle2, Circle, KeyRound, LockKeyhole } from 'lucide-react'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'

const passwordRules = (password: string) => [
  ['10 or more characters', password.length >= 10],
  ['An uppercase letter', /[A-Z]/.test(password)],
  ['A lowercase letter', /[a-z]/.test(password)],
  ['A number and symbol', /\d/.test(password) && /[^A-Za-z0-9]/.test(password)],
] as const

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const rules = useMemo(() => passwordRules(password), [password])
  const passwordIsValid = rules.every(([, valid]) => valid)
  const passwordsMatch = password === confirmPassword

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get('token')
    setToken(resetToken)
    if (!resetToken) setError('This reset link is invalid or incomplete. Please request a new one.')
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    if (!passwordIsValid) {
      setError('Choose a password that meets every requirement.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to reset your password.')
      setComplete(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reset your password.')
    } finally {
      setPending(false)
    }
  }

  return <main className="saas-auth saas-auth-recovery">
    <section className="saas-auth-shell">
      <section className="saas-auth-content saas-auth-centered">
        <Link className="saas-auth-back" href="/sign-in"><ArrowLeft size={16} />Back to sign in</Link>
        <form className="saas-auth-card saas-auth-recovery-card" onSubmit={submit}>
          <div className="saas-auth-recovery-icon">{complete ? <CheckCircle2 /> : <KeyRound />}</div>
          <header>
            <span className="saas-auth-overline">ACCOUNT RECOVERY</span>
            <h2>{complete ? 'Password updated' : 'Create a new password'}</h2>
            <p>{complete ? 'Your password has been changed. You can now sign in with your new credentials.' : 'Choose a strong password that you do not use elsewhere.'}</p>
          </header>
          {complete ? <Link className="saas-auth-submit" href="/sign-in">Continue to sign in <ArrowRight size={18} /></Link> : <>
            {error && <p className="saas-auth-error" role="alert">{error}</p>}
            <label>New password<span className="saas-auth-input"><LockKeyhole size={18} /><input required value={password} onChange={event => setPassword(event.target.value)} minLength={10} maxLength={128} type="password" autoComplete="new-password" placeholder="Create a new password" /></span></label>
            <label>Confirm new password<span className={`saas-auth-input ${confirmPassword && !passwordsMatch ? 'invalid' : ''}`}><LockKeyhole size={18} /><input required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={10} maxLength={128} type="password" autoComplete="new-password" placeholder="Re-enter your new password" /></span></label>
            {confirmPassword && <p className={`saas-password-match ${passwordsMatch ? 'met' : ''}`}>{passwordsMatch ? <CheckCircle2 /> : <Circle />}{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</p>}
            <ul className="saas-password-rules" aria-label="Password requirements">{rules.map(([label, valid]) => <li key={label} className={valid ? 'met' : ''}>{valid ? <CheckCircle2 /> : <Circle />}{label}</li>)}</ul>
            <button className="saas-auth-submit" type="submit" disabled={pending || !token}>{pending ? 'Updating password…' : <>Update password <ArrowRight size={18} /></>}</button>
          </>}
        </form>
      </section>
    </section>
  </main>
}
