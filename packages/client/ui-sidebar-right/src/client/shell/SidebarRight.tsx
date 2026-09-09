/**
 * The Sidebar's seat in the frame, and the panel it draws.
 *
 * The frame owns the right column's geometry; this package owns one content
 * tree at the column width or fixed across the viewport. A shown wide panel
 * retains its track in fullscreen, preserving the conversation width. Below
 * 768px fullscreen is derived from viewport width, without changing manual mode.
 *
 * The panel stays mounted while collapsed, translated off the frame's right
 * edge, so opening and closing are one gesture in both presentations: a slide
 * from and to that edge. Normal presentation moves the frame's tracks with
 * the panel. A fullscreen opening reserves its underlying track only after
 * the panel covers the frame, without animating those hidden columns.
 *
 * The panel has no header of its own: its two controls — presentation switch
 * and collapse — ride the docking kit's chrome seat at the end of the top-right
 * pane's tab strip, so the strip is the panel's whole top edge. The way back in
 * while collapsed is not here either: it is one button in the conversation
 * header (`ExpandButton.tsx`), because it exists only while this panel is
 * hidden. Floating panels portal out because they must cross the column and the
 * conversation, and the kit already positions them in viewport coordinates.
 *
 * Tab bodies do not live here. Each one is a registration under its type's kind,
 * dispatched through the keyed `sidebar.right.pane.tab` seat (and a live chip
 * title through `sidebar.right.pane.tab.title`), so a new tab type needs no edit
 * to this file. What a body receives beyond the record — navigation, lifetime
 * signal, actions — is read through the slot-owned useTabInfo hook. The Tab
 * domain follows each session's store commits, including sessions off screen.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import type {
  HostObservable, InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore,
} from '@deepseek-ai/dsh-client-ui-slots'
// The frame declares the `rightbar` seat this component fills.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { DockIntents, DockMode, FloatRect, TabId, TabRecord, TabRenderer } from '@deepseek-ai/dsh-client-ui-dockkit'
import { canSplit, dockPaneIds, DockSurface, findPaneContentTab, FloatLayer } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { HalvesFit, LayoutState, PaneId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { GUIDE_KIND, pageAddress } from '../contract/seed.ts'
import { dockLabels } from '../labels.ts'
import type { SidebarRightOpenTabOptions } from '../service.ts'
import type { SidebarRightTabDefinition } from '../tab-registry.ts'
import type { createSidebarRightStore, SurfaceState } from '../stores.ts'
import type { TabOccurrence } from '../tab-domain.ts'
import type { SidebarRightTabNavigation } from '../contract/slots.ts'
import type { TabHookContext } from '../tab-info.ts'
import css from './SidebarRight.module.css'

/** The store share the seat receives. */
type Store = PropsStore<ReturnType<typeof createSidebarRightStore>>

/** The child seats this component renders. */
type Children = PropsRenderSlots<'sidebar.right.pane.tab' | 'sidebar.right.pane.tab.title' | 'sidebar.right.tab.menu.item'>

/** What the panel reports to the frame: drawn or not, and whether it wants a track. */
export interface SidebarRightPresentation {
  /** Whether the panel is drawn at all. */
  readonly shown: boolean
  /** Whether the drawn panel wants the conversation to make room for it. */
  readonly track: boolean
  /** Whether the panel fills the viewport, independently of its retained track. */
  readonly fullscreen: boolean
}

/** What this package needs from its host beyond the framework shares. */
export interface SidebarRightInjected {
  /**
   * Report the panel's presentation to the frame.
   *
   * The frame sizes the track and places the resize handle; this only tells it
   * the composition of the facts this package owns, and is called whenever that
   * composition changes.
   */
  readonly syncPresentation: (presentation: SidebarRightPresentation) => void
  /**
   * Publish this seat's session, actions, and the store's surfaces to `ctx.sidebarRight`.
   *
   * The service is root-scoped and cannot read a per-entry store, so the only
   * honest source is the mounted seat. Held for as long as the seat is mounted.
   * @param binding - what a command needs to act on this session, and what a tab's own action needs to act on its.
   * @returns a release callback.
   */
  readonly bindService: (binding: {
    sessionId: SessionId
    actions: Store['actions']
    /** Every session's surface as last committed; the mounted one is `surfaces[sessionId]`. */
    surfaces: Readonly<Record<string, SurfaceState>>
    /** The room rule's verdict for a docked pane, as the kit last measured it. */
    canSplitPane: (paneId: PaneId) => boolean
  }) => () => void
  /**
   * The navigation face's `openTab`, for the strip's add control: a new tab is
   * the guide opened by kind, through the same path as every other open.
   */
  readonly openTab: (kind: string, options?: SidebarRightOpenTabOptions) => void
  readonly hooks: {
    readonly tabTypes: HostObservable<readonly SidebarRightTabDefinition[]>
  }
  readonly keyedHooks: {
    readonly tabNavigation: (key: string) => HostObservable<SidebarRightTabNavigation>
  }
  /** Read a committed record's lifetime; never creates an occurrence. */
  readonly occurrence: (tab: Pick<TabRecord, 'id'>) => TabOccurrence
}

