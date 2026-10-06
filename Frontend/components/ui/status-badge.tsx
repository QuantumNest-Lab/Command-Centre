import type { ReactNode } from 'react'
export type StatusTone = 'success' | 'danger' | 'info' | 'warning' | 'neutral'
const statuses: Record<string, StatusTone> = { active: 'success', approved: 'success', complete: 'success', completed: 'success', done: 'success', paid: 'success', overdue: 'danger', rejected: 'danger', cancelled: 'danger', 'changes requested': 'danger', 'in progress': 'info', reviewing: 'info', sent: 'info', scheduled: 'info', draft: 'warning', pending: 'warning', requested: 'warning', 'to do': 'warning' }
export function statusTone(status: string): StatusTone { return statuses[status.trim().toLowerCase()] || 'neutral' }
export function StatusBadge({ status, children }: { status: string; children?: ReactNode }) { return <span className={`status-badge status-${statusTone(status)}`}>{children || status}</span> }
