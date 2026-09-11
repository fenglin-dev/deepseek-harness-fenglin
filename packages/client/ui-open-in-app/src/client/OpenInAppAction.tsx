import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS, type OpenInAppKey } from './locales.ts'
import css from './OpenInAppAction.module.css'

/** Browser operations and state injected into the Session Header contribution. */
export interface OpenInAppActionInjected {
  hooks: {
    openInAppApps: ObservableSnapshot<readonly string[] | null>
    openInAppChoice: ObservableSnapshot<string>
  }
  launch: (appId: string, path: string) => Promise<void>
  choose: (appId: string) => void
  iconUrl: (appId: string) => string
}

/** Full props for the Session-header open-in-app menu contribution. */
export type OpenInAppActionProps =
  PropsRuntime<'conversation.session.header.menu.item'>
  & PropsLocale<typeof NS>
  & InjectFace<OpenInAppActionInjected>

/**
 * Label keys per catalog id: the browser renders only ids it can name, so a
 * host catalog extension without a matching dictionary entry stays invisible
 * instead of showing a raw id.
 */
const APP_LABEL_KEY: Record<string, OpenInAppKey | undefined> = {
  finder: 'app.finder',
  explorer: 'app.explorer',
  filemanager: 'app.filemanager',
  cursor: 'app.cursor',
  vscode: 'app.vscode',
  vscodeinsiders: 'app.vscodeinsiders',
  windsurf: 'app.windsurf',
  zed: 'app.zed',
  sublimetext: 'app.sublimetext',
  xcode: 'app.xcode',
  androidstudio: 'app.androidstudio',
  intellij: 'app.intellij',
  pycharm: 'app.pycharm',
  webstorm: 'app.webstorm',
  phpstorm: 'app.phpstorm',
  goland: 'app.goland',
  rider: 'app.rider',
  rustrover: 'app.rustrover',
  fork: 'app.fork',
  sourcetree: 'app.sourcetree',
  github: 'app.github',
  tower: 'app.tower',
  gitkraken: 'app.gitkraken',
  smartgit: 'app.smartgit',
  sublimemerge: 'app.sublimemerge',
  ghostty: 'app.ghostty',
  warp: 'app.warp',
  iterm: 'app.iterm',
  kitty: 'app.kitty',
  terminal: 'app.terminal',
  windowsterminal: 'app.windowsterminal',
  gitbash: 'app.gitbash',
  gnometerminal: 'app.gnometerminal',
  konsole: 'app.konsole',
}

/** App ids whose icon image already failed this page; a 404 icon is fetched once, not per menu open. */
const failedIcons = new Set<string>()

/**
 * One application's real bundle icon (host-served PNG) with an inline generic
 * app-square fallback while the host has none.
 * @param props - catalog id, host icon URL, and rendered size.
 * @returns the icon image or its fallback glyph.
 */
function AppIcon({ id, url, size }: { id: string; url: string; size: number }): React.JSX.Element {
  const [failed, setFailed] = useState(failedIcons.has(id))
  if (failed) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className={css.icon}
        aria-hidden
      >
        <rect x={3} y={3} width={18} height={18} rx={5} />
      </svg>
    )
  }
  return (
    <img
      src={url}
      width={size}
      height={size}
      className={css.icon}
      alt=""
      aria-hidden
      draggable={false}
      onError={() => {
        failedIcons.add(id)
        setFailed(true)
      }}
    />
  )
}

/**
 * Quick launches settle well under this delay, so their busy dress never
 * paints — the visible dim-and-wait treatment is reserved for launches that
 * are actually taking a while, instead of flashing on every click.
 */
const BUSY_DRESS_DELAY_MS = 250

/**
 * Session-header menu contribution: an "Open in" row owns a submenu containing
 * every application the host probed as installed. It contributes nothing until
 * the host reported at least one nameable application and the session has a
 * known workspace directory, so a host without the capability never grows
 * the control.
 * @param props - session runtime, injected controller face, and localized copy.
 * @returns no visible sibling control; the official Session menu owns the rows.
 */
export function OpenInAppAction(props: OpenInAppActionProps): React.JSX.Element | null {
  const {
    sessionId, useSessions, useOpenInAppApps, useOpenInAppChoice,
    registerMenuItem, launch: launchInApp, choose, iconUrl, t,
  } = props
  const cwd = useSessions(state => state.byId[sessionId]?.cwd)
  const available = useOpenInAppApps(apps => apps)
  const choice = useOpenInAppChoice(id => id)
  const [phase, setPhase] = useState<'idle' | 'busy' | 'error'>('idle')
  const inFlight = useRef(false)
  const launchRef = useRef(launchInApp)
  const chooseRef = useRef(choose)
  const iconUrlRef = useRef(iconUrl)
  launchRef.current = launchInApp
  chooseRef.current = choose
  iconUrlRef.current = iconUrl
  const busyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => {
    clearTimeout(busyTimer.current)
    clearTimeout(errorTimer.current)
  }, [])

  const apps = useMemo(() => (available ?? [])
    .map(id => ({ id, labelKey: APP_LABEL_KEY[id] }))
    .filter((entry): entry is { id: string; labelKey: OpenInAppKey } => entry.labelKey !== undefined), [available])
  const currentEntry = apps.find(entry => entry.id === choice) ?? apps[0]

  const launch = useCallback((appId: string): void => {
    if (inFlight.current || cwd === undefined || cwd === '') return
    inFlight.current = true
    // A pending error decay must not flip the button back to idle mid-launch.
    clearTimeout(errorTimer.current)
    clearTimeout(busyTimer.current)
    busyTimer.current = setTimeout(() => { setPhase('busy') }, BUSY_DRESS_DELAY_MS)
    launchRef.current(appId, cwd).then(() => {
      inFlight.current = false
      clearTimeout(busyTimer.current)
      setPhase('idle')
    }, () => {
      inFlight.current = false
      clearTimeout(busyTimer.current)
      setPhase('error')
      clearTimeout(errorTimer.current)
      errorTimer.current = setTimeout(() => { setPhase('idle') }, 2_000)
    })
  }, [cwd])

  useEffect(() => {
    if (currentEntry === undefined || cwd === undefined || cwd === '') return
    const submenu = apps.map(entry => ({
      id: `open-in-app:${entry.id}`,
      label: t(entry.labelKey),
      icon: <AppIcon id={entry.id} url={iconUrlRef.current(entry.id)} size={18} />,
    }))
    return registerMenuItem({
      id: 'open-in-app',
      order: 10,
      item: {
        id: 'open-in-app',
        label: phase === 'error' ? t('open.error') : t('menu.aria'),
        icon: <AppIcon id={currentEntry.id} url={iconUrlRef.current(currentEntry.id)} size={18} />,
        disabled: phase === 'busy',
        submenu,
      },
      onSelect: (id) => {
        if (!id.startsWith('open-in-app:') || inFlight.current) return
        const appId = id.slice('open-in-app:'.length)
        if (!apps.some(entry => entry.id === appId)) return
        chooseRef.current(appId)
        launch(appId)
      },
    })
  }, [apps, currentEntry, cwd, launch, phase, registerMenuItem, t])

  return null
}
