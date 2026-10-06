export type ClientKind = 'Organization' | 'Individual'
export type Status = 'Active' | 'Inactive' | 'Reviewing' | 'In Progress' | 'On Hold' | 'Cancelled' | 'Planned' | 'Done' | 'Paid' | 'Overdue' | 'Draft' | 'Approved'

export type Client = { id: string; name: string; kind: ClientKind; owner: string; projects: number; openItems: number; lastActivity: string; status: Status; email: string; phone?: string; website?: string; createdAt?: string; ownerUserId?: string; shortName?: string; industry?: string; description?: string; contactName?: string; designation?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string; taxId?: string; paymentTerms?: string; currency?: string }
export type Project = { id: string; name: string; code?: string; client: string; status: Status; progress: number; due: string; tasks: number; priority?: 'Low' | 'Normal' | 'High' | 'Urgent'; owner?: string; startDate?: string; updatedAt?: string; dueAt?: string }
export type Activity = { id: string; time: string; actor: string; client: string; project: string; type: string; description: string; linked: string[] }

export const clients: Client[] = [
  { id: 'org-mara', name: 'Mara Coffee', kind: 'Organization', owner: 'Ananya Rao', projects: 2, openItems: 7, lastActivity: '12 min ago', status: 'Active', email: 'hello@maracoffee.co' },
  { id: 'org-morning', name: 'Morning Star Public School', kind: 'Organization', owner: 'Vikram Singh', projects: 1, openItems: 4, lastActivity: 'Yesterday', status: 'Active', email: 'admin@morningstar.edu' },
  { id: 'org-basaveshwara', name: 'Sri Basaveshwara English High School', kind: 'Organization', owner: 'Ananya Rao', projects: 2, openItems: 11, lastActivity: '2 days ago', status: 'Reviewing', email: 'office@sbhs.edu' },
  { id: 'org-indira', name: 'Indira Memorial English School', kind: 'Organization', owner: 'Meera Nair', projects: 1, openItems: 3, lastActivity: '4 days ago', status: 'Active', email: 'contact@imes.edu' },
  { id: 'org-tuff', name: 'MS Tuff', kind: 'Organization', owner: 'Vikram Singh', projects: 1, openItems: 2, lastActivity: 'Last week', status: 'Active', email: 'ops@mstuff.in' },
  { id: 'ind-raj', name: 'Rajesh Kumar', kind: 'Individual', owner: 'Meera Nair', projects: 1, openItems: 1, lastActivity: 'Last week', status: 'Active', email: 'rajesh@example.com' },
]

export const projects: Project[] = [
  { id: 'prj-books', name: 'QNL Books', client: 'Mara Coffee', status: 'In Progress', progress: 72, due: '18 Sep 2026', tasks: 8 },
  { id: 'prj-campus', name: 'QNL Campus Deployment', client: 'Morning Star Public School', status: 'In Progress', progress: 48, due: '30 Sep 2026', tasks: 14 },
  { id: 'prj-school', name: 'School Website', client: 'Sri Basaveshwara English High School', status: 'Reviewing', progress: 86, due: '22 Sep 2026', tasks: 5 },
  { id: 'prj-corp', name: 'Corporate Website', client: 'MS Tuff', status: 'Done', progress: 100, due: '02 Aug 2026', tasks: 12 },
]

export const activities: Activity[] = [
  { id: 'act-1', time: '12 min ago', actor: 'Ananya Rao', client: 'Mara Coffee', project: 'QNL Books', type: 'Requirement', description: 'Requirement REQ-0041 moved to In Progress', linked: ['REQ-0041', 'TASK-0104'] },
  { id: 'act-2', time: '1 hr ago', actor: 'Vikram Singh', client: 'Mara Coffee', project: 'QNL Books', type: 'Meeting', description: 'Product Review Meeting processed with 3 draft tasks', linked: ['MTG-0088', 'REQ-0041'] },
  { id: 'act-3', time: '3 hrs ago', actor: 'Meera Nair', client: 'Morning Star Public School', project: 'QNL Campus Deployment', type: 'File', description: 'Uploaded campus-map-final.pdf to project files', linked: ['FIL-1204'] },
  { id: 'act-4', time: 'Yesterday', actor: 'Ananya Rao', client: 'Mara Coffee', project: 'QNL Books', type: 'Invoice', description: 'Invoice INV-2026-0042 marked as Partially Paid', linked: ['INV-2026-0042', 'PAY-0031'] },
  { id: 'act-5', time: 'Yesterday', actor: 'Vikram Singh', client: 'Sri Basaveshwara English High School', project: 'School Website', type: 'Approval', description: 'Client approval APR-0019 requested', linked: ['APR-0019', 'DEL-0021'] },
]

export const folders = ['Organizations', 'Individuals', 'Internal', '01 - Client Documents', '02 - Requirements', '03 - Projects', '04 - Meetings', '05 - Media', '06 - Quotations', '07 - Invoices', '08 - Approvals', '09 - Deliverables']

export const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
export const organizationService = { async list() { await wait(); return clients.filter((c) => c.kind === 'Organization') }, async create(name: string) { await wait(); return { id: `org-${Date.now()}`, name, kind: 'Organization' as const } } }
export const taskService = { async list() { await wait(); return [{ id: 'TASK-0104', title: 'Implement Cash Bill Mode', client: 'Mara Coffee', project: 'QNL Books', status: 'In Progress' }, { id: 'TASK-0105', title: 'Add invoice print template', client: 'Mara Coffee', project: 'QNL Books', status: 'Reviewing' }, { id: 'TASK-0112', title: 'Verify deployment checklist', client: 'Morning Star Public School', project: 'QNL Campus Deployment', status: 'Done' }] } }
export const fileService = { async list() { await wait(); return [{ name: 'QNL Books v1.6.2.zip', type: 'ZIP', size: '48.2 MB', modified: 'Today', folder: '09 - Deliverables' }, { name: 'product-review-transcript.txt', type: 'TXT', size: '18 KB', modified: 'Yesterday', folder: '04 - Meetings' }, { name: 'cash-bill-specification.pdf', type: 'PDF', size: '2.4 MB', modified: '12 Sep 2026', folder: '02 - Requirements' }, { name: 'brand-assets-final.png', type: 'PNG', size: '4.8 MB', modified: '10 Sep 2026', folder: '05 - Media' }] } }
