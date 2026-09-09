/**
 * One pane: its tab strip (drag source, drop target, split control) and the
 * active tab's body with the dock preview overlay. Presentational; every gesture
 * leaves through `PaneCallbacks`, and the body itself comes from `renderTab`.
 *
 * A chip is a capsule carrying one control, its close, at its right end; the
 * context menu (secondary press) carries the same close plus whatever the
 * embedder appends. The chips sit in their own box, the strip's one shrinking
 * part: in a narrow pane they ellipsize and then clip there, so the add
 * control after them (drawn while the embedder's `canAddTab` allows), the
 * pane's split control, and the embedder's chrome keep their width and their
 * place at the strip's end.
 */
import { Fragment, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { LayoutState, PaneNode, TabId } from '../contract/types.ts'
import { getTab } from '../engine/tree.ts'
import type { PaneCallbacks, SplitBlock } from './render.ts'
import { TabMenu } from './TabMenu.tsx'
import css from './dockkit.module.css'

/** The split control's glyph: a frame divided by a vertical line, as the split itself is. */
function SplitGlyph(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" />
      <path d="M7 2v10" stroke="currentColor" />
    </svg>
  )
}

/** The add control's glyph. */
function PlusGlyph(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** The close control's glyph. */
function CloseGlyph(): ReactNode {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** A pane and the live layout it reads its tabs from. */
export interface TabPanelProps {
  readonly state: LayoutState
  readonly pane: PaneNode
  readonly callbacks: PaneCallbacks
}

/**
 * The chip a navigation key moves focus to, in the WAI-ARIA tabs pattern with
 * manual activation: Left and Right step through the strip and wrap, Home and
 * End jump to its ends. Selecting is a separate key.
 * @returns the chip to focus, or `undefined` when the key is not a navigation key.
 */
function chipToFocus(key: string, tabs: readonly TabId[], tabId: TabId): TabId | undefined {
  const count = tabs.length
  const index = tabs.indexOf(tabId)
  switch (key) {
    case 'ArrowLeft': return tabs[(index - 1 + count) % count]
    case 'ArrowRight': return tabs[(index + 1) % count]
    case 'Home': return tabs[0]
    case 'End': return tabs.at(-1)
    default: return undefined
  }
}

/** Whether a key selects the focused chip. */
function selects(key: string): boolean {
  return key === 'Enter' || key === ' '
}

/** The split control's title: what it does, or why it cannot right now. */
function splitTitle(labels: PaneCallbacks['labels'], block: SplitBlock | undefined): string {
  switch (block) {
    case undefined: return labels.splitPane
    case 'budget': return labels.splitPaneDisabled
    case 'width': return labels.splitPaneNarrow
  }
}

/** The pane's tab strip, split control, and body. */
export function TabPanel({ state, pane, callbacks }: TabPanelProps): ReactNode {
  // The open context menu and the chip that opened it; the menu positions
  // itself against that chip from its portal.
  const [menu, setMenu] = useState<{ readonly tabId: TabId; readonly anchor: HTMLElement } | undefined>(undefined)
  // The mounted chips by tab, for the keys that move focus between them.
  const [chips] = useState(() => new Map<TabId, HTMLElement>())
  const active = pane.activeTabId === undefined ? undefined : getTab(state, pane.activeTabId)
  const block = callbacks.splitBlock(pane.id)
  const target = callbacks.dropTarget
  const stripIndex = target !== undefined && target.kind === 'strip' && target.paneId === pane.id
    ? target.index
    : undefined
  const zone = target !== undefined && target.kind === 'zone' && target.paneId === pane.id
    ? target.zone
    : undefined

  /** Select a tab from a click or a key, unless it is the active pane's selected tab already: that changes nothing. */
  const activate = (tabId: TabId): void => {
    if (state.activePaneId === pane.id && pane.activeTabId === tabId) return
    callbacks.onFocusTab(tabId)
  }

  const focusChip = (tabId: TabId): void => {
    const chip = chips.get(tabId)
    /* v8 ignore next -- every tab in the strip has a mounted chip, registered by its ref. */
    if (chip === undefined) return
    chip.focus()
  }

  return (
    <section
      className={css.pane}
      data-dockkit-pane={pane.id}
      data-dockkit-pane-active={state.activePaneId === pane.id || undefined}
      // A click on the pane's body or strip focuses the pane, unless it is the
      // active one already: that click changes nothing and records nothing. The
      // chips and the strip's controls stop their own clicks: each reports one
      // intent, and that intent already decides which pane is active.
      onClick={() => {
        if (state.activePaneId === pane.id) return
        callbacks.onFocusPane(pane.id)
      }}
    >
      <div className={css.tabStrip} role="tablist" data-dockkit-strip={pane.id}>
        <div className={css.stripTabs} role="presentation" data-dockkit-strip-tabs={pane.id}>
          {pane.tabs.map((tabId, index) => {
            const tab = getTab(state, tabId)
            const selected = tabId === pane.activeTabId
            return (
              <Fragment key={tabId}>
                {stripIndex === index && <div className={css.caret} data-dockkit-caret={index} />}
                <div
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className={clsx(
                    css.tab,
                    selected && css.tabActive,
                    callbacks.draggingTabId === tabId && css.tabDragging,
                  )}
                  data-dockkit-tab={tabId}
                  ref={(element) => {
                    if (element === null) chips.delete(tabId)
                    else chips.set(tabId, element)
                  }}
                  // Focus lands on click, not on press: a state change between
                  // pointerdown and the first pointermove rebuilds this subtree,
                  // and Chromium cancels the pointer when the pressed element is
                  // replaced — which would abandon every drag. A drag that ends
                  // elsewhere fires no click, and its own operation carries focus.
                  onPointerDown={(event) => {
                    // A secondary press is the menu, never a drag.
                    if (event.button === 2) return
                    callbacks.onTabPressed(tabId, event)
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    activate(tabId)
                  }}
                  onKeyDown={(event) => {
                    // Keys on the chip's nested close control are that control's.
                    if (event.target !== event.currentTarget) return
                    const next = chipToFocus(event.key, pane.tabs, tabId)
                    if (next !== undefined) {
                      event.preventDefault()
                      focusChip(next)
                      return
                    }
                    if (selects(event.key)) {
                      event.preventDefault()
                      activate(tabId)
                    }
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    const anchor = event.currentTarget
                    setMenu(current => current?.tabId === tabId ? undefined : { tabId, anchor })
                  }}
                >
                  <span className={css.tabTitle} data-dockkit-tab-title>{callbacks.renderTabTitle?.(tab) ?? tab.title}</span>
                  <button
                    type="button"
                    className={css.tabClose}
                    aria-label={callbacks.labels.closeTab}
                    data-dockkit-tab-close={tabId}
                    // A nested control stops its own press: otherwise the press
                    // starts a drag, captures the pointer, and this click never lands.
                    onPointerDown={(event) => { event.stopPropagation() }}
                    onClick={(event) => {
                      event.stopPropagation()
                      callbacks.onCloseTab(tabId)
                    }}
                  >
                    <CloseGlyph />
                  </button>
                  {menu?.tabId === tabId && (
                    <TabMenu
                      labels={callbacks.labels}
                      anchor={menu.anchor}
                      onClose={() => { setMenu(undefined); callbacks.onCloseTab(tabId) }}
                      onDismiss={() => { setMenu(undefined) }}
                      extras={callbacks.renderTabMenuItems?.(tab, () => { setMenu(undefined) })}
                    />
                  )}
                </div>
              </Fragment>
            )
          })}
          {stripIndex === pane.tabs.length && <div className={css.caret} data-dockkit-caret={stripIndex} />}
        </div>
        {callbacks.canAddTab(pane.id) && (
          <button
            type="button"
            className={css.addTab}
            aria-label={callbacks.labels.addTab}
            title={callbacks.labels.addTab}
            data-dockkit-add-tab={pane.id}
            onClick={(event) => {
              event.stopPropagation()
              callbacks.onAddTab(pane.id)
            }}
          >
            <PlusGlyph />
          </button>
        )}
        <div className={css.stripFill} data-dockkit-strip-fill />
        {!(callbacks.hideSplitAtCapacity && block === 'budget') && (
          <button
            type="button"
            className={css.iconButton}
            aria-label={callbacks.labels.splitPane}
            title={splitTitle(callbacks.labels, block)}
            disabled={block !== undefined}
            data-dockkit-split-button={pane.id}
            data-dockkit-split-blocked={block}
            onClick={(event) => {
              event.stopPropagation()
              callbacks.onSplitPane(pane.id)
            }}
          >
            <SplitGlyph />
          </button>
        )}
        {/* The embedder's surface-wide controls, in the top-right pane only: the
            strip is the surface's top edge, and this pane's end is its corner. */}
        {pane.id === callbacks.chromePaneId && callbacks.chrome !== undefined && (
          // The embedder's controls report their own intents; the pane's
          // click-to-focus must not add a focus entry to each of them.
          <div
            className={css.stripChrome}
            data-dockkit-strip-chrome
            onClick={(event) => { event.stopPropagation() }}
          >
            {callbacks.chrome}
          </div>
        )}
      </div>
      <div className={css.paneBody}>
        {active === undefined
          ? <p className={css.empty}>{callbacks.labels.emptyPane}</p>
          : callbacks.renderTab(active)}
        {zone !== undefined && (callbacks.horizontalDrops && zone !== 'center'
          ? <>
            <div className={css.dockHint} data-dockkit-dock-zone="left" data-dockkit-drop-active={zone === 'left' || undefined} />
            <div className={css.dockHint} data-dockkit-dock-zone="right" data-dockkit-drop-active={zone === 'right' || undefined} />
          </>
          : <div className={css.dockHint} data-dockkit-dock-zone={zone} />)}
      </div>
    </section>
  )
}
