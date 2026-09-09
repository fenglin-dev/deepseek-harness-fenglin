/**
 * The text preview's body: a file's pages, or the reason the next one is not showing.
 *
 * Two sources meet here. The standard `useResource` hook gives the file's
 * metadata — its version and whether the agent wrote it since — and this type's
 * own store holds the pages it read through its face. A Host-reported change is
 * announced, not applied: reloading under a reader would lose their place, so
 * the bar waits for a click. A failed metadata frame — the file gone, its
 * workspace unknown — takes the same bar's place over the pages already loaded,
 * with the same reload. The type's controls, wrap and reload, sit at the end of
 * the path row; the Sidebar's strip carries none of them.
 */
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TextInjected } from './face.ts'
import { failureLine } from './failure-line.ts'
import { IconWrapOutline16 } from './icons.tsx'
import { hostFileOf } from './rpc.ts'
import type { TextPage, TextStore } from './store.ts'
import css from './TextPreview.module.css'

/** The body's composed props: the tab, its navigation, the shared store and face, and copy. */
export type TextPreviewProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsStore<TextStore>
  & InjectFace<TextInjected>
  & PropsLocale<'sidebarTextpreview'>

/**
 * A page's lines. The Host joins a page's lines with `\n` without a terminator
 * and counts them, so a page past the file's last line (`lines: 0`) has none
 * and a page holding one empty line (`lines: 1`, `text: ''`) has one; a
 * trailing `\n` ends an empty last line.
 * @param page - the page's text and line count.
 * @returns the lines in order.
 */
export function linesOf(page: TextPage): string[] {
  return page.lines === 0 ? [] : page.text.split('\n')
}

/** One loaded page: the 1-based line it starts at, its text, and its line count. */
export interface LoadedPage extends TextPage {
  readonly offset: number
}

/**
 * The loaded pages in file order.
 * @param pages - the store's page table.
 * @returns the pages, ascending by offset.
 */
export function loadedPages(pages: Record<number, TextPage>): LoadedPage[] {
  return Object.entries(pages)
    .map(([offset, page]) => ({ offset: Number(offset), ...page }))
    .sort((left, right) => left.offset - right.offset)
}

/**
 * The last line the loaded pages reach, by the Host's line counts; 0 before the first page.
 * @param pages - the loaded pages, ascending.
 * @returns the 1-based last loaded line.
 */
export function lastLineLoaded(pages: readonly LoadedPage[]): number {
  const last = pages.at(-1)
  return last === undefined ? 0 : last.offset + last.lines - 1
}

/**
 * Scroll the body so one line sits at its top. A line the pages do not hold
 * leaves the body where it is.
 * @param body - the scrolling container; lines are positioned against it.
 * @param line - 1-based line.
 */
export function scrollToLine(body: HTMLElement, line: number): void {
  const row = body.querySelector(`[data-textpreview-line="${line}"]`)
  if (row instanceof HTMLElement) body.scrollTop = row.offsetTop
}

/**
 * The text type's body, registered under `sidebar.right.pane.tab` as `text`.
 * @param props - composed slot props.
 * @returns the pages read so far with their controls, or a progress line.
 */
