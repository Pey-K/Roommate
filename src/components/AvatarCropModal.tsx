import Cropper from 'react-easy-crop'
import { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { cropToSquareWebpDataUrl, type PixelCrop } from '../lib/imageCrop'

export function AvatarCropModal({
  imageSrc,
  onCancel,
  onSave,
}: {
  imageSrc: string
  onCancel: () => void
  onSave: (dataUrl: string) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const CROP_BOX = 160

  const canSave = Boolean(croppedAreaPixels) && !isSaving

  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom])

  // Prevent the underlying Settings page from scrolling while cropping.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setIsSaving(true)
    setError('')
    try {
      const dataUrl = await cropToSquareWebpDataUrl({
        imageSrc,
        crop: croppedAreaPixels,
        size: 256,
        quality: 0.9,
      })
      onSave(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to crop image')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 overscroll-contain">
      <div className="w-full max-w-sm border-2 border-border bg-background rounded-lg p-3 space-y-2">
        <div className="space-y-0.5">
          <h2 className="text-sm font-light tracking-tight">Crop profile picture</h2>
          <p className="text-[11px] text-muted-foreground font-light">Drag to position, then zoom.</p>
        </div>

        <div className="relative w-full h-[190px] border-2 border-border rounded-md bg-black/30">
          {/* Put overflow clipping on an inner wrapper so the crop outline isn't clipped by the border */}
          <div
            className="relative w-full h-full overflow-hidden px-2 pb-2 pt-2"
          >
            <div className="relative w-full h-full">
              <div className="rmmt-cropper">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropSize={{ width: CROP_BOX, height: CROP_BOX }}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels as PixelCrop)}
              />
            </div>
          </div>
        </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground font-light">Zoom</p>
            <p className="text-[11px] text-muted-foreground font-light tabular-nums">{zoomLabel}</p>
          </div>
          <Slider min={1} max={3} step={0.01} value={zoom} onValueChange={setZoom} />
        </div>

        {error && <p className="text-xs text-red-500 font-light">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 h-8 text-xs font-light"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-8 text-xs font-light"
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

