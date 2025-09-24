"use client"

import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import React from 'react'
import { SidebarProvider } from './_components/ui/sidebar'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      <SidebarProvider>
      {children}
      </SidebarProvider>
    </ConvexAuthProvider>
  )
}

export default Providers