/**
 * Glyphs this package draws that the shared icon set does not carry yet.
 * Same props contract as `@deepseek-ai/dsh-client-ui-primitives` icons, so a
 * shared replacement is a one-line import change.
 */
import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'

/** Three text lines, the middle one turning back under itself. */
export const IconWrapOutline16 = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.5 4h11" />
    <path d="M2.5 8h8.5a2.5 2.5 0 0 1 0 5H9.5" />
    <path d="M11 11.5 9.5 13l1.5 1.5" />
    <path d="M2.5 12h3.5" />
  </svg>
)
