import type { IconCrop } from './icon-protocol.ts'

/**
 * Clamp square crop coordinates to the normalized source raster.
 * @param crop - Requested square in image pixels.
 * @param width - Normalized image width.
 * @param height - Normalized image height.
 * @returns An integer crop wholly inside the image.
 */
export function clampIconCrop(crop: IconCrop, width: number, height: number): IconCrop {
  const size = Math.max(1, Math.min(Math.round(crop.size), width, height))
  return { x: Math.max(0, Math.min(Math.round(crop.x), width - size)), y: Math.max(0, Math.min(Math.round(crop.y), height - size)), size }
}

/**
 * Center a fixed-ratio crop at a chosen zoom.
 * @param width - Normalized image width.
 * @param height - Normalized image height.
 * @param zoom - Editor zoom from one to four.
 * @returns A centered square in image pixels.
 */
export function centerIconCrop(width: number, height: number, zoom = 1): IconCrop {
  const size = Math.floor(Math.min(width, height) / zoom)
  return clampIconCrop({ x: (width - size) / 2, y: (height - size) / 2, size }, width, height)
}

/**
 * Change zoom around the current crop center, keeping all edges inside the image.
 * @param crop - Current square in image pixels.
 * @param width - Normalized image width.
 * @param height - Normalized image height.
 * @param zoom - Editor zoom from one to four.
 * @returns A zoomed crop clamped to the image.
 */
export function zoomIconCrop(crop: IconCrop, width: number, height: number, zoom: number): IconCrop {
  const size = Math.floor(Math.min(width, height) / zoom)
  return clampIconCrop({ x: crop.x + (crop.size - size) / 2, y: crop.y + (crop.size - size) / 2, size }, width, height)
}