/** The column seat's props: session scope, so the session arrives as a standard prop. */
export type RightbarSeatProps =
  & PropsRuntime<'rightbar'>
  & Children
  & Store
  & PropsLocale<'sidebarRight'>
  & InjectFace<SidebarRightInjected>

/** Everything the panel needs, already bound to one session. */
interface PanelProps {
  readonly sessionId: SessionId
  readonly surface: SurfaceState
  readonly actions: Store['actions']
  readonly t: RightbarSeatProps['t']
  readonly renderSlot: Children['renderSlot']
  readonly openTab: SidebarRightInjected['openTab']
  readonly useTabTypes: RightbarSeatProps['useTabTypes']
  readonly useTabNavigation: RightbarSeatProps['useTabNavigation']
  readonly useStore: Store['useStore']
  readonly occurrence: SidebarRightInjected['occurrence']
  readonly fullscreen: boolean
  readonly autoFullscreen: boolean
  /** Receives the kit's room-rule readings for the service's `split`. */
  readonly reportRoom: (fits: ReadonlyMap<PaneId, HalvesFit>) => void
}

/** The guide tab one pane holds, if any: a pane holds at most one. */
function guideIn(layout: LayoutState, paneId: PaneId): TabId | undefined {
  return findPaneContentTab(layout, paneId, pageAddress(GUIDE_KIND), GUIDE_KIND)
}

/**
 * Build the kit's intent face for one session out of the store's actions.
 * @param sessionId - the session the seat draws; every action is bound to it.
 * @param actions - the seat's bound store actions.
 * @param openTab - the navigation face's `openTab`, which the strip's add control asks for a guide through.
 * @returns the intents the kit reports gestures to.
 */
export function intentsFor(sessionId: SessionId, actions: Store['actions'], openTab: PanelProps['openTab']): DockIntents {
  return {
    focusTab: (tabId) => { actions.focusTab(sessionId, tabId) },
    focusPane: (paneId) => { actions.focusPane(sessionId, paneId) },
    splitPane: (paneId) => { actions.splitPane(sessionId, paneId) },
    // The guide is unique per pane: the control is drawn only while its pane
    // holds none (`canAddTab` below) and asks for one there without regard to
    // guides in other panes; the store settles the open on a guide the pane
    // already holds, so the ask is idempotent all the same.
    addTab: (paneId) => { openTab(GUIDE_KIND, { paneId, revealIfOpened: false }) },
    closeTab: (tabId) => { actions.closeTab(sessionId, tabId) },
    duplicateTab: (tabId) => { actions.duplicateTab(sessionId, tabId) },
    floatTab: (tabId, rect?: FloatRect) => { actions.floatTab(sessionId, tabId, rect) },
    unfloatPane: (paneId) => { actions.unfloatPane(sessionId, paneId) },
    placeTab: (tabId, toPaneId, index) => { actions.placeTab(sessionId, tabId, toPaneId, index) },
    dropTab: (tabId, paneId, zone) => { actions.dropTab(sessionId, tabId, paneId, zone) },
    moveFloat: (paneId, x, y) => { actions.moveFloat(sessionId, paneId, x, y) },
    resizeFloat: (paneId, rect) => { actions.resizeFloat(sessionId, paneId, rect) },
    resizeSplit: (splitId, sizes) => { actions.resizeSplit(sessionId, splitId, sizes) },
  }
}

/** One tab's slot dispatch: which seat, and what to render when no type registered. */
interface TabSlotProps extends Pick<PanelProps, 'renderSlot' | 'occurrence' | 'useTabTypes' | 'useTabNavigation' | 'useStore' | 'fullscreen'> {
  readonly tab: TabRecord
  readonly seat: 'sidebar.right.pane.tab' | 'sidebar.right.pane.tab.title'
  readonly fallback: ReactNode
}

/**
 * Dispatch one tab's body or title with stable framework hooks and record lifetime.
 */
function TabSlot({
  renderSlot, occurrence, useTabTypes, useTabNavigation, useStore, fullscreen, tab, seat, fallback,
}: TabSlotProps): ReactNode {
  const { signal, tabActions } = occurrence(tab)
  const definition = useTabTypes(types => types.find(definition => definition.kind === tab.kind))
  const hookContext = useMemo((): TabHookContext => ({
    tabId: tab.id,
    title: seat === 'sidebar.right.pane.tab.title',
    fullscreen,
    signal,
    actions: tabActions,
    useStore,
    useTabNavigation,
  }), [tab.id, seat, fullscreen, signal, tabActions, useStore, useTabNavigation])
  return renderSlot(seat, {}, { entryKey: definition?.id ?? tab.kind, fallback, hookContext })
}

