import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react'
import { InputLevelMeter } from '../lib/audio'
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  handleAnswer,
  addIceCandidate,
  attachAudioTrack,
  createRemoteAudioElement,
  closePeerConnection,
  stopRemoteAudio
} from '../lib/webrtc'
import { useSignaling } from './SignalingContext'

/**
 * WebRTC Context for peer-to-peer voice communication.
 *
 * ARCHITECTURAL NOTE: This context currently owns its own WebSocket connection
 * for signaling. This is acceptable for Phase 3a MVP, but long-term we should:
 *
 * 1. Move WebSocket ownership to SignalingContext
 * 2. Have SignalingContext emit/consume signaling messages
 * 3. Keep WebRTCContext focused on peer connection management
 *
 * This prevents:
 * - Duplicate WebSocket connections
 * - Fragmented reconnection/auth logic
 * - Harder Cloudflare/proxy handling
 *
 * TODO: Refactor signaling ownership in Phase 3b or Phase 4
 */

export type PeerConnectionState = RTCPeerConnectionState

export interface PeerConnectionInfo {
  connection: RTCPeerConnection
  remoteStream: MediaStream | null
  audioElement: HTMLAudioElement | null
  connectionState: PeerConnectionState
}

interface WebRTCContextType {
  // Connection management
  joinVoice(roomId: string, houseId: string, peerId: string): Promise<void>
  leaveVoice(): void

  // Local controls
  toggleMute(): void
  setOutputDevice(deviceId: string): void

  // State
  isInVoice: boolean
  isLocalMuted: boolean
  peers: Map<string, PeerConnectionInfo>

  // Integration
  setInputLevelMeter(meter: InputLevelMeter | null): void
}

