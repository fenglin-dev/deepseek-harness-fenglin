/**
 * The floating layer: one overlay panel per floating pane, bottom-to-top in the
 * model's z order. A floating pane hosts exactly one tab and renders no tab
 * strip — the panel *is* the tab. Pressing a panel's body raises it. Its grip
 * and corner report through their gesture instead: a press released in place is
 * a click and raises the panel; a drag records the move or resize, and that
 * operation raises the panel itself, so one gesture is one intent. Raising a
 * panel that is active and on top already changes nothing and reports nothing.
 *
 * The layer owns its own drag and resize gestures, so where it mounts is not
 * part of its contract: panels are positioned in viewport coordinates and read
 * only `state` and the outward contracts. An embedder may portal it anywhere,
 * and nothing here assumes the docked tree is an ancestor or even present.
 */
import { useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { DockIntents, DockLabels, TabRenderer } from '../contract/adapter.ts'
import type { FloatRect, LayoutState, PaneId } from '../contract/types.ts'
import { FLOAT_MIN_SIZE } from '../engine/constraints.ts'
import { movedRect, resizedRect } from '../engine/geometry.ts'
import { floatRect, getPane, getTab, onlyTabId } from '../engine/tree.ts'
import { useGesture } from './pointer.ts'
import css from './dockkit.module.css'

/** The layout whose `floats` this layer draws. */
export interface FloatLayerProps {
  readonly state: LayoutState
  readonly intents: DockIntents
  readonly labels: DockLabels
  readonly renderTab: TabRenderer
  /** The panel header's title content; omit to show the record's `title` text (see `DockSurfaceProps`). */
  readonly renderTabTitle?: TabRenderer
}

/** A floating-panel gesture: what it moves and where it started. */
interface FloatDrag {
  readonly mode: 'move' | 'resize'
  readonly originX: number
  readonly originY: number
  readonly rect: FloatRect
}

/** The rectangle a gesture has reached. */
function draggedRect(drag: FloatDrag, x: number, y: number): FloatRect {
  const dx = x - drag.originX
  const dy = y - drag.originY
  return drag.mode === 'move'
    ? movedRect(drag.rect, dx, dy)
    : resizedRect(drag.rect, dx, dy, FLOAT_MIN_SIZE)
}

/** Whether two rectangles agree in every coordinate. */
function sameRect(a: FloatRect, b: FloatRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

/** Whether a floating pane is already where a raise would put it: focused and on top. */
function raised(state: LayoutState, paneId: PaneId): boolean {
  return state.activePaneId === paneId && state.floats.at(-1) === paneId
}

/** Every floating panel, in z order. */
export function FloatLayer({ state, intents, labels, renderTab, renderTabTitle }: FloatLayerProps): ReactNode {
  const [preview, setPreview] = useState<{ paneId: PaneId; rect: FloatRect } | undefined>(undefined)
  const begin = useGesture(() => { setPreview(undefined) })

  /** Focus and raise a panel from a press or click on it, unless it is raised already. */
  const raise = (paneId: PaneId): void => {
    if (raised(state, paneId)) return
    intents.focusPane(paneId)
  }

  /** Start a move or resize from a press on the panel's grip or corner; a release that moved nothing is a click. */
  const drag = (mode: 'move' | 'resize', paneId: PaneId, event: ReactPointerEvent<HTMLElement>): void => {
    // The press stops here: the panel's own press-to-focus would record a focus
    // entry before the drag's, and the release below decides which one it is.
    event.stopPropagation()
    const start: FloatDrag = { mode, originX: event.clientX, originY: event.clientY, rect: floatRect(getPane(state, paneId)) }
    begin(event.currentTarget, event.pointerId, {
      move: (moved) => { setPreview({ paneId, rect: draggedRect(start, moved.clientX, moved.clientY) }) },
      up: (released) => {
        const rect = draggedRect(start, released.clientX, released.clientY)
        if (sameRect(rect, start.rect)) raise(paneId)
        else if (mode === 'move') intents.moveFloat(paneId, rect.x, rect.y)
        else intents.resizeFloat(paneId, rect)
      },
    })
  }

  return (
    <>
      {state.floats.map((paneId, depth) => {
        const pane = getPane(state, paneId)
        const tab = getTab(state, onlyTabId(pane))
        // A panel mid-gesture draws where the pointer has taken it and on top,
        // as the operation its release records will leave it.
        const lifted = preview?.paneId === paneId ? preview.rect : undefined
        const live = lifted ?? floatRect(pane)
        return (
          <div
            key={paneId}
            className={css.float}
            data-dockkit-float={paneId}
            data-dockkit-float-active={state.activePaneId === paneId || undefined}
            style={{
              left: live.x,
              top: live.y,
              width: live.width,
              height: live.height,
              zIndex: lifted === undefined ? depth + 1 : state.floats.length + 1,
            }}
            onPointerDown={() => { raise(paneId) }}
          >
            <header
              className={css.floatHeader}
              data-dockkit-float-grip={paneId}
              onPointerDown={(event) => { drag('move', paneId, event) }}
            >
              <span className={css.floatTitle} data-dockkit-float-title>{renderTabTitle?.(tab) ?? tab.title}</span>
              <button
                type="button"
                className={css.iconButton}
                aria-label={labels.dockFloat}
                data-dockkit-float-dock={paneId}
                onPointerDown={(event) => { event.stopPropagation() }}
                onClick={() => { intents.unfloatPane(paneId) }}
              >
                ⇤
              </button>
              <button
                type="button"
                className={css.iconButton}
                aria-label={labels.closeFloat}
                data-dockkit-float-close={paneId}
                onPointerDown={(event) => { event.stopPropagation() }}
                onClick={() => { intents.closeTab(tab.id) }}
              >
                ✕
              </button>
            </header>
            <div className={css.floatBody}>{renderTab(tab)}</div>
            <div
              className={css.floatResize}
              data-dockkit-float-resize={paneId}
              onPointerDown={(event) => { drag('resize', paneId, event) }}
            />
          </div>
        )
      })}
    </>
  )
}
