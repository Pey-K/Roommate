// Event synchronization manager for polling house events from signaling server

export interface HouseEvent {
  event_id: string
  signing_pubkey: string
  event_type: string  // "MemberJoin", "MemberLeave", "NameChange"
  encrypted_payload: string  // Server cannot decrypt
  signature: string  // Signed by member's Ed25519 key
  timestamp: string
}

export interface EncryptedHouseHint {
  signing_pubkey: string
  encrypted_state: string  // Server cannot decrypt
  signature: string  // Signed by member's Ed25519 key
  last_updated: string
}

export class EventSyncManager {
  private pollingInterval: number = 5000 // 5 seconds
  private activePolls = new Map<string, ReturnType<typeof setInterval>>()
  private lastEventIds = new Map<string, string>()
  private eventHandlers = new Map<string, (events: HouseEvent[]) => void>()

  /**
   * Start polling events for a house
   */
  async startPolling(
    signingPubkey: string,
    signalingServer: string,
    onEvents?: (events: HouseEvent[]) => void
  ) {
    if (this.activePolls.has(signingPubkey)) {
      console.log(`Already polling for house ${signingPubkey.slice(0, 8)}...`)
      return
    }

    if (onEvents) {
      this.eventHandlers.set(signingPubkey, onEvents)
    }

    const poll = async () => {
      try {
        const lastEventId = this.lastEventIds.get(signingPubkey)
        const events = await this.fetchEvents(signalingServer, signingPubkey, lastEventId)

        if (events.length > 0) {
          console.log(`Received ${events.length} events for house ${signingPubkey.slice(0, 8)}...`)

          // Call event handler
          const handler = this.eventHandlers.get(signingPubkey)
          if (handler) {
            handler(events)
          }

          // Update last event ID
          const lastEvent = events[events.length - 1]
          this.lastEventIds.set(signingPubkey, lastEvent.event_id)

          // Acknowledge events (best-effort)
          await this.acknowledgeEvents(
            signalingServer,
            signingPubkey,
            lastEvent.event_id
          ).catch(e => console.warn('Failed to ack events:', e))
        }
      } catch (error) {
        console.error(`Failed to poll events for house ${signingPubkey.slice(0, 8)}...:`, error)
      }
    }

    // Initial poll
    await poll()

    // Set up interval
    const intervalId = setInterval(poll, this.pollingInterval)
    this.activePolls.set(signingPubkey, intervalId)

    console.log(`Started polling for house ${signingPubkey.slice(0, 8)}...`)
  }

  /**
   * Stop polling for a house
   */
  stopPolling(signingPubkey: string) {
    const intervalId = this.activePolls.get(signingPubkey)
    if (intervalId) {
      clearInterval(intervalId)
      this.activePolls.delete(signingPubkey)
      this.eventHandlers.delete(signingPubkey)
      console.log(`Stopped polling for house ${signingPubkey.slice(0, 8)}...`)
    }
  }

  /**
   * Stop all polling
   */
  stopAll() {
    for (const [, intervalId] of this.activePolls) {
      clearInterval(intervalId)
    }
    this.activePolls.clear()
    this.eventHandlers.clear()
  }

  /**
   * Fetch events from signaling server
   */
  private async fetchEvents(
    signalingServer: string,
    signingPubkey: string,
    sinceEventId?: string
  ): Promise<HouseEvent[]> {
    // Normalize server URL
    const baseUrl = this.normalizeServerUrl(signalingServer)
    const url = new URL(`${baseUrl}/api/houses/${encodeURIComponent(signingPubkey)}/events`)
    if (sinceEventId) {
      url.searchParams.set('since', sinceEventId)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Acknowledge events (best-effort)
   */
  private async acknowledgeEvents(
    signalingServer: string,
    signingPubkey: string,
    lastEventId: string
  ): Promise<void> {
    const baseUrl = this.normalizeServerUrl(signalingServer)
    const url = `${baseUrl}/api/houses/${encodeURIComponent(signingPubkey)}/events/ack`

    // Get current user ID from somewhere (this would need to be passed in)
    const userId = 'unknown' // TODO: Get from context

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        last_event_id: lastEventId,
      }),
    })
  }

  /**
   * Register a house hint on the signaling server
   */
  async registerHouseHint(
    signalingServer: string,
    hint: EncryptedHouseHint
  ): Promise<void> {
    const baseUrl = this.normalizeServerUrl(signalingServer)
    const url = `${baseUrl}/api/houses/${encodeURIComponent(hint.signing_pubkey)}/register`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hint),
    })

    if (!response.ok) {
      throw new Error(`Failed to register house hint: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Get house hint from signaling server
   */
  async getHouseHint(
    signalingServer: string,
    signingPubkey: string
  ): Promise<EncryptedHouseHint | null> {
    const baseUrl = this.normalizeServerUrl(signalingServer)
    const url = `${baseUrl}/api/houses/${encodeURIComponent(signingPubkey)}/hint`

    const response = await fetch(url)
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error(`Failed to get house hint: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Post an event to the signaling server
   */
  async postEvent(
    signalingServer: string,
    event: Omit<HouseEvent, 'event_id' | 'timestamp'>
  ): Promise<void> {
    const baseUrl = this.normalizeServerUrl(signalingServer)
    const url = `${baseUrl}/api/houses/${encodeURIComponent(event.signing_pubkey)}/events`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        event_id: '',  // Server will generate
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to post event: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Normalize signaling server URL to HTTP
   */
  private normalizeServerUrl(signalingServer: string): string {
    // Remove ws:// or wss:// prefix and replace with http:// or https://
    let url = signalingServer
    if (url.startsWith('wss://')) {
      url = 'https://' + url.slice(6)
    } else if (url.startsWith('ws://')) {
      url = 'http://' + url.slice(5)
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url
    }

    // Remove trailing slash
    return url.replace(/\/$/, '')
  }
}

// Singleton instance
export const eventSyncManager = new EventSyncManager()
