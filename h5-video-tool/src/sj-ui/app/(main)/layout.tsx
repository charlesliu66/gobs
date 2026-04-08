import { MainTopNav } from "@/components/main-top-nav"
import { RefreshProvider } from "@/contexts/refresh-context"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <RefreshProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <MainTopNav />
        <main className="flex-1 overflow-auto px-4 py-4 pb-24 md:px-6 md:py-5 md:pb-24">{children}</main>
      </div>
    </RefreshProvider>
  )
}
