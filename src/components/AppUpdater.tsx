import { useEffect, useState } from 'react'
import { checkUpdate, installUpdate, onUpdaterEvent, type UpdateManifest, type UpdateStatusResult } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { Button } from './ui/button'

export function AppUpdater() {
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as { __TAURI__?: unknown }).__TAURI__) return

    let unlisten: (() => void) | undefined

    const run = async () => {
      try {
        const unlistenFn = await onUpdaterEvent((res: UpdateStatusResult) => {
          if (res.status === 'PENDING') setStatus('Downloading...')
          else if (res.status === 'DONE') setStatus('Installing...')
          else if (res.status === 'ERROR' && res.error) setInstallError(res.error)
          else if (res.status === 'UPTODATE') setStatus(null)
        })
        unlisten = unlistenFn

        const result = await checkUpdate()
        if (result.shouldUpdate && result.manifest) {
          setUpdateManifest(result.manifest)
          setInstallError(null)
        }
      } catch (e) {
        // Not in Tauri or updater disabled / network error - ignore
        console.debug('[AppUpdater] checkUpdate failed:', e)
      }
    }

    run()
    return () => {
      unlisten?.()
    }
  }, [])

  const handleUpdate = async () => {
    if (!updateManifest || installing) return
    setInstalling(true)
    setInstallError(null)
    try {
      await installUpdate()
      await relaunch()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setInstallError(msg)
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setUpdateManifest(null)
    setStatus(null)
    setInstallError(null)
  }

  if (!window.__TAURI__ || !updateManifest || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md border-2 border-border bg-card p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">Update available</span>
          <span className="text-xs text-muted-foreground">v{updateManifest.version}</span>
        </div>
        {updateManifest.body?.trim() && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{updateManifest.body}</p>
        )}
        {installError && (
          <p className="text-xs text-destructive">{installError}</p>
        )}
        {status && (
          <p className="text-xs text-muted-foreground">{status}</p>
        )}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            disabled={installing}
          >
            Later
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleUpdate}
            disabled={installing}
          >
            {installing ? 'Updating…' : 'Update'}
          </Button>
        </div>
      </div>
    </div>
  )
}
