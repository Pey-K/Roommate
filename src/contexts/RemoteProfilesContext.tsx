import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAccount } from './AccountContext'

export type RemoteProfile = {
  user_id: string
  display_name: string
  secondary_name: string | null
  show_secondary: boolean
  rev: number
}

type RemoteProfilesContextType = {
  profiles: Map<string, RemoteProfile>
  applyUpdate: (u: {
    user_id: string
    display_name: string
    secondary_name: string | null
    show_secondary: boolean
    rev: number
  }) => void
  getProfile: (userId: string) => RemoteProfile | undefined
}

const RemoteProfilesContext = createContext<RemoteProfilesContextType | null>(null)

export function RemoteProfilesProvider({ children }: { children: ReactNode }) {
  const { currentAccountId } = useAccount()
  const [profiles, setProfiles] = useState<Map<string, RemoteProfile>>(new Map())

  // Reset on account switch/logout (keeps data scoped to the current session)
  useEffect(() => {
    setProfiles(new Map())
  }, [currentAccountId])

  const applyUpdate: RemoteProfilesContextType['applyUpdate'] = (u) => {
    setProfiles((prev) => {
      const next = new Map(prev)
      const existing = next.get(u.user_id)
      if (existing && u.rev <= existing.rev) return prev
      next.set(u.user_id, {
        user_id: u.user_id,
        display_name: u.display_name,
        secondary_name: u.secondary_name ?? null,
        show_secondary: Boolean(u.show_secondary),
        rev: u.rev,
      })
      return next
    })
  }

  const value = useMemo<RemoteProfilesContextType>(() => {
    return {
      profiles,
      applyUpdate,
      getProfile: (userId) => profiles.get(userId),
    }
  }, [profiles])

  return <RemoteProfilesContext.Provider value={value}>{children}</RemoteProfilesContext.Provider>
}

export function useRemoteProfiles() {
  const ctx = useContext(RemoteProfilesContext)
  if (!ctx) throw new Error('useRemoteProfiles must be used within a RemoteProfilesProvider')
  return ctx
}