/**
 * Dispatch a tab's body to its registered type.
 *
 * A kind with no registrant is a real state, not a defect: a session log can
 * carry a tab whose type shipped in a plugin that is no longer mounted. Saying so
 * is better than an empty pane.
 */
function bodiesFor(panel: PanelProps): TabRenderer {
  const { t, ...rest } = panel
  // Keyed by record: the kit draws one body per pane in one place, and the
  // keyed slot below keys on the type, so two tabs of one kind would otherwise
  // share a component instance and its local state (a scroll position, a ref).
  return tab => (
    <TabSlot
      key={tab.id}
      {...rest}
      tab={tab}
      seat="sidebar.right.pane.tab"
      fallback={<p className={css.unavailable} data-sidebar-right-unavailable>{t('tab.unavailable')}</p>}
    />
  )
}

/** Dispatch a tab's title to its registered type; without one the chip shows the title captured at open time. */
function titlesFor(panel: PanelProps): TabRenderer {
  return tab => <TabSlot key={tab.id} {...panel} tab={tab} seat="sidebar.right.pane.tab.title" fallback={tab.title} />
}

/** Expand-to-viewport glyph. */
function FullscreenGlyph(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 1.5H1.5V5M9 1.5h3.5V5M1.5 9v3.5H5M12.5 9v3.5H9" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

/** Restore-from-fullscreen glyph. */
function ExitFullscreenGlyph(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 5H5V1.5M9 1.5V5h3.5M1.5 9H5v3.5M9 12.5V9h3.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

/** The collapse glyph. */
function CloseGlyph(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/** The panel's two controls, placed by the kit at the top-right pane's strip end. */
function PanelChrome({ sessionId, fullscreen, autoFullscreen, actions, t }: Pick<PanelProps, 'sessionId' | 'actions' | 't' | 'fullscreen' | 'autoFullscreen'>): ReactNode {
  const next: DockMode = fullscreen ? 'push' : 'fullscreen'
  return (
    <>
      <button
        type="button"
        className={css.iconButton}
        aria-label={fullscreen ? t('chrome.exitFullscreen') : t('chrome.toFullscreen')}
        title={fullscreen ? t('chrome.exitFullscreen') : t('chrome.toFullscreen')}
        data-sidebar-right-mode={next}
        onClick={() => {
          if (fullscreen && autoFullscreen) actions.setExpanded(sessionId, false)
          actions.setMode(sessionId, next)
        }}
      >
        {fullscreen ? <ExitFullscreenGlyph /> : <FullscreenGlyph />}
      </button>
      <button
        type="button"
        className={css.iconButton}
        aria-label={t('chrome.collapse')}
        title={t('chrome.collapse')}
        data-sidebar-right-toggle
        onClick={() => { actions.toggleExpanded(sessionId) }}
      >
        <CloseGlyph />
      </button>
    </>
  )
}

/**
 * The panel: the docked surface with the two controls in its top-right strip,
 * anchored to the frame's right edge and slid off it while collapsed.
 */
function SidebarPanel(panel: PanelProps & { width: number; panelRef: RefObject<HTMLDivElement> }): ReactNode {
  const { sessionId, surface, actions, t, renderSlot, openTab, width, reportRoom, fullscreen, autoFullscreen, panelRef } = panel
  const { expanded } = surface.layout
  return (
    <div
      ref={panelRef}
      className={css.panel}
      style={{ width: fullscreen ? '100%' : width }}
      data-sidebar-right-panel={fullscreen ? 'fullscreen' : 'push'}
      data-sidebar-right-open={expanded || undefined}
      // Off-edge is out of reach: the stylesheet's visibility flip takes the
      // hidden panel out of the tab order, and this takes it out of the
      // accessibility tree.
      aria-hidden={!expanded || undefined}
    >
      <div className={css.panelBody}>
        <DockSurface
          state={surface.layout}
          canSplit={canSplit(surface.layout) && dockPaneIds(surface.layout).length < 2}
          hideSplitAtCapacity
          dropZones="horizontal"
          minPaneFraction={0.2}
          canAddTab={paneId => guideIn(surface.layout, paneId) === undefined}
          intents={intentsFor(sessionId, actions, openTab)}
          labels={dockLabels(t)}
          renderTab={bodiesFor(panel)}
          renderTabTitle={titlesFor(panel)}
          renderTabMenuItems={(tab, dismiss) =>
            renderSlot('sidebar.right.tab.menu.item', { tab, dismiss })}
          chrome={<PanelChrome sessionId={sessionId} fullscreen={fullscreen} autoFullscreen={autoFullscreen} actions={actions} t={t} />}
          onRoom={reportRoom}
        />
      </div>
    </div>
  )
}

/** Portal the floating layer out of whichever seat rendered it. */
function Floats(panel: PanelProps): ReactNode {
  const { sessionId, surface, actions, t, openTab } = panel
  if (surface.layout.floats.length === 0) return null
  return createPortal(
    <div className={css.floatHost} data-sidebar-right-float-host>
      <FloatLayer
        state={surface.layout}
        intents={intentsFor(sessionId, actions, openTab)}
        labels={dockLabels(t)}
        renderTab={bodiesFor(panel)}
        renderTabTitle={titlesFor(panel)}
      />
    </div>,
    document.body,
  )
}

/**
 * The right column's occupant: the panel, anchored to the column's edge and
 * shown or hidden by sliding, plus the floating layer. It is also where the
 * frame learns the panel's presentation, and where `ctx.sidebarRight` learns
 * which session it is acting on, because this is the seat that knows both.
 */
export function RightbarSeat({
  sessionId, width, viewportWidth, canShow, useStore, actions, t, renderSlot, syncPresentation, bindService, openTab,
  useTabTypes, useTabNavigation, occurrence,
}: RightbarSeatProps): ReactNode {
  // One store instance per session, so this map holds this session's surface.
  // The binding published below serves the public face's commands on the
  // mounted session; a tab's own actions route through the controller's
  // adopted stores instead.
  const surfaces = useStore(state => state.bySession)
  const surface = surfaces[sessionId]
  const shown = surface !== undefined && surface.layout.expanded
  const autoFullscreen = viewportWidth < 768
  const fullscreen = autoFullscreen || surface?.layout.mode === 'fullscreen'
  const panelRef = useRef<HTMLDivElement | null>(null)
  // The kit's room-rule readings, kept in a ref: the service reads them at
  // call time through the binding, and a reading never re-renders anything.
  const room = useRef<ReadonlyMap<PaneId, HalvesFit>>(new Map())
  const reportRoom = useCallback((fits: ReadonlyMap<PaneId, HalvesFit>): void => { room.current = fits }, [])
  const track = shown && !autoFullscreen

  useEffect(() => {
    if (surface === undefined) actions.open(sessionId)
  }, [actions, sessionId, surface])

  useLayoutEffect(() => {
    if (shown && !fullscreen && !canShow) actions.setExpanded(sessionId, false)
  }, [actions, sessionId, shown, fullscreen, canShow])

  // Fullscreen leaves the previous column report in force until its own slide
  // completes. Normal presentation and zero-duration transitions report before paint.
  useLayoutEffect(() => {
    let disposed = false
    const reportWhenCovered = (): void => {
      if (disposed) return
      // A shown panel renders unconditionally and attaches its ref before this effect.
      const entering = shown && fullscreen
        ? (panelRef.current as HTMLDivElement).getAnimations().filter(animation =>
          'transitionProperty' in animation && animation.transitionProperty === 'transform'
          && animation.playState !== 'finished' && animation.playState !== 'idle')
        : []
      if (entering.length === 0) {
        syncPresentation({ shown, track, fullscreen })
        return
      }
      // Cancellation can replace the transition or remove it for reduced motion.
      void Promise.allSettled(entering.map(animation => animation.finished)).then(reportWhenCovered)
    }
    reportWhenCovered()
    return () => { disposed = true }
  }, [sessionId, shown, track, fullscreen, syncPresentation])
  // Leaving is part of that report: a seat that unmounts with its session must
  // hand the track back rather than leave one sized for a surface nobody draws.
  useLayoutEffect(() => () => { syncPresentation({ shown: false, track: false, fullscreen: false }) }, [syncPresentation])

  // Republished on every committed change: the service's readers answer from the
  // last commit, and its commands act on the session actually on screen.
  useEffect(
    () => bindService({ sessionId, actions, surfaces, canSplitPane: paneId => room.current.get(paneId)?.row !== false }),
    [bindService, sessionId, actions, surfaces],
  )
  // The Tab domain is not synced here: the controller adopted this session's
  // store as the runtime minted it and reconciles on the store's own commits,
  // on screen or not.

  if (surface === undefined) return null
  const panel: PanelProps = {
    sessionId, actions, t, renderSlot, surface, openTab, useTabTypes, useTabNavigation, useStore, occurrence,
    fullscreen, autoFullscreen, reportRoom,
  }
  return (
    <>
      <SidebarPanel {...panel} width={width} panelRef={panelRef} />
      <Floats {...panel} />
    </>
  )
}
