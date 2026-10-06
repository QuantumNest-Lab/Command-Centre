'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Member = { id: string; user_id: string; name: string; display_name: string | null; email: string; role: string; status: string }
type Props = { value?: string | null; onChange: (userId: string) => void; disabled?: boolean; label?: string; excludeUserIds?: readonly string[] }

export function ActiveMemberSelector({ value, onChange, disabled = false, label = 'Owner', excludeUserIds = [] }: Props) {
  const [members, setMembers] = useState<Member[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState(''), [open, setOpen] = useState(false)
  useEffect(() => { let active = true; void fetch('/api/team').then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load active members.'); return body.items as Member[] }).then(items => { if (active) setMembers(items.filter(member => member.status === 'ACTIVE')) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load active members.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const visible = useMemo(() => { const available = members.filter(member => !excludeUserIds.includes(member.user_id)), term = search.trim().toLowerCase(); return term ? available.filter(member => `${member.display_name || member.name} ${member.email} ${member.role}`.toLowerCase().includes(term)) : available }, [members, search, excludeUserIds])
  const selected = members.find(member => member.user_id === value)
  if (loading) return <label>{label}<span className="form-hint">Loading active members…</span></label>
  if (error) return <label>{label}<span className="form-error">{error}</span></label>
  if (!members.length) return <label>{label}<span className="form-hint">No active workspace members are available.</span></label>
  return <label className="active-member-selector">{label}<span className={`member-picker ${open ? 'open' : ''}`} onBlur={() => setOpen(false)}><button type="button" className="member-picker-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}><span>{selected ? `${selected.display_name || selected.name} · ${selected.email}` : 'Select an active member'}</span><ChevronDown /></button>{open && <span className="member-picker-menu" role="listbox">{members.length > 8 && <input autoFocus aria-label={`Search ${label.toLowerCase()}`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search members" onKeyDown={event => event.stopPropagation()} />}{visible.length ? visible.map(member => <button key={member.user_id} type="button" role="option" aria-selected={member.user_id === value} onMouseDown={event => event.preventDefault()} onClick={() => { onChange(member.user_id); setOpen(false); setSearch('') }}><span><b>{member.display_name || member.name}</b><small>{member.email} · {member.role}</small></span>{member.user_id === value && <Check />}</button>) : <span className="member-picker-empty">No matching members</span>}</span>}</span></label>
}
