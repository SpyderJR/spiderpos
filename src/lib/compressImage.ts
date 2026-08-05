// Las fotos que salen directo de la cámara de un celular pueden pesar varios
// MB y varios megapíxeles — en un teléfono de gama baja, cargar eso completo
// en memoria antes de subirlo puede tumbar la pestaña ("memoria insuficiente")
// antes de que el producto se llegue a guardar. Reducimos la imagen aquí,
// del lado del cliente, antes de retenerla o subirla.
export async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.75,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  try {
    const bitmap = await createImageBitmap(file)
    try {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
      const width = Math.round(bitmap.width * scale)
      const height = Math.round(bitmap.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(bitmap, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      )
      if (!blob) return file
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    } finally {
      bitmap.close()
    }
  } catch {
    return file
  }
}
