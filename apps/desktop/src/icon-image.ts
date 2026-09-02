import { nativeImage, type NativeImage } from 'electron'
import { iconPresentation, type IconCrop, type IconTarget } from './icon-protocol.js'

/** Maximum encoded PNG/JPEG input size, checked before native decoding. */
export const ICON_MAX_BYTES = 10 * 1024 * 1024
const MAX_PIXELS = 16_000_000

/** Validated encoded dimensions and EXIF orientation, before native allocation. */
export interface IconImageHeader { width: number; height: number; orientation: number; encoded: Buffer }

function exifOrientation(segment: Buffer): number {
  if (segment.toString('ascii', 0, 6) !== 'Exif\0\0') return 1
  const tiff = segment.subarray(6)
  if (tiff.length < 8) throw new Error('icon.invalid-image')
  const little = tiff.toString('ascii', 0, 2) === 'II'
  if (!little && tiff.toString('ascii', 0, 2) !== 'MM') throw new Error('icon.invalid-image')
  const u16 = (offset: number): number => little ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset)
  const u32 = (offset: number): number => little ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset)
  if (u16(2) !== 42) throw new Error('icon.invalid-image')
  const directory = u32(4)
  const count = u16(directory)
  for (let i = 0; i < count; i++) {
    const entry = directory + 2 + i * 12
    if (entry + 12 > tiff.length) throw new Error('icon.invalid-image')
    if (u16(entry) === 0x112) {
      if (u16(entry + 2) !== 3 || u32(entry + 4) !== 1) throw new Error('icon.invalid-image')
      const orientation = u16(entry + 8)
      if (orientation < 1 || orientation > 8) throw new Error('icon.invalid-image')
      return orientation
    }
  }
  return 1
}

/**
 * Inspect PNG/JPEG magic and dimensions; strip JPEG APP1 to prevent double orientation.
 * @param bytes - Encoded source selected through the native picker.
 * @returns Bounded dimensions, orientation, and decoder input without JPEG APP1 metadata.
 */
export function inspectIconImage(bytes: Buffer): IconImageHeader {
  if (bytes.length > ICON_MAX_BYTES) throw new Error('icon.too-large')
  let width = 0
  let height = 0
  let orientation = 1
  let encoded = bytes
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(8) === 13) {
    width = bytes.readUInt32BE(16)
    height = bytes.readUInt32BE(20)
  } else if (bytes.length >= 4 && bytes.readUInt16BE(0) === 0xffd8) {
    const chunks = [bytes.subarray(0, 2)]
    let offset = 2
    while (offset < bytes.length) {
      const start = offset
      if (bytes[offset++] !== 0xff) throw new Error('icon.invalid-image')
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === 0xda || marker === 0xd9) { chunks.push(bytes.subarray(start)); break }
      if (offset + 2 > bytes.length) throw new Error('icon.invalid-image')
      const length = bytes.readUInt16BE(offset)
      if (length < 2 || offset + length > bytes.length) throw new Error('icon.invalid-image')
      if (marker === 0xe1) {
        const segment = bytes.subarray(offset + 2, offset + length)
        if (segment.toString('ascii', 0, 6) === 'Exif\0\0') orientation = exifOrientation(segment)
      }
      else chunks.push(bytes.subarray(start, offset + length))
      if (marker !== undefined && [0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8 || width !== 0 || height !== 0) throw new Error('icon.invalid-image')
        height = bytes.readUInt16BE(offset + 3)
        width = bytes.readUInt16BE(offset + 5)
        if (width * height > MAX_PIXELS) throw new Error('icon.too-many-pixels')
      }
      offset += length
    }
    encoded = Buffer.concat(chunks)
  }
  if (width < 1 || height < 1) throw new Error('icon.invalid-image')
  if (width * height > MAX_PIXELS) throw new Error('icon.too-many-pixels')
  return { width, height, orientation, encoded }
}

/**
 * Apply EXIF flips/rotations to native BGRA pixels without retaining metadata.
 * @param pixels - Native bitmap containing four bytes per pixel.
 * @param width - Validated source width.
 * @param height - Validated source height.
 * @param orientation - Validated EXIF orientation from one through eight.
 * @returns Reordered pixels and their oriented dimensions.
 */
export function orientIconBitmap(pixels: Buffer, width: number, height: number, orientation: number): {
  pixels: Buffer
  width: number
  height: number
} {
  const swapped = orientation >= 5
  const outputWidth = swapped ? height : width
  const outputHeight = swapped ? width : height
  const output = Buffer.alloc(pixels.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [dx, dy] = orientation === 2 ? [width - 1 - x, y]
        : orientation === 3 ? [width - 1 - x, height - 1 - y]
          : orientation === 4 ? [x, height - 1 - y]
            : orientation === 5 ? [y, x]
              : orientation === 6 ? [height - 1 - y, x]
                : orientation === 7 ? [height - 1 - y, width - 1 - x]
                  : orientation === 8 ? [y, width - 1 - x] : [x, y]
      pixels.copy(output, (dy * outputWidth + dx) * 4, (y * width + x) * 4, (y * width + x + 1) * 4)
    }
  }
  return { pixels: output, width: outputWidth, height: outputHeight }
}

