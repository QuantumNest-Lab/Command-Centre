export const PROJECT_TYPES = [
  'Website',
  'Web app',
  'Android app',
  'iOS app',
  'Android & iOS app',
  'Software development',
  'Graphic design',
  'Consulting',
  'Implementation',
  'Internal',
] as const

export type ProjectType = typeof PROJECT_TYPES[number]

const sharedDiscovery = ['Project goals and success criteria', 'Target users and stakeholder contacts', 'Scope, assumptions, and exclusions', 'Timeline, milestones, and delivery priorities', 'Budget and approval process']

export const PROJECT_REQUIREMENT_TEMPLATES: Record<ProjectType, readonly string[]> = {
  Website: [...sharedDiscovery, 'Sitemap and page inventory', 'Content, copy, and media assets', 'Brand guidelines and visual direction', 'Domain, hosting, and deployment access', 'SEO, analytics, and cookie requirements', 'Browser, device, and accessibility requirements'],
  'Web app': [...sharedDiscovery, 'User roles and permissions', 'User journeys and functional workflows', 'Data entities, fields, and business rules', 'Integrations and API requirements', 'Authentication and security requirements', 'Reporting, notifications, and audit requirements', 'Hosting, deployment, and support requirements'],
  'Android app': [...sharedDiscovery, 'Android versions and supported devices', 'User journeys and functional workflows', 'Offline, network, and data-sync requirements', 'Authentication, permissions, and security requirements', 'Push notification requirements', 'Google Play release and signing access', 'Analytics, crash reporting, and support requirements'],
  'iOS app': [...sharedDiscovery, 'iOS versions and supported devices', 'User journeys and functional workflows', 'Offline, network, and data-sync requirements', 'Authentication, permissions, and security requirements', 'Push notification requirements', 'Apple App Store release and signing access', 'Analytics, crash reporting, and support requirements'],
  'Android & iOS app': [...sharedDiscovery, 'Supported Android and iOS versions and devices', 'Shared user journeys and platform-specific behaviour', 'Offline, network, and data-sync requirements', 'Authentication, permissions, and security requirements', 'Push notification requirements', 'Google Play and Apple App Store release access', 'Analytics, crash reporting, and support requirements'],
  'Software development': [...sharedDiscovery, 'Functional modules and user workflows', 'User roles, permissions, and approval rules', 'Data model, migration, and retention requirements', 'Integration and API requirements', 'Security, privacy, and compliance requirements', 'Reporting, notifications, and audit requirements', 'Infrastructure, deployment, and support requirements'],
  'Graphic design': [...sharedDiscovery, 'Brand guidelines, logo, and visual assets', 'Deliverable list, dimensions, and file formats', 'Creative references and visual direction', 'Copy, imagery, and asset ownership', 'Review rounds, feedback owners, and approval process', 'Source-file handover and licensing requirements'],
  Consulting: [...sharedDiscovery, 'Business problem statement and current process', 'Stakeholder interview plan', 'Information and system access required', 'Research, analysis, and workshop requirements', 'Recommendations and deliverable format', 'Review, decision, and implementation handoff process'],
  Implementation: [...sharedDiscovery, 'Current-state assessment and readiness criteria', 'Implementation scope and configuration requirements', 'Data migration and validation requirements', 'Integration and access requirements', 'Training, change-management, and documentation requirements', 'Go-live, acceptance, and support plan'],
  Internal: [...sharedDiscovery, 'Internal sponsor and decision makers', 'Team capacity and dependencies', 'Internal systems and access requirements', 'Risk, compliance, and security review', 'Internal launch and retrospective requirements'],
}
