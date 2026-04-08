// ============================================================================
// app/layout.tsx — Root Layout (Server Component)
// ============================================================================
// PURPOSE: Next.js root layout that wraps every page. Sets up fonts, metadata,
//   and the base HTML structure. This is NOT a client component — it runs on
//   the server and provides the shell for all routes.
// ARCHITECTURE: Top of the component tree. Imports globals.css which defines
//   all design tokens. Children are either app/page.tsx (home) or
//   app/session/page.tsx (session route).
// DEPENDENCIES:
//   - app/globals.css — theme tokens and Tailwind import
//   - next/font/google — Geist font family (sans + mono variants)
// DEPENDENTS: Every route in the app renders inside this layout.
// ============================================================================

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

// Load Geist sans-serif font and expose as a CSS variable for Tailwind
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

// Load Geist monospace font and expose as a CSS variable for Tailwind
// Used alongside --font-mono from globals.css for numeric displays
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// App-level metadata — used by Next.js for <title> and <meta> tags
export const metadata: Metadata = {
  title: 'MindForge',
  description: 'Adaptive cognitive training for sharper thinking',
}

// RootLayout is a server component — no 'use client' directive.
// It provides the outermost HTML structure for every page in the app.
// The body uses bg-surface and text-text-primary from globals.css tokens.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Both font CSS variables are applied at the <html> level so all
    // descendants can reference them. h-full ensures the html element
    // fills the viewport. antialiased enables font smoothing.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* min-h-full + flex col ensures the body stretches to fill the viewport,
          which is required for centering content vertically on the home screen
          and session views. bg-surface = #fafafa from globals.css. */}
      <body className="min-h-full flex flex-col bg-surface text-text-primary">
        {children}
      </body>
    </html>
  )
}
