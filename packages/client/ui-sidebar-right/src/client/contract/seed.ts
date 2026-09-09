/**
 * The guide tab's identity, the page-address scheme, and the seed factory.
 *
 * These live in the contract because two sides need them and neither may read
 * the other: the store seeds every new pane with a guide tab, and the guide
 * domain registers the type under the same kind.
 *
 * The docking kit treats `kind` as opaque, so these strings mean something only
 * here and in the registry. Both types go through the same two stages any other
 * type would use — the guide is not special in the machinery, only in being
 * always available.
 */
import type { TabId, TabRecord } from '@deepseek-ai/dsh-client-ui-dockkit'

/** The guide tab's kind. */
export const GUIDE_KIND = 'guide'

/**
 * The address a page tab is recorded under: `sidebar://<kind>`. The scheme is
 * this package's bookkeeping for `openTab`, spelled here and nowhere else; a
 * caller names the kind and never sees or composes the address.
 * @param kind - the page type's kind.
 * @returns the page's address.
 */
export function pageAddress(kind: string): string {
  return `sidebar://${kind}`
}

/**
 * Build the guide tab a new pane is seeded with.
 *
 * The title is captured at mint time because it goes into the surface's
 * operation sequence, which records what happened and must not change meaning
 * later. A language change relabels the type, not tabs already open.
 * @param id - tab id minted by the caller.
 * @param title - the guide type's display name at mint time.
 * @returns the guide tab record.
 */
export function makeGuideTab(id: TabId, title: string): TabRecord {
  return { id, kind: GUIDE_KIND, contentId: pageAddress(GUIDE_KIND), title }
}
