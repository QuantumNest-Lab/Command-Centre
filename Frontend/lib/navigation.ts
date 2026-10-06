import navigation from './navigation.json'

export type NavigationItem = {
  id: string
  label: string
  group?: string
  children?: readonly string[]
}

export const navigationItems = navigation as readonly NavigationItem[]

export const navigationRoutePaths = navigationItems.flatMap(item => [
  item.id === 'dashboard' ? '/dashboard' : `/${item.id}`,
  ...(item.children ?? []).map(child => `/${item.id}/${child}`),
])

export const navigationRouteSegments = navigationRoutePaths.map(path => path.slice(1).split('/'))
