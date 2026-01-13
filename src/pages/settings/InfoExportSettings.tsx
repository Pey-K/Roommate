import { useState } from 'react'
import { Download, Loader2, LogOut } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useAccount } from '../../contexts/AccountContext'
import { exportIdentity } from '../../lib/tauri'

export function InfoExportSettings() {
  const { logout } = useAccount()
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  function handleLogout() {
    logout()
  }

  async function handleExport() {
    setIsExporting(true)
    setExportError(null)

    try {
      const data = await exportIdentity()
      
      // Create a blob and download it
      const blob = new Blob([data as BlobPart], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'roommate-identity.dat'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export identity')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-8 space-y-6">
        <div className="space-y-1">
          <div className="w-12 h-px bg-foreground/20"></div>
          <h2 className="text-lg font-light tracking-tight">Backup & Export</h2>
          <p className="text-xs text-muted-foreground font-light">Export your identity for backup</p>
        </div>
        <div className="space-y-4">
          {exportError && (
            <div className="bg-destructive/10 border-l-2 border-destructive p-4 text-sm text-destructive">
              {exportError}
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full h-11 font-light border-border/50 hover:bg-accent"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Identity
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground font-light">
            Save this file in a secure location. You can import it on another device to restore your identity.
          </p>
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-8 space-y-6">
        <div className="space-y-1">
          <div className="w-12 h-px bg-foreground/20"></div>
          <h2 className="text-lg font-light tracking-tight">About</h2>
        </div>
        <p className="text-sm text-muted-foreground font-light">
          Roommate v1.0.0
        </p>
      </div>

      <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-8 space-y-6">
        <Button
          variant="outline"
          className="w-full h-11 font-light border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
        <p className="text-xs text-muted-foreground font-light">
          Clears your session and identity from memory. You will need to select your account to log back in.
        </p>
      </div>
    </div>
  )
}




