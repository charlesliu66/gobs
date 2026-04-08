"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ControlPanel } from "@/components/control-panel"
import { Separator } from "@/components/ui/separator"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4 mx-2" />
          <nav className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Dashboard</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">Bulk Comments</span>
          </nav>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <ControlPanel />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
