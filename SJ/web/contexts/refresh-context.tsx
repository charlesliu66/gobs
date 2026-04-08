"use client"

import * as React from "react"

type RefreshContextValue = {
  registerRefresh: (key: string, fn: () => void) => () => void
  refreshAll: () => void
}

const RefreshContext = React.createContext<RefreshContextValue | null>(null)

export function useRefresh() {
  const ctx = React.useContext(RefreshContext)
  if (!ctx) return null
  return ctx
}

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const fnsRef = React.useRef<Map<string, () => void>>(new Map())

  const registerRefresh = React.useCallback((key: string, fn: () => void) => {
    fnsRef.current.set(key, fn)
    return () => { fnsRef.current.delete(key) }
  }, [])

  const refreshAll = React.useCallback(() => {
    fnsRef.current.forEach((fn) => {
      try { fn() } catch (_) {}
    })
  }, [])

  const value = React.useMemo(() => ({ registerRefresh, refreshAll }), [registerRefresh, refreshAll])
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
}
