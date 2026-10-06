'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BarChart3, Building2, Check, CheckSquare, Files, Globe2, Mail, MapPin, Network, Phone, ReceiptText, Sparkles, Users } from 'lucide-react'

const steps = ['Workspace basics', 'Location (optional)']
const cityStates: Record<string, string> = {
  Ahmedabad: 'Gujarat', Bengaluru: 'Karnataka', Bhopal: 'Madhya Pradesh', Chandigarh: 'Chandigarh',
  Chennai: 'Tamil Nadu', Coimbatore: 'Tamil Nadu', Delhi: 'Delhi', Faridabad: 'Haryana',
  Ghaziabad: 'Uttar Pradesh', Gurugram: 'Haryana', Guwahati: 'Assam', Hyderabad: 'Telangana',
  Indore: 'Madhya Pradesh', Jaipur: 'Rajasthan', Kochi: 'Kerala', Kolkata: 'West Bengal',
  Lucknow: 'Uttar Pradesh', Ludhiana: 'Punjab', Mumbai: 'Maharashtra', Mysuru: 'Karnataka',
  Nagpur: 'Maharashtra', Noida: 'Uttar Pradesh', Patna: 'Bihar', Pune: 'Maharashtra',
  Surat: 'Gujarat', Thane: 'Maharashtra', Thiruvananthapuram: 'Kerala', Vadodara: 'Gujarat',
  Vijayawada: 'Andhra Pradesh', Visakhapatnam: 'Andhra Pradesh',
}
const states = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Delhi', 'Gujarat', 'Haryana', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal']
const benefits = [[Users, 'Manage clients', 'Keep all your client information organized.'], [Files, 'Organize documents', 'Store, share, and collaborate securely.'], [CheckSquare, 'Track tasks', 'Stay on top of work across projects.'], [BarChart3, 'Grow your business', 'Streamline operations and focus on what matters.']] as const

export default function CompanySetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [legalName, setLegalName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [taxId, setTaxId] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/me').then(async response => {
      if (!response.ok) throw new Error()
      const me = await response.json()
      if (me.workspace.companySetupComplete) router.replace('/dashboard')
    }).catch(() => router.replace('/sign-in'))
  }, [router])

  function updateCity(value: string) {
    setCity(value)
    const matchedCity = Object.keys(cityStates).find(entry => entry.toLocaleLowerCase() === value.trim().toLocaleLowerCase())
    if (matchedCity) setState(cityStates[matchedCity])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (step === 0) {
      setStep(1)
      return
    }
    setPending(true)
    try {
      const response = await fetch('/api/company-setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name, legalName, email, phone, address, city, state, postalCode,
          website: website ? (website.includes('://') ? website : `https://${website}`) : '',
          taxId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, locale: navigator.language, currency: 'INR',
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message || 'Unable to create your workspace.')
      router.replace('/dashboard')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create your workspace.')
    } finally {
      setPending(false)
    }
  }

  return <main className="company-setup-page">
    <header className="company-setup-topbar"><div className="company-setup-progress" aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}><span>{steps[step]}</span>{steps.map((label, index) => <i key={label} className={index <= step ? 'active' : ''} />)}</div></header>
    <section className="company-setup-card"><form className="company-setup-form" autoComplete="on" onSubmit={submit}>
      <header><span className="company-setup-eyebrow">STEP {step + 1} OF {steps.length}</span><h1>{step === 0 ? 'Let’s name your workspace' : 'Where is your business based?'}</h1><p>{step === 0 ? 'Two details are enough to get started. You can add the rest whenever you need it.' : 'This is optional. Choose your city and we’ll fill the state for you.'}</p></header>
      {error && <p className="company-setup-error" role="alert">{error}</p>}
      {step === 0 && <div className="company-setup-step">
        <label><em>Company name <b>*</b></em><span><Building2 size={19} /><input required minLength={2} value={name} onChange={event => setName(event.target.value)} autoComplete="organization" placeholder="Your company name" /></span></label>
        <label><em>Business email <b>*</b></em><span><Mail size={19} /><input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="name@company.com" /></span></label>
        <details className="company-setup-disclosure"><summary>Add optional business details <span>Legal name, website, phone and GSTIN</span></summary><div className="company-setup-step company-setup-optional">
          <label><em>Legal business name</em><span><ReceiptText size={19} /><input value={legalName} onChange={event => setLegalName(event.target.value)} autoComplete="organization" placeholder="Registered legal business name" /></span></label>
          <label><em>Business phone</em><span><Phone size={19} /><input value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="Phone number" /></span></label>
          <label><em>Website</em><span><Globe2 size={19} /><input value={website} onChange={event => setWebsite(event.target.value)} autoComplete="url" placeholder="company.com" /></span></label>
          <label><em>Tax ID / GSTIN</em><span><ReceiptText size={19} /><input value={taxId} onChange={event => setTaxId(event.target.value)} placeholder="Optional" /></span></label>
        </div></details>
      </div>}
      {step === 1 && <div className="company-setup-step">
        <div className="company-setup-tip"><Sparkles size={18} /><span><strong>Quick start</strong> Select a city from the list and its state is added automatically.</span></div>
        <label><em>City</em><span><MapPin size={19} /><input value={city} onChange={event => updateCity(event.target.value)} autoComplete="address-level2" list="indian-city-options" placeholder="Start typing your city" /></span></label>
        <datalist id="indian-city-options">{Object.entries(cityStates).map(([entry, cityState]) => <option key={entry} value={entry}>{cityState}</option>)}</datalist>
        <label><em>State</em><span><MapPin size={19} /><select value={state} onChange={event => setState(event.target.value)} autoComplete="address-level1"><option value="">Select state</option>{states.map(entry => <option key={entry} value={entry}>{entry}</option>)}</select></span></label>
        <details className="company-setup-disclosure"><summary>Add street address and PIN <span>Optional — useful for invoices</span></summary><div className="company-setup-step company-setup-optional">
          <label><em>Street address</em><span><MapPin size={19} /><input value={address} onChange={event => setAddress(event.target.value)} autoComplete="street-address" placeholder="Building, street, area" /></span></label>
          <label><em>PIN code</em><span><ReceiptText size={19} /><input value={postalCode} onChange={event => setPostalCode(event.target.value)} inputMode="numeric" autoComplete="postal-code" maxLength={10} placeholder="PIN code" /></span></label>
        </div></details>
      </div>}
      <div className="company-setup-actions">{step > 0 && <button className="company-setup-back" type="button" onClick={() => { setError(''); setStep(0) }}><ArrowLeft size={18} />Back</button>}<button type="submit" disabled={pending}>{pending ? 'Creating…' : step === 0 ? 'Continue' : 'Create workspace'}<ArrowRight size={21} /></button></div>
      {step === 1 && <small>Skip this step if you prefer. You can update your location later in Settings.</small>}
    </form>
      <aside className="company-setup-aside"><div className="company-setup-visual"><div className="setup-browser"><div className="setup-dots"><i /><i /><i /></div><div className="setup-browser-body"><div className="setup-rail"><i /><i /><i /><i /></div><div className="setup-preview"><Network size={34} /><strong>{name || 'Your company'}</strong><span /><span /></div></div></div><div className="setup-ready"><b><Check size={26} /></b><strong>Workspace ready!</strong></div></div><div className="company-setup-copy"><h2>A workspace built for growth</h2><p>Set up your company in minutes and get everything in one place.</p></div><ul>{benefits.map(([Icon, title, text]) => <li key={title}><span><Icon size={22} /></span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ul></aside>
    </section>
  </main>
}