const WebRTCContext = createContext<WebRTCContextType | null>(null)

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const { signalingUrl } = useSignaling()

  // State
  const [isInVoice, setIsInVoice] = useState(false)
  const [isLocalMuted, setIsLocalMuted] = useState(false)
  const [peers, setPeers] = useState<Map<string, PeerConnectionInfo>>(new Map())

  // Refs
  const inputLevelMeterRef = useRef<InputLevelMeter | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const currentRoomRef = useRef<string | null>(null)
  const currentHouseRef = useRef<string | null>(null)
  const currentPeerIdRef = useRef<string | null>(null)
  const outputDeviceRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveVoice()
    }
  }, [])

  const setInputLevelMeter = useCallback((meter: InputLevelMeter | null) => {
    inputLevelMeterRef.current = meter
  }, [])

  const setOutputDevice = useCallback((deviceId: string) => {
    outputDeviceRef.current = deviceId

    // Update all existing remote audio elements
    peers.forEach((peerInfo) => {
      if (peerInfo.audioElement && 'setSinkId' in peerInfo.audioElement) {
        (peerInfo.audioElement as any).setSinkId(deviceId).catch((error: Error) => {
          console.warn('[WebRTC] Failed to update output device for peer:', error)
        })
      }
    })
  }, [peers])

  const toggleMute = useCallback(() => {
    const meter = inputLevelMeterRef.current
    if (!meter) return

    const newMutedState = !isLocalMuted
    setIsLocalMuted(newMutedState)

    // Update InputLevelMeter to gate transmission (overrides VAD/PTT)
    meter.setTransmissionMuted(newMutedState)

    console.log(`[WebRTC] ${newMutedState ? 'Muted' : 'Unmuted'} local audio`)
  }, [isLocalMuted])

  const createPeerConnectionForPeer = useCallback(async (remotePeerId: string): Promise<RTCPeerConnection> => {
    const pc = createPeerConnection()

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        const message = {
          type: 'IceCandidate',
          from_peer: currentPeerIdRef.current,
          to_peer: remotePeerId,
          candidate: JSON.stringify(event.candidate)
        }
        wsRef.current.send(JSON.stringify(message))
        console.log(`[WebRTC] Sent ICE candidate to ${remotePeerId}`)
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection to ${remotePeerId}: ${pc.connectionState}`)

      setPeers(prev => {
        const updated = new Map(prev)
        const peerInfo = updated.get(remotePeerId)
        if (peerInfo) {
          peerInfo.connectionState = pc.connectionState
          updated.set(remotePeerId, { ...peerInfo })
        }
        return updated
      })

      // Clean up if connection fails
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        handlePeerDisconnect(remotePeerId)
      }
    }

    // Handle remote audio track
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${remotePeerId}`)
      const remoteStream = event.streams[0]

      if (remoteStream) {
        const audioElement = createRemoteAudioElement(remoteStream, outputDeviceRef.current || undefined)

        setPeers(prev => {
          const updated = new Map(prev)
          const peerInfo = updated.get(remotePeerId)
          if (peerInfo) {
            peerInfo.remoteStream = remoteStream
            peerInfo.audioElement = audioElement
            updated.set(remotePeerId, { ...peerInfo })
          }
          return updated
        })
      }
    }

    // Attach local audio track
    const localStream = localStreamRef.current
    if (localStream) {
      attachAudioTrack(pc, localStream)
    }

    return pc
  }, [])

  const handlePeerDisconnect = useCallback((remotePeerId: string) => {
    console.log(`[WebRTC] Peer ${remotePeerId} disconnected`)

    setPeers(prev => {
      const updated = new Map(prev)
      const peerInfo = updated.get(remotePeerId)

      if (peerInfo) {
        // Cleanup
        if (peerInfo.audioElement) {
          stopRemoteAudio(peerInfo.audioElement)
        }
        closePeerConnection(peerInfo.connection)
        updated.delete(remotePeerId)
      }

      return updated
    })
  }, [])

  const handleSignalingMessage = useCallback(async (data: any) => {
    const msg = JSON.parse(data)
    console.log('[WebRTC] Received signaling message:', msg.type)

    switch (msg.type) {
      case 'Registered': {
        const { peers: existingPeers } = msg
        console.log(`[WebRTC] Registered! Existing peers:`, existingPeers)

        // Create peer connections for all existing peers
        for (const remotePeerId of existingPeers) {
          try {
            const pc = await createPeerConnectionForPeer(remotePeerId)

            setPeers(prev => {
              const updated = new Map(prev)
              updated.set(remotePeerId, {
                connection: pc,
                remoteStream: null,
                audioElement: null,
                connectionState: pc.connectionState
              })
              return updated
            })

            // Create and send offer
            const offerSdp = await createOffer(pc)
            const offerMessage = {
              type: 'Offer',
              from_peer: currentPeerIdRef.current,
              to_peer: remotePeerId,
              sdp: offerSdp
            }
            wsRef.current?.send(JSON.stringify(offerMessage))
            console.log(`[WebRTC] Sent offer to ${remotePeerId}`)
          } catch (error) {
            console.error(`[WebRTC] Failed to create offer for ${remotePeerId}:`, error)
          }
        }
        break
      }

      case 'Offer': {
        const { from_peer, sdp } = msg
        console.log(`[WebRTC] Received offer from ${from_peer}`)

        try {
          const pc = await createPeerConnectionForPeer(from_peer)

          setPeers(prev => {
            const updated = new Map(prev)
            updated.set(from_peer, {
              connection: pc,
              remoteStream: null,
              audioElement: null,
              connectionState: pc.connectionState
            })
            return updated
          })

          // Create and send answer
          const answerSdp = await createAnswer(pc, sdp)
          const answerMessage = {
            type: 'Answer',
            from_peer: currentPeerIdRef.current,
            to_peer: from_peer,
            sdp: answerSdp
          }
          wsRef.current?.send(JSON.stringify(answerMessage))
          console.log(`[WebRTC] Sent answer to ${from_peer}`)
        } catch (error) {
          console.error(`[WebRTC] Failed to handle offer from ${from_peer}:`, error)
        }
        break
      }

      case 'Answer': {
        const { from_peer, sdp } = msg
        console.log(`[WebRTC] Received answer from ${from_peer}`)

        const peerInfo = peers.get(from_peer)
        if (peerInfo) {
          try {
            await handleAnswer(peerInfo.connection, sdp)
            console.log(`[WebRTC] Applied answer from ${from_peer}`)
          } catch (error) {
            console.error(`[WebRTC] Failed to apply answer from ${from_peer}:`, error)
          }
        }
        break
      }

      case 'IceCandidate': {
        const { from_peer, candidate } = msg
        console.log(`[WebRTC] Received ICE candidate from ${from_peer}`)

        const peerInfo = peers.get(from_peer)
        if (peerInfo) {
          try {
            await addIceCandidate(peerInfo.connection, candidate)
          } catch (error) {
            console.error(`[WebRTC] Failed to add ICE candidate from ${from_peer}:`, error)
          }
        }
        break
      }

      case 'Error': {
        console.error('[WebRTC] Signaling error:', msg.message)
        break
      }

      default:
        console.warn('[WebRTC] Unknown message type:', msg.type)
    }
  }, [peers, createPeerConnectionForPeer])

  const joinVoice = useCallback(async (roomId: string, houseId: string, peerId: string) => {
    if (isInVoice) {
      console.warn('[WebRTC] Already in voice')
      return
    }

    if (!signalingUrl) {
      console.error('[WebRTC] No signaling server URL configured')
      throw new Error('No signaling server configured')
    }

    const meter = inputLevelMeterRef.current
    if (!meter) {
      console.error('[WebRTC] No InputLevelMeter available')
      throw new Error('Audio not initialized')
    }

    console.log(`[WebRTC] Joining voice in room ${roomId} (house ${houseId})`)

    // Get transmission stream from InputLevelMeter
    const stream = meter.getTransmissionStream()
    if (!stream) {
      console.error('[WebRTC] Failed to get transmission stream')
      throw new Error('Failed to get audio stream')
    }

    localStreamRef.current = stream
    currentRoomRef.current = roomId
    currentHouseRef.current = houseId
    currentPeerIdRef.current = peerId

    // Connect to signaling server
    const ws = new WebSocket(signalingUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebRTC] Connected to signaling server')

      // Register with house
      const registerMessage = {
        type: 'Register',
        house_id: houseId,
        peer_id: peerId
      }
      ws.send(JSON.stringify(registerMessage))
      console.log('[WebRTC] Sent registration')
    }

    ws.onmessage = (event) => {
      handleSignalingMessage(event.data)
    }

    ws.onerror = (error) => {
      console.error('[WebRTC] WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('[WebRTC] WebSocket closed')
    }

    setIsInVoice(true)
  }, [isInVoice, signalingUrl, handleSignalingMessage])

  const leaveVoice = useCallback(() => {
    if (!isInVoice) {
      return
    }

    console.log('[WebRTC] Leaving voice')

    // Close all peer connections
    peers.forEach((peerInfo) => {
      if (peerInfo.audioElement) {
        stopRemoteAudio(peerInfo.audioElement)
      }
      closePeerConnection(peerInfo.connection)
    })

    // Clear peers
    setPeers(new Map())

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Clear refs
    localStreamRef.current = null
    currentRoomRef.current = null
    currentHouseRef.current = null
    currentPeerIdRef.current = null

    setIsInVoice(false)
    setIsLocalMuted(false)

    console.log('[WebRTC] Left voice')
  }, [isInVoice, peers])

  return (
    <WebRTCContext.Provider
      value={{
        joinVoice,
        leaveVoice,
        toggleMute,
        setOutputDevice,
        isInVoice,
        isLocalMuted,
        peers,
        setInputLevelMeter
      }}
    >
      {children}
    </WebRTCContext.Provider>
  )
}

export function useWebRTC() {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return context
}
