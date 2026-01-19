import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { checkSignalingServer, getSignalingServerUrl } from '../lib/tauri'
import { useAccount } from './AccountContext'

export type SignalingStatus = 'connected' | 'disconnected' | 'checking'

interface SignalingContextType {
  status: SignalingStatus
  signalingUrl: string
  checkHealth: () => Promise<void>
  reloadUrl: () => Promise<void>
}

const SignalingContext = createContext<SignalingContextType | null>(null)

export function SignalingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SignalingStatus>('checking')
  const [signalingUrl, setSignalingUrl] = useState<string>('')
  const healthCheckInFlightRef = useRef(false)
  const { currentAccountId } = useAccount()

  // Manual/foreground health check: shows "checking" in the UI (used on initial load and when a user explicitly triggers it).
  const checkHealth = useCallback(async () => {
    if (healthCheckInFlightRef.current) return
    healthCheckInFlightRef.current = true

    setStatus('checking')
    try {
      const isHealthy = await checkSignalingServer(signalingUrl || undefined)
      setStatus(isHealthy ? 'connected' : 'disconnected')
    } catch (error) {
      console.error('Signaling health check failed:', error)
      setStatus('disconnected')
    } finally {
      healthCheckInFlightRef.current = false
    }
  }, [signalingUrl])

  // Background health check: does NOT flip the UI to "checking" (prevents flicker/disabled-button flashes).
  const checkHealthSilent = useCallback(async () => {
    if (healthCheckInFlightRef.current) return
    healthCheckInFlightRef.current = true

    try {
      const isHealthy = await checkSignalingServer(signalingUrl || undefined)
      setStatus(prev => {
        const next: SignalingStatus = isHealthy ? 'connected' : 'disconnected'
        // Don't overwrite "checking" during the initial load until the first foreground check runs.
        if (prev === 'checking') return prev
        return next
      })
    } catch (error) {
      console.error('Signaling health check failed:', error)
      setStatus(prev => (prev === 'checking' ? prev : 'disconnected'))
    } finally {
      healthCheckInFlightRef.current = false
    }
  }, [signalingUrl])

  const reloadUrl = useCallback(async () => {
    try {
      const url = await getSignalingServerUrl()
      setSignalingUrl(url)
    } catch (error) {
      console.error('Failed to load signaling URL:', error)
    }
  }, [])

  useEffect(() => {
    // Load saved signaling server URL
    reloadUrl()
  }, [reloadUrl])

  // Reload URL when account changes (each account can have its own signaling server)
  useEffect(() => {
    if (currentAccountId) {
      reloadUrl()
    }
  }, [currentAccountId, reloadUrl])

  useEffect(() => {
    if (!signalingUrl) return

    // Initial health check
    checkHealth()

    // Periodic health check every 30 seconds
    const interval = setInterval(checkHealthSilent, 30000)

    return () => clearInterval(interval)
  }, [signalingUrl, checkHealth, checkHealthSilent])

  return (
    <SignalingContext.Provider value={{ status, signalingUrl, checkHealth, reloadUrl }}>
      {children}
    </SignalingContext.Provider>
  )
}

export function useSignaling() {
  const context = useContext(SignalingContext)
  if (!context) {
    throw new Error('useSignaling must be used within a SignalingProvider')
  }
  return context
}
