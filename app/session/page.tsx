// ============================================================================
// app/session/page.tsx — Session Route Shell (Server Component)
// ============================================================================
// PURPOSE: Minimal server component for the "/session" route. Its only job is
//   to render the SessionView client component, which contains all session logic.
// ARCHITECTURE: This is the server/client boundary. Next.js requires page.tsx
//   to be the route entry point. SessionView is 'use client' and handles all
//   state, keyboard events, and localStorage access.
// DEPENDENCIES:
//   - app/session/session-view.tsx — the actual session orchestrator (client)
// DEPENDENTS: Next.js router renders this when navigating to /session
// NOTES:
//   - This file intentionally has no 'use client' — it's a server component
//   - No props, no data fetching — just a pass-through to the client component
// ============================================================================

import { SessionView } from './session-view'

// SessionPage is the default export for the /session route.
// It delegates entirely to SessionView, which is the client-side state machine.
export default function SessionPage() {
  return <SessionView />
}
