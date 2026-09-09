/**
 * Shared harness for the body specs: a real store instance, a real face over a
 * scripted paged read, a scripted `useResource`, and the owner props a tab
 * record carries.
 *
 * The framework's standard kit is replaced by the few members these components
 * read, behind one documented cast, so the specs exercise the components and
 * not the slot runtime.
 */
import { vi } from 'vitest'
import type { Mock } from 'vitest'
import { act } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { ResourceSnapshot } from '@deepseek-ai/dsh-client-resources/client'
import type { WorkspaceFileResource } from '@deepseek-ai/dsh-api-workspace-files/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { TextPreviewProps } from '../src/client/TextPreview.tsx'
import { textFace } from '../src/client/face.ts'
import type { TextInjected } from '../src/client/face.ts'
import type { ReadWorkspaceFilePage, SessionFile } from '../src/client/rpc.ts'
import { createTextStore } from '../src/client/store.ts'
import type { TextStore } from '../src/client/store.ts'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'

export const TAB_ID = 'tab-1' as TabId
export const SESSION = 's-1' as SessionId
/** The path relative to the session's workspace root, as the Host receives it. */
export const PATH = 'work/notes.md'
export const ABSOLUTE_PATH = '/host/project/work/notes.md'
/** The tab's address: the file under this session's scope. */
export const ADDRESS = 'dsh-resource://file/session/s-1/work/notes.md'
/** What the address names, as the face receives it. */
export const FILE: SessionFile = { sessionId: SESSION, path: PATH }

/** One page the Host would return: the lines joined without a terminator, and their count. */
export function page(offset: number, lines: readonly string[], eof: boolean, version = 'v1'): RemoteResult<WorkspaceFileText> {
  return { ok: true, value: { absolutePath: ABSOLUTE_PATH, version, offset, text: lines.join('\n'), lines: lines.length, eof, bytes: 100 } }
}

/** One failed page read. */
export function failure(code: string, details: Record<string, unknown> = {}): RemoteResult<WorkspaceFileText> {
  return { ok: false, error: { code, message: 'boom', details } as unknown as RemoteFailure }
}

/** The `file` resource's metadata: live, or failed beside the last live value. */
function meta(changed: boolean, failure: RemoteFailure | undefined, reload: () => void): ResourceSnapshot<WorkspaceFileResource> {
  const value: WorkspaceFileResource = { absolutePath: ABSOLUTE_PATH, version: 'v1', bytes: 100, changed }
  return failure === undefined
    ? { status: 'live', value, failure: undefined, reload }
    : { status: 'failed', value, failure, reload }
}

/** Test-local selector hook over a framework-neutral store instance. */
function hookOf<T>(inst: { subscribe: (fn: () => void) => () => void; getSnapshot: () => T }) {
  return function useSelector<S>(sel: (s: T) => S): S {
    return sel(useSyncExternalStore(inst.subscribe, inst.getSnapshot))
  }
}

/** Key-echoing translate that also shows its parameters. */
export function t(key: string, params?: Record<string, unknown>): string {
  return params === undefined ? key : `${key}(${Object.entries(params).map(([k, v]) => `${k}=${String(v)}`).join(',')})`
}

/** Flush page reads that resolved since the last render, then React's work. */
export async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

/** What one tab record's harness hands a spec. Named so the helper's declaration stays portable. */
export interface Harness {
  /** The live store instance both components read. */
  instance: ReturnType<TextStore['create']>
  /** The face bound to the scripted read. */
  face: TextInjected
  /** The scripted paged read. */
  read: Mock<ReadWorkspaceFilePage>
  /** The resource's `reload`. */
  reload: Mock<() => void>
  /** The tab record's lifetime. */
  controller: AbortController
  /** The scripted `useResource`. */
  useResource: Mock<() => ResourceSnapshot<WorkspaceFileResource>>
  /** Composed props for one navigation state. */
  props: (navigation?: { params?: unknown; revision: number }) => TextPreviewProps
  /** Script what one offset resolves to from now on. */
  script(offset: number, result: RemoteResult<WorkspaceFileText>): void
  /** Script whether the next render's `useResource` reports a pending change. */
  setChanged(changed: boolean): void
  /** Script the next render's `useResource` as failed with `failure`, or live again with `undefined`. */
  setFailure(failure: RemoteFailure | undefined): void
}

/**
 * One tab record's harness.
 * @param script - the page each offset resolves to; an unscripted offset fails `not-found`.
 * @returns the store, the scripted faces, and a props builder.
 */
export function harness(script: Record<number, RemoteResult<WorkspaceFileText>> = {}): Harness {
  const instance = createTextStore().create()
  const pages: Record<number, RemoteResult<WorkspaceFileText>> = { ...script }
  const read = vi.fn<ReadWorkspaceFilePage>((_session, _path, offset) =>
    Promise.resolve(pages[offset] ?? failure('workspace-file/not-found', { path: PATH })))
  const face = textFace(read)(SESSION, instance.actions)
  const reload = vi.fn<() => void>()
  const current = { changed: false, failure: undefined as RemoteFailure | undefined, snapshot: meta(false, undefined, reload) }
  const refresh = (): void => { current.snapshot = meta(current.changed, current.failure, reload) }
  const useResource = vi.fn<() => ResourceSnapshot<WorkspaceFileResource>>(() => current.snapshot)
  const controller = new AbortController()
  const tabActions = { openResource: vi.fn(), openTab: vi.fn(), close: vi.fn(), replace: vi.fn() }
  const props = (navigation: { params?: unknown; revision: number } = { revision: 1 }) => ({
    useTabInfo: () => ({
      sidebar: { expanded: true, fullscreen: false },
      panel: { id: 'pane-1' },
      tab: {
        id: TAB_ID, kind: 'text', contentId: ADDRESS, title: 'notes.md', visible: true,
        navigation: { address: ADDRESS, params: navigation.params, revision: navigation.revision },
        signal: controller.signal,
        actions: tabActions,
      },
    }),
    sessionId: SESSION,
    useResource,
    useStore: hookOf(instance),
    actions: instance.actions,
    loadPage: face.loadPage,
    reloadPages: face.reloadPages,
    t,
  }) as unknown as TextPreviewProps
  return {
    instance,
    face,
    read,
    reload,
    controller,
    useResource,
    props,
    script(offset, result) { pages[offset] = result },
    setChanged(changed) { current.changed = changed; refresh() },
    setFailure(failure) { current.failure = failure; refresh() },
  }
}
