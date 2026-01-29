import { Link } from 'react-router-dom'
import { PhoneOff, Settings } from 'lucide-react'
import { useIdentity } from '../contexts/IdentityContext'
import { useProfile } from '../contexts/ProfileContext'
import { useWebRTC } from '../contexts/WebRTCContext'
import { useSignaling } from '../contexts/SignalingContext'
import { useActiveHouse } from '../contexts/ActiveHouseContext'
import { useSidebarWidth } from '../contexts/SidebarWidthContext'
import { useMemo, useRef, useState, useEffect, type CSSProperties } from 'react'
import { Button } from './ui/button'

function hashId(s: string) {
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return hash
}

function initials(name: string) {
  const cleaned = name.trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Self presence: gray = offline, orange = neighborhood, green = in house, blue = in call */
type SelfPresence = 'offline' | 'neighborhood' | 'in_house' | 'in_call'

function getSelfPresence(
  signalingConnected: boolean,
  activeSigningPubkey: string | null,
  isInVoice: boolean
): SelfPresence {
  if (!signalingConnected) return 'offline'
  if (isInVoice) return 'in_call'
  if (activeSigningPubkey != null) return 'in_house'
  return 'neighborhood'
}

export function UserCard() {
  const { identity } = useIdentity()
  const { profile } = useProfile()
  const { isInVoice, leaveVoice } = useWebRTC()
  const { status: signalingStatus } = useSignaling()
  const { activeSigningPubkey } = useActiveHouse()
  const { width, setWidth, resetWidth } = useSidebarWidth()
  const resizeHandleRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)

  const style: CSSProperties | undefined = useMemo(() => {
    const userId = identity?.user_id
    if (!userId) return undefined
    const h = hashId(userId) % 360
    return {
      backgroundColor: `hsl(${h} 60% 78%)`,
      color: `hsl(${h} 35% 25%)`,
    }
  }, [identity?.user_id])

  const displayName = profile.display_name || identity?.display_name || 'Account'
  const signalingConnected = signalingStatus === 'connected'
  const selfPresence = getSelfPresence(signalingConnected, activeSigningPubkey, isInVoice)

  const getStatusText = () => {
    switch (selfPresence) {
      case 'offline':
        return 'Offline'
      case 'neighborhood':
        return 'Neighborhood'
      case 'in_house':
        return 'In house'
      case 'in_call':
        return 'In voice'
      default:
        return 'Offline'
    }
  }

  const getStatusColor = () => {
    switch (selfPresence) {
      case 'offline':
        return 'text-muted-foreground'
      case 'neighborhood':
        return 'text-orange-500'
      case 'in_house':
        return 'text-green-500'
      case 'in_call':
        return 'text-blue-500'
      default:
        return 'text-muted-foreground'
    }
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const newWidthEm = e.clientX / rootFontSize
      setWidth(newWidthEm)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setWidth])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resetWidth()
  }

  if (!identity) {
    return null
  }

  return (
    <div className="bg-card border-t-2 border-r-2 border-border p-2 h-[52px] relative" style={{ width: `${width}em` }}>
      <div className="flex items-center gap-2 h-full">
        {/* Avatar */}
        <div className="relative">
          {profile.avatar_data_url ? (
            <img
              src={profile.avatar_data_url}
              alt={displayName}
              className="h-10 w-10 border-2 border-border rounded-none object-cover"
            />
          ) : (
            <div
              className="h-10 w-10 border-2 border-border rounded-none grid place-items-center text-[10px] font-mono tracking-wider"
              style={style}
            >
              {initials(displayName)}
            </div>
          )}
          {/* Presence dot: gray = offline, orange = neighborhood, green = in house, blue = in call */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-background rounded-none bg-background">
            <div
              className={`w-full h-full rounded-none ${
                selfPresence === 'offline'
                  ? 'bg-gray-500'
                  : selfPresence === 'neighborhood'
                    ? 'bg-orange-500'
                    : selfPresence === 'in_house'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Name and Status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-light truncate">{displayName}</p>
          <p className={`text-xs font-light truncate ${getStatusColor()}`}>
            {getStatusText()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isInVoice && (
            <Button
              variant="ghost"
              size="icon"
              onClick={leaveVoice}
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              title="Leave voice call"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          )}
          <Link to="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      {/* Resize handle */}
      <div
        ref={resizeHandleRef}
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-10"
        title="Drag to resize, double-click to reset"
      >
        <div className="absolute inset-0 -right-1 w-2" />
      </div>
    </div>
  )
}
