export type ClientOwner = { id: string; name: string; email: string }

export type ApiClient = {
  id: string
  name: string
  kind: 'ORGANIZATION' | 'INDIVIDUAL'
  email: string | null
  phone: string | null
  website: string | null
  short_name: string | null
  industry: string | null
  description: string | null
  contact_name: string | null
  designation: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  tax_id: string | null
  payment_terms: string | null
  currency: string | null
  status: 'ACTIVE' | 'REVIEWING' | 'INACTIVE'
  owner: ClientOwner | null
  project_count?: number
  open_item_count?: number
  created_at: string
  updated_at: string
}
