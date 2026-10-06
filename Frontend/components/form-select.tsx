'use client'

import { Check, ChevronDown } from 'lucide-react'
import React, { useEffect, useId, useRef, useState } from 'react'

export type FormSelectOption = { value: string; label: React.ReactNode }

type Props = {
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  options: FormSelectOption[]
  placeholder?: React.ReactNode
  disabled?: boolean
  ariaLabel: string
  menuPosition?: 'up'
}

/** Shared, app-native select for all creation forms. */
export function FormSelect({ icon, value, onChange, options, placeholder = 'Select an option', disabled = false, ariaLabel, menuPosition }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return <div ref={root} className={`form-select client-select-control ${open ? 'open' : ''} ${menuPosition === 'up' ? 'menu-up' : ''}`}>
    <button type="button" className="client-select-trigger" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-controls={menuId} aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) } }}>
      {icon}<span>{selected?.label || placeholder}</span><ChevronDown aria-hidden="true" />
    </button>
    {open && <div id={menuId} className="client-select-menu" role="listbox" aria-label={ariaLabel}>
      {options.map(option => <button key={option.value || '__empty'} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false) }}><span>{option.label}</span>{option.value === value && <Check aria-hidden="true" />}</button>)}
    </div>}
  </div>
}
