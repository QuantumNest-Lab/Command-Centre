import { notFound } from 'next/navigation'
import Page from '../page'
import { navigationRouteSegments } from '@/lib/navigation'

const validRoutes = new Set(navigationRouteSegments.map(segments => segments.join('/')))

export default async function CatchAllRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  if (!validRoutes.has(slug.join('/'))) notFound()
  return <Page />
}

export function generateStaticParams() {
  return navigationRouteSegments.map(slug => ({ slug }))
}
