// ============================================================================
// app/stats/page.tsx — Analytics Dashboard Route
// ============================================================================
// PURPOSE: Server component wrapper for the "/stats" route. Renders the
//   client-side StatsView component which loads data from localStorage.
// ARCHITECTURE: Thin server page that delegates to a 'use client' component.
//   This pattern is consistent with app/session/page.tsx.
// DEPENDENCIES:
//   - app/stats/stats-view.tsx (client component with all stats logic)
// DEPENDENTS: None (leaf route, navigated to from app/page.tsx)
// ============================================================================

import { StatsView } from './stats-view'

export default function StatsPage() {
  return <StatsView />
}