export function TextPreview({
  useTabInfo, sessionId, useResource, useStore, actions, loadPage, reloadPages, t,
}: TextPreviewProps): ReactNode {
  const { tab } = useTabInfo()
  const { navigation, signal } = tab
  const meta = useResource<'file'>(tab.contentId)
  const file = useMemo(() => hostFileOf(tab.contentId, sessionId), [tab.contentId, sessionId])
  const state = useStore(s => s.byTab[tab.id])
  const bodyRef = useRef<HTMLDivElement>(null)
  // Every tab of this type is a `file` resource address, so its params are the
  // `file` type's; the union is narrowed on the one field read, not validated.
  const line = navigation.params !== undefined && 'line' in navigation.params ? navigation.params.line : undefined
  const pages = state?.pages
  const loaded = useMemo(() => loadedPages(pages ?? {}), [pages])
  const loadedThrough = lastLineLoaded(loaded)
  const hasPages = loaded.length > 0

  // First mount reads the first page; a body coming back to a tab with pages
  // reads nothing, because the store outlives the body.
  const started = state !== undefined
  useEffect(() => {
    if (!started) loadPage(tab.id, file, 1, signal)
  }, [started, tab.id, file, signal, loadPage])

  // Come back where the reader was once there are pages to scroll: on a remount,
  // and after a reload rebuilt the pages. Keyed on page presence only, so a
  // scroll write never re-lands.
  useEffect(() => {
    const body = bodyRef.current
    if (hasPages && body !== null && state !== undefined) body.scrollTop = state.scrollTop
  }, [hasPages])

  // Answer a navigation once: a line the pages do not reach yet loads the next
  // page (again, until the pages cover it or the file ends); a line they hold
  // is scrolled to and marked. The store remembers the answer, so a remount
  // restores the reader's place instead.
  useEffect(() => {
    const body = bodyRef.current
    if (state === undefined || body === null || state.revision === navigation.revision) return
    if (line === undefined) {
      actions.navigated(tab.id, navigation.revision)
      return
    }
    if (line > loadedThrough && !state.eof) {
      if (!state.loading && state.failure === undefined) loadPage(tab.id, file, loadedThrough + 1, signal)
      return
    }
    scrollToLine(body, line)
    actions.navigated(tab.id, navigation.revision)
    // Recorded here as well as by the scroll event, so the store holds the
    // landing before any later navigation reads it.
    actions.scrolled(tab.id, body.scrollTop)
  }, [navigation.revision, line, loadedThrough, state?.eof, state?.loading, state?.failure, started])

  // One block per line inside one block per page, so a line has an offset to
  // scroll to and a target can be marked. The trailing newline keeps an empty
  // line one line tall. Memoized so a scroll write's re-render hands React the
  // same elements back.
  const rows = useMemo(() => loaded.map(page => (
    <pre key={page.offset} className={css.page} data-textpreview-page={page.offset}>
      {linesOf(page).map((content, index) => {
        const number = page.offset + index
        const target = number === line
        return (
          <div
            key={number}
            className={clsx(css.line, target && css.lineTarget)}
            data-textpreview-line={number}
            {...target ? { 'data-textpreview-target': number } : {}}
          >
            {content}{'\n'}
          </div>
        )
      })}
    </pre>
  )), [loaded, line])

  if (state === undefined) {
    return (
      <div className={css.status} data-textpreview-state="loading">
        <p className={css.statusLine}>{t('loading')}</p>
      </div>
    )
  }
  const next = loadedThrough + 1
  const displayPath = meta.value?.absolutePath ?? file.path
  // Reload does two things at once: stat again through the resource (which
  // clears `changed`, or a failed frame) and read the pages again through the face.
  const reload = (): void => { meta.reload(); reloadPages(tab.id, file, signal) }
  return (
    <div className={css.preview} data-textpreview-state="text" data-textpreview-url={tab.contentId}>
      {meta.failure !== undefined
        ? (
          // The file's metadata failed — gone, or its workspace unknown — which
          // outranks a pending change; the pages already read stay under it.
          <p className={css.changed} data-textpreview-meta-failed={meta.failure.code}>
            <span>{failureLine(t, meta.failure)}</span>
            <button
              type="button"
              className={css.action}
              data-textpreview-reload-now
              onClick={reload}
            >
              {t('reloadNow')}
            </button>
          </p>
        )
        : meta.value?.changed === true && (
          <p className={css.changed} data-textpreview-changed>
            <span>{t('changed')}</span>
            <button
              type="button"
              className={css.action}
              data-textpreview-reload-now
              onClick={reload}
            >
              {t('reloadNow')}
            </button>
          </p>
        )}
      <div className={css.header}>
        <div className={css.path} title={displayPath} data-textpreview-path>{displayPath}</div>
        <button
          type="button"
          className={clsx(css.tool, state.wrap && css.toolOn)}
          aria-pressed={state.wrap}
          aria-label={t('wrap')}
          title={t('wrap')}
          data-textpreview-tool="wrap"
          onClick={() => { actions.toggledWrap(tab.id) }}
        >
          <IconWrapOutline16 />
        </button>
        <button
          type="button"
          className={css.tool}
          aria-label={t('reload')}
          title={t('reload')}
          data-textpreview-tool="reload"
          onClick={reload}
        >
          <IconRefreshOutline16 />
        </button>
      </div>
      <div
        ref={bodyRef}
        className={clsx(css.body, state.wrap && css.wrap)}
        data-textpreview-body
        data-textpreview-wrap={state.wrap ? '' : undefined}
        onScroll={(event) => { actions.scrolled(tab.id, event.currentTarget.scrollTop) }}
      >
        {rows}
        {state.failure !== undefined && (
          <p className={css.statusLine} data-textpreview-failed={state.failure.code}>
            <span>{failureLine(t, state.failure)}</span>
            <button
              type="button"
              className={css.action}
              data-textpreview-retry
              onClick={() => { loadPage(tab.id, file, next, signal) }}
            >
              {t('retry')}
            </button>
          </p>
        )}
        {!state.eof && state.failure === undefined && (
          <button
            type="button"
            className={css.more}
            disabled={state.loading}
            data-textpreview-more
            onClick={() => { loadPage(tab.id, file, next, signal) }}
          >
            {state.loading ? t('loading') : t('loadMore')}
          </button>
        )}
      </div>
    </div>
  )
}
