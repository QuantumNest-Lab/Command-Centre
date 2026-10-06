import type { ReactNode } from 'react'
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
type Action = { label: string; onClick: () => void }
export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: Action }) { return <section className="ui-state" aria-live="polite"><Inbox aria-hidden="true" /><strong>{title}</strong>{detail && <p>{detail}</p>}{action && <button type="button" className="button button-primary" onClick={action.onClick}>{action.label}</button>}</section> }
export function LoadingSkeleton({ label = 'Loading content' }: { label?: string }) { return <section className="ui-state ui-loading" aria-label={label} aria-busy="true"><LoaderCircle aria-hidden="true" /><span>{label}</span></section> }
export function ErrorState({ title = 'Unable to load this content', detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) { return <section className="ui-state ui-error" role="alert"><AlertCircle aria-hidden="true" /><strong>{title}</strong>{detail && <p>{detail}</p>}{onRetry && <button type="button" className="button button-subtle" onClick={onRetry}>Try again</button>}</section> }
export function DataTable({ children, className = '' }: { children: ReactNode; className?: string }) { return <div className={`ui-data-table ${className}`}>{children}</div> }