/**
 * Decode only a bounded raster and normalize orientation before showing a preview.
 * @param bytes - Encoded PNG/JPEG source.
 * @returns An oriented image with a maximum edge length of 2048 pixels.
 */
export function decodeIconImage(bytes: Buffer): NativeImage {
  let header: IconImageHeader
  try { header = inspectIconImage(bytes) } catch (error) {
    if (error instanceof RangeError) throw new Error('icon.invalid-image')
    throw error
  }
  let image = nativeImage.createFromBuffer(header.encoded)
  const size = image.getSize()
  if (image.isEmpty() || size.width !== header.width || size.height !== header.height) throw new Error('icon.invalid-image')
  if (header.orientation !== 1) {
    const oriented = orientIconBitmap(image.toBitmap(), size.width, size.height, header.orientation)
    image = nativeImage.createFromBitmap(oriented.pixels, { width: oriented.width, height: oriented.height })
  }
  const { width, height } = image.getSize()
  if (Math.max(width, height) > 2048) image = image.resize({
    width: Math.max(1, Math.round(width * 2048 / Math.max(width, height))),
    height: Math.max(1, Math.round(height * 2048 / Math.max(width, height))),
    quality: 'best',
  })
  return image
}

/**
 * Reject non-square, nonfinite, out-of-bounds or subpixel crop requests.
 * @param value - Untrusted IPC crop payload.
 * @param width - Main-process-owned selection width.
 * @param height - Main-process-owned selection height.
 * @returns Valid integer square coordinates.
 */
export function validateIconCrop(value: unknown, width: number, height: number): IconCrop {
  if (typeof value !== 'object' || value === null) throw new Error('icon.invalid-crop')
  const { x, y, size } = value as Partial<IconCrop>
  if (![x, y, size].every(v => typeof v === 'number' && Number.isSafeInteger(v))
    || x === undefined || y === undefined || size === undefined
    || x < 0 || y < 0 || size < 1 || x + size > width || y + size > height) throw new Error('icon.invalid-crop')
  return { x, y, size }
}

/**
 * Render a crop into a transparent 512px canvas with optical padding and antialiased corners.
 * @param crop - Unstyled normalized square crop; never pass an already rendered icon.
 * @param platform - Desktop operating system.
 * @param target - Application or tray destination.
 * @returns A derived icon preserving source transparency without modifying the crop.
 */
export function renderIconPresentation(crop: NativeImage, platform: string, target: IconTarget): NativeImage {
  const { inset, radius } = iconPresentation(platform, target)
  const side = 512 - 2 * inset
  const source = crop.resize({ width: side, height: side, quality: 'best' }).toBitmap()
  const output = Buffer.alloc(512 * 512 * 4)
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const dx = Math.max(radius - (x + 0.5), x + 0.5 - (side - radius), 0)
      const dy = Math.max(radius - (y + 0.5), y + 0.5 - (side - radius), 0)
      const coverage = Math.max(0, Math.min(1, radius + 0.5 - Math.hypot(dx, dy)))
      const from = (y * side + x) * 4
      const to = ((y + inset) * 512 + x + inset) * 4
      // Electron's native bitmap is premultiplied: mask color and alpha together.
      for (let channel = 0; channel < 4; channel++) output[to + channel] = Math.round(source.readUInt8(from + channel) * coverage)
    }
  }
  return nativeImage.createFromBitmap(output, { width: 512, height: 512 })
}

/**
 * Encode a Windows ICO directory containing PNG frames at all shell sizes.
 * @param image - Normalized square crop.
 * @returns An ICO with 16, 24, 32, 48, 64, 128, and 256 pixel frames.
 */
export function encodeIconIco(image: NativeImage): Buffer {
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const frames = sizes.map(size => image.resize({ width: size, height: size, quality: 'best' }).toPNG())
  const directory = Buffer.alloc(6 + sizes.length * 16)
  directory.writeUInt16LE(1, 2)
  directory.writeUInt16LE(sizes.length, 4)
  let offset = directory.length
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16
    directory[entry] = directory[entry + 1] = (sizes[index] ?? 256) % 256
    directory.writeUInt16LE(1, entry + 4)
    directory.writeUInt16LE(32, entry + 6)
    directory.writeUInt32LE(frame.length, entry + 8)
    directory.writeUInt32LE(offset, entry + 12)
    offset += frame.length
  })
  return Buffer.concat([directory, ...frames])
}
