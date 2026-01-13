import { Link, useNavigate } from 'react-router-dom'
import { Plus, Settings, Users, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useEffect, useState } from 'react'
import { useSignaling } from '../contexts/SignalingContext'
import { listHouses, createHouse, joinHouse, deleteHouse, importHouseHint, type House, parseInviteUri, getHouseHint, registerHouseHint } from '../lib/tauri'
import { useIdentity } from '../contexts/IdentityContext'

function HouseListPage() {
  const navigate = useNavigate()
  const { identity } = useIdentity()
  const { signalingUrl, status: signalingStatus } = useSignaling()
  const [houses, setHouses] = useState<House[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [houseName, setHouseName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    loadHouses()
  }, [])

  const loadHouses = async () => {
    try {
      const loadedHouses = await listHouses()
      setHouses(loadedHouses)
    } catch (error) {
      console.error('Failed to load houses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateHouse = async () => {
    if (!identity || !houseName.trim()) return

    setIsCreating(true)
    try {
      const newHouse = await createHouse(
        houseName.trim(),
        identity.user_id,
        identity.display_name
      )

      // Publish a house hint to the signaling server for cross-user invites (Option A)
      // This is intentionally shaped so `encrypted_state` can later become a real encrypted blob (Option B).
      if (signalingStatus === 'connected' && signalingUrl) {
        registerHouseHint(signalingUrl, {
          signing_pubkey: newHouse.signing_pubkey,
          encrypted_state: JSON.stringify(newHouse),
          signature: '', // TODO (Option B): sign this with user identity key
          last_updated: new Date().toISOString(),
        }).catch(e => console.warn('Failed to publish house hint:', e))
      }

      setHouses([...houses, newHouse])
      setShowCreateDialog(false)
      setHouseName('')
      navigate(`/houses/${newHouse.id}`)
    } catch (error) {
      console.error('Failed to create house:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinHouse = async () => {
    if (!identity || !inviteCode.trim()) return

    const input = inviteCode.trim()
    setJoinError('')
    setIsCreating(true)

    try {
      // Network-backed join: input must be an invite URI (rmmt://{signing_pubkey}@{server})
      const parsed = parseInviteUri(input)
      if (!parsed) {
        setJoinError('Invalid invite. Paste the full invite link (rmmt://...).')
        return
      }

      const signalingServer =
        parsed.server.startsWith('ws://') || parsed.server.startsWith('wss://')
          ? parsed.server
          : `wss://${parsed.server}`

      // Fetch house hint from signaling server
      const hint = await getHouseHint(signalingServer, parsed.signingPubkey)
      if (!hint) {
        setJoinError('Invite not found on signaling server.')
        return
      }

      // For now (Option A), encrypted_state is plaintext JSON of a House object.
      // Later (Option B), this becomes an encrypted blob; join flow stays the same.
      const hintedHouse: House = JSON.parse(hint.encrypted_state)

      // Persist the house locally for this account
      await importHouseHint(hintedHouse)

      // Add current user as member (local membership list)
      const updatedHouse = await joinHouse(
        hintedHouse.id,
        identity.user_id,
        identity.display_name
      )

      // Update local list state
      setHouses(prev => {
        const exists = prev.some(h => h.id === updatedHouse.id)
        return exists ? prev.map(h => (h.id === updatedHouse.id ? updatedHouse : h)) : [...prev, updatedHouse]
      })

      setShowJoinDialog(false)
      setInviteCode('')
      navigate(`/houses/${updatedHouse.id}`)
    } catch (error) {
      console.error('Failed to join house:', error)
      setJoinError('Failed to join house. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteHouse = async (e: React.MouseEvent, houseId: string, houseName: string) => {
    e.stopPropagation() // Prevent navigating to house when clicking delete

    if (!confirm(`Are you sure you want to leave and delete "${houseName}"? This cannot be undone.`)) {
      return
    }

    try {
      await deleteHouse(houseId)
      setHouses(houses.filter(h => h.id !== houseId))
    } catch (error) {
      console.error('Failed to delete house:', error)
      alert('Failed to delete house. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="h-full bg-background grid-pattern flex items-center justify-center">
        <p className="text-muted-foreground text-sm font-light">Loading houses...</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-background grid-pattern flex flex-col">
      <header className="border-b-2 border-border">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="w-px h-6 bg-foreground/20"></div>
            <h1 className="text-sm font-light tracking-wider uppercase">Houses</h1>
          </div>
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        {houses.length === 0 ? (
          <div className="max-w-md w-full space-y-8">
            <div className="space-y-4">
              <div className="w-12 h-px bg-foreground/20"></div>
              <h2 className="text-2xl font-light tracking-tight">No houses</h2>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Create or join a house to start voice chatting with your roommates.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex-1 bg-foreground text-background hover:bg-foreground/90 h-11 font-light tracking-wide"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create House
              </Button>
              <Button
                onClick={() => setShowJoinDialog(true)}
                variant="outline"
                className="flex-1 h-11 font-light tracking-wide"
              >
                Join House
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl w-full space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-px bg-foreground/20"></div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowJoinDialog(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 font-light"
                >
                  Join House
                </Button>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="sm"
                  className="bg-foreground text-background hover:bg-foreground/90 h-9 font-light"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New House
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              {houses.map((house) => (
                <div
                  key={house.id}
                  className="relative group"
                >
                  <button
                    onClick={() => navigate(`/houses/${house.id}`)}
                    className="w-full p-6 border-2 border-border bg-card hover:bg-accent/50 transition-colors text-left rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-lg font-light tracking-tight">{house.name}</h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {house.members.length} {house.members.length === 1 ? 'member' : 'members'}
                          </span>
                          <span>{house.rooms.length} {house.rooms.length === 1 ? 'room' : 'rooms'}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHouse(e, house.id, house.name)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-md hover:bg-destructive/20 text-destructive transition-opacity"
                        title="Leave and delete house"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border-2 border-border rounded-lg p-6 max-w-md w-full space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-light tracking-tight">Create House</h2>
              <div className="w-8 h-px bg-foreground/20"></div>
            </div>
            <div className="space-y-2">
              <label htmlFor="house-name" className="text-sm text-muted-foreground font-light">
                House Name
              </label>
              <input
                id="house-name"
                type="text"
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) {
                    handleCreateHouse()
                  } else if (e.key === 'Escape') {
                    setShowCreateDialog(false)
                  }
                }}
                placeholder="My House"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm font-light focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowCreateDialog(false)
                  setHouseName('')
                }}
                variant="outline"
                className="flex-1 h-10 font-light"
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateHouse}
                className="flex-1 h-10 bg-foreground text-background hover:bg-foreground/90 font-light"
                disabled={isCreating || !houseName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showJoinDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border-2 border-border rounded-lg p-6 max-w-md w-full space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-light tracking-tight">Join House</h2>
              <div className="w-8 h-px bg-foreground/20"></div>
            </div>
            <div className="space-y-2">
              <label htmlFor="invite-code" className="text-sm text-muted-foreground font-light">
                Invite Code
              </label>
              <input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  // Do NOT uppercase: invite URIs are case-sensitive in practice (and should be accepted as-is).
                  setInviteCode(e.target.value)
                  setJoinError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) {
                    handleJoinHouse()
                  } else if (e.key === 'Escape') {
                    setShowJoinDialog(false)
                    setInviteCode('')
                    setJoinError('')
                  }
                }}
                placeholder="rmmt://...@your-server"
                className="w-full px-4 py-2 bg-background border border-border rounded-md text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              {joinError && (
                <p className="text-xs text-red-500">{joinError}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowJoinDialog(false)
                  setInviteCode('')
                  setJoinError('')
                }}
                variant="outline"
                className="flex-1 h-10 font-light"
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinHouse}
                className="flex-1 h-10 bg-foreground text-background hover:bg-foreground/90 font-light"
                disabled={isCreating || !inviteCode.trim()}
              >
                {isCreating ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HouseListPage

