'use client'

import { ReactNode } from 'react'
import PageTransition from './PageTransition'

interface PageShellProps {
  children: ReactNode
  maxWidth?: number
}

export default function PageShell({ children, maxWidth = 1180 }: PageShellProps) {
  return (
    <main
      style={{
        paddingTop: 80,
        paddingBottom: 80,
        paddingLeft: 24,
        paddingRight: 24,
        minHeight: '100vh',
      }}
    >
      <PageTransition>
        <div style={{ maxWidth, margin: '0 auto' }}>{children}</div>
      </PageTransition>
    </main>
  )
}
