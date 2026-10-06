export const routes = {
  dashboard: () => '/',
  clients: (query = '') => `/clients${query}`,
  client: (id: string) => `/clients?record=${encodeURIComponent(id)}`,
  projects: () => '/projects',
  project: (id: string) => `/projects?record=${encodeURIComponent(id)}`,
  requirements: (query = '') => `/requirements${query}`,
  tasks: (query = '') => `/tasks${query}`,
  activity: () => '/activity',
  drive: () => '/drive',
  meetings: () => '/meetings',
  calendar: () => '/calendar',
  documents: () => '/documents',
  documentType: (type: 'quotations' | 'invoices' | 'bills' | 'approvals' | 'proposals' | 'contracts') => `/documents/${type}`,
  finance: () => '/finance',
  financeType: (type: 'receivables' | 'payments' | 'expenses') => `/finance/${type}`,
  approvals: () => '/approvals',
  team: () => '/team',
  settings: () => '/settings',
  settingsType: (type: 'company' | 'billing' | 'storage' | 'team' | 'security' | 'appearance') => `/settings/${type}`,
} as const

export type AppRoute = ReturnType<(typeof routes)[keyof typeof routes]>
