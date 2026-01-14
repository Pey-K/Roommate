export type PixelCrop = { x: number; y: number; width: number; height: number }

async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export async function cropToSquareWebpDataUrl(options: {
  imageSrc: string
  crop: PixelCrop
  size: number
  quality?: number
}): Promise<string> {
  const { imageSrc, crop, size, quality = 0.9 } = options
  const image = await loadImage(imageSrc)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d canvas context')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size
  )

  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return webp
  return canvas.toDataURL('image/png')
}

