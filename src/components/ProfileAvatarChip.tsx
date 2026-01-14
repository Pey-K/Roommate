import { Link } from 'react-router-dom'
import { useIdentity } from '../contexts/IdentityContext'
import { useProfile } from '../contexts/ProfileContext'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

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

export function ProfileAvatarChip() {
  const { identity } = useIdentity()
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onDown = (e: MouseEvent) => {
      const el = popoverRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setOpen(false)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

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
  const realName = profile.show_real_name ? profile.real_name : null

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={displayName}
        aria-label="Open profile card"
      >
        {profile.avatar_data_url ? (
          <img
            src={profile.avatar_data_url}
            alt={displayName}
            className="h-9 w-9 border-2 border-border rounded-none object-cover"
          />
        ) : (
          <div
            className="h-9 w-9 border-2 border-border rounded-none grid place-items-center text-[10px] font-mono tracking-wider"
            style={style}
          >
            {initials(displayName)}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[260px]">
          <div className="border-2 border-border bg-card/80 backdrop-blur-sm rounded-lg p-3 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              {profile.avatar_data_url ? (
                <img
                  src={profile.avatar_data_url}
                  alt={displayName}
                  className="h-12 w-12 border-2 border-border rounded-none object-cover"
                />
              ) : (
                <div
                  className="h-12 w-12 border-2 border-border rounded-none grid place-items-center text-[10px] font-mono tracking-wider"
                  style={style}
                >
                  {initials(displayName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-light truncate">{displayName}</p>
                {realName ? (
                  <p className="text-xs text-muted-foreground font-light truncate">{realName}</p>
                ) : (
                  <p className="text-xs text-muted-foreground font-light truncate">—</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/settings?tab=account"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                onClick={() => setOpen(false)}
              >
                Edit profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

