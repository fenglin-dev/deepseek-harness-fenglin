/** Sandboxed interaction controller for the first-run data-home chooser. */

import { ipcRenderer } from 'electron'
import {
  DESKTOP_LOCALES,
  resolveDesktopLocale,
  type DesktopLocaleId,
} from './desktop-locale.ts'
import { copyFor, detailsFor } from './locales/data-home.ts'

type DataHomeMode = 'imported' | 'reused' | 'fresh'

type DataHomeSourceResult =
  | { readonly status: 'valid'; readonly path: string; readonly entries: readonly string[] }
  | { readonly status: 'invalid' | 'unreadable'; readonly path: string }
  | { readonly status: 'cancelled' }

type DataHomeTargetResult =
  | { readonly status: 'selected'; readonly selectionId: string; readonly path: string }
  | { readonly status: 'not-empty' | 'overlap' | 'unreadable'; readonly path: string }
  | { readonly status: 'cancelled' }

type DataHomeTargetMode = 'default' | 'custom'
type DataHomeStep = 'details' | 'destination'

function isDataHomeMode(value: string | null): value is DataHomeMode {
  return value === 'imported' || value === 'reused' || value === 'fresh'
}

// Copy is owned by complete, typed locale dictionaries.

function required(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (element === null) throw new Error(`desktop: data-home chooser is missing ${selector}`)
  return element
}

window.addEventListener('DOMContentLoaded', () => {
  const startupLocale = new URLSearchParams(window.location.search).get('locale')
  let language = resolveDesktopLocale(startupLocale ?? navigator.languages)
  const help = required('#help') as HTMLButtonElement
  const close = required('#close-comparison') as HTMLButtonElement
  const choicesGroup = required('#choices')
  const sourcePanel = required('#source-panel')
  const sourceStatusText = required('#source-status')
  const sourcePath = required('#source-path')
  const sourceSummary = required('#source-summary')
  const sourceError = required('#source-error')
  const chooseSourceButton = required('#choose-source') as HTMLButtonElement
  const restoreDefaultSourceButton = required('#restore-default-source') as HTMLButtonElement
  const sourceRequirements = [...document.querySelectorAll<HTMLElement>('.choice-requirement')]
  const languagePicker = required('#language-picker')
  const languageTrigger = required('#language-trigger') as HTMLButtonElement
  const languageMenu = required('#language-menu')
  const languageCurrent = required('#language-current')
  const languageOptions = DESKTOP_LOCALES.map(({ id, label }) => {
    const option = document.createElement('button')
    option.className = 'language-option'
    option.type = 'button'
    option.role = 'option'
    option.dataset.language = id
    const name = document.createElement('span')
    name.textContent = label
    const code = document.createElement('span')
    code.className = 'language-code'
    code.textContent = id.toUpperCase()
    option.append(name, code)
    return option
  })
  languageMenu.replaceChildren(...languageOptions)
  const developmentTools = required('#development-tools')
  const simulateMissingSourceButton = required('#simulate-missing-source') as HTMLButtonElement

  const choices = [...document.querySelectorAll<HTMLButtonElement>('.choice')]
  const overlay = required('#overlay')
  const detailPanel = required('#detail')
  const detailTitle = required('#detail-title')
  const detailStage = required('#detail-stage')
  const destinationPanel = required('#destination-panel')
  const destinationSummary = required('#destination-summary')
  const targetChoicesGroup = required('#target-choices')
  const targetChoices = [...document.querySelectorAll<HTMLElement>('.target-choice')]
  const defaultTargetPath = required('#default-target-path')
  const customTargetPath = required('#custom-target-path')
  const customTargetError = required('#custom-target-error')
  const chooseTargetButton = required('#choose-target') as HTMLButtonElement
  const backButton = required('#back') as HTMLButtonElement
  const continueButton = required('#continue') as HTMLButtonElement
  const risk = required('#risk')
  const location = required('#location-value')
  const sharing = required('#sharing-value')
  const plugins = required('#plugins-value')
  const builds = required('#builds-value')
  const parameters = new URLSearchParams(window.location.search)
  const development = parameters.get('development') === 'true'
  const requestedMode = parameters.get('selected')
  const defaultSource = parameters.get('defaultSource')?.trim() || undefined
  const sourceCandidate = parameters.get('sourceCandidate')?.trim() || undefined
  const builtInTarget = parameters.get('defaultTarget')?.trim() || ''
  let source = parameters.get('source')?.trim() || undefined
  let sourceState: 'valid' | 'missing' | 'unreadable' = parameters.get('sourceStatus') === 'unreadable'
    ? 'unreadable'
    : source === undefined ? 'missing' : 'valid'
  let sourceErrorKind: 'invalid' | 'unreadable' | undefined
  let selected: DataHomeMode = isDataHomeMode(requestedMode) ? requestedMode : 'imported'
  let step: DataHomeStep = 'details'
  let targetMode: DataHomeTargetMode = 'default'
  let customTarget: { readonly selectionId: string; readonly path: string } | undefined
  let targetErrorKind: 'not-empty' | 'overlap' | 'unreadable' | undefined
  let simulateMissingSource = false
  let selectionBeforeSimulation: DataHomeMode | undefined

  developmentTools.hidden = !development

  const displayedSource = (): string | undefined => simulateMissingSource ? undefined : source
  const displayedSourceState = (): 'valid' | 'missing' | 'unreadable' => simulateMissingSource ? 'missing' : sourceState

  const renderSource = (): void => {
    const copy = copyFor(language)
    const visibleSource = displayedSource()
    const visibleSourceState = displayedSourceState()
    sourcePanel.dataset.status = visibleSourceState
    const usingCustomSource = visibleSource !== undefined && visibleSource !== defaultSource
    sourceStatusText.textContent = visibleSourceState === 'unreadable'
      ? copy.sourceUnreadable
      : visibleSource === undefined ? copy.sourceMissing : usingCustomSource ? copy.sourceCustom : copy.sourceDetected
    const displayedPath = visibleSource ?? (visibleSourceState === 'unreadable' ? sourceCandidate : undefined)
    sourcePath.textContent = displayedPath ?? ''
    sourcePath.hidden = displayedPath === undefined
    sourceSummary.textContent = visibleSourceState === 'unreadable'
      ? copy.sourceUnreadableSummary
      : visibleSource === undefined ? copy.sourceMissingSummary : copy.sourceReadySummary
    const visibleErrorKind = simulateMissingSource ? undefined : sourceErrorKind
    sourceError.textContent = visibleErrorKind === 'invalid'
      ? copy.sourceInvalid
      : visibleErrorKind === 'unreadable' ? copy.sourceReadFailed : ''
    sourceError.hidden = visibleErrorKind === undefined
    chooseSourceButton.textContent = visibleSource === undefined ? copy.chooseSource : copy.changeSource
    restoreDefaultSourceButton.textContent = copy.restoreDefaultSource
    restoreDefaultSourceButton.hidden = simulateMissingSource || defaultSource === undefined || source === defaultSource
    for (const requirement of sourceRequirements) requirement.hidden = visibleSource !== undefined
    simulateMissingSourceButton.textContent = simulateMissingSource ? copy.restoreDetectedSource : copy.simulateMissingSource
    simulateMissingSourceButton.ariaPressed = String(simulateMissingSource)
  }

  const selectedTargetPath = (): string | undefined => targetMode === 'default'
    ? builtInTarget || undefined
    : customTarget?.path

  const renderDestination = (): void => {
    const copy = copyFor(language)
    targetChoicesGroup.ariaLabel = copy.targetGroupLabel
    defaultTargetPath.textContent = builtInTarget
    defaultTargetPath.hidden = builtInTarget.length === 0
    customTargetPath.textContent = customTarget?.path ?? ''
    customTargetPath.hidden = customTarget === undefined
    chooseTargetButton.textContent = customTarget === undefined ? copy.chooseTarget : copy.changeTarget
    customTargetError.textContent = targetErrorKind === 'not-empty'
      ? copy.targetNotEmpty
      : targetErrorKind === 'overlap' ? copy.targetOverlap
        : targetErrorKind === 'unreadable' ? copy.targetUnreadable : targetMode === 'custom' && customTarget === undefined
          ? copy.targetRequired
          : ''
    customTargetError.hidden = customTargetError.textContent.length === 0
    for (const choice of targetChoices) choice.ariaChecked = String(choice.dataset.target === targetMode)
    continueButton.disabled = targetMode === 'custom' && customTarget === undefined
  }

  const renderStep = (): void => {
    const destinationVisible = step === 'destination' && selected !== 'reused'
    risk.hidden = detailsFor(language)[selected].risk === undefined
    backButton.hidden = !destinationVisible
    detailStage.dataset.step = destinationVisible ? 'destination' : 'details'
    destinationPanel.ariaHidden = String(!destinationVisible)
    destinationPanel.inert = !destinationVisible
    if (destinationVisible) {
      const copy = copyFor(language)
      destinationSummary.textContent = copy.destinationSummary
      renderDestination()
    } else {
      continueButton.disabled = false
    }
  }

  const renderCopy = (): void => {
    const copy = copyFor(language)
    document.documentElement.lang = language
    document.title = copy.windowTitle
    languageCurrent.textContent = DESKTOP_LOCALES.find(locale => locale.id === language)?.label ?? 'English'
    languageTrigger.ariaLabel = `${copy.languageLabel}: ${languageCurrent.textContent}`
    languageMenu.ariaLabel = copy.languageLabel
    for (const option of languageOptions) option.ariaSelected = String(option.dataset.language === language)
    help.ariaLabel = copy.helpLabel
    close.ariaLabel = copy.closeLabel
    choicesGroup.ariaLabel = copy.modeGroupLabel
    for (const element of document.querySelectorAll<HTMLElement>('[data-copy]')) {
      const key = element.dataset.copy as keyof typeof copy
      element.textContent = copy[key]
    }
    renderSource()
    renderDestination()
  }

  const select = (mode: DataHomeMode): void => {
    selected = mode
    for (const choice of choices) choice.ariaChecked = String(choice.dataset.mode === mode)
    detailPanel.dataset.mode = mode
    const detail = detailsFor(language)[mode]
    detailTitle.textContent = detail.title
    risk.textContent = detail.risk ?? ''
    risk.hidden = detail.risk === undefined
    location.textContent = detail.location
    sharing.textContent = detail.sharing
    plugins.textContent = detail.plugins
    builds.textContent = detail.builds
    renderStep()
  }

  const enterDestinationStep = (): void => {
    step = 'destination'
    renderStep()
    targetChoices.find(choice => choice.dataset.target === targetMode)?.focus()
  }

  const leaveDestinationStep = (): void => {
    step = 'details'
    renderStep()
    choices.find(choice => choice.dataset.mode === selected)?.focus()
  }
  const chooseSource = async (modeAfterSelection?: DataHomeMode): Promise<void> => {
    chooseSourceButton.disabled = true
    sourceErrorKind = undefined
    renderSource()
    try {
      const result = await ipcRenderer.invoke('dsh:data-home:choose-source') as DataHomeSourceResult
      if (result.status === 'cancelled') return
      if (result.status !== 'valid') {
        simulateMissingSource = false
        selectionBeforeSimulation = undefined
        sourceErrorKind = result.status
        renderSource()
        return
      }
      simulateMissingSource = false
      selectionBeforeSimulation = undefined
      source = result.path
      sourceState = 'valid'
      sourceErrorKind = undefined
      renderSource()
      if (modeAfterSelection !== undefined) {
        select(modeAfterSelection)
      }
    } catch {
      sourceErrorKind = 'unreadable'
      renderSource()
    } finally {
      chooseSourceButton.disabled = false
    }
  }
  const chooseTarget = async (): Promise<void> => {
    chooseTargetButton.disabled = true
    targetErrorKind = undefined
    renderDestination()
    try {
      const result = await ipcRenderer.invoke('dsh:data-home:choose-target') as DataHomeTargetResult
      if (result.status === 'cancelled') return
      if (result.status !== 'selected') {
        customTarget = undefined
        targetErrorKind = result.status
        renderDestination()
        return
      }
      customTarget = { selectionId: result.selectionId, path: result.path }
      targetMode = 'custom'
      targetErrorKind = undefined
      renderDestination()
    } catch {
      customTarget = undefined
      targetErrorKind = 'unreadable'
      renderDestination()
    } finally {
      chooseTargetButton.disabled = false
    }
  }
  for (const choice of choices) {
    choice.addEventListener('click', () => {
      const mode = choice.dataset.mode as DataHomeMode
      if (mode !== 'fresh' && displayedSource() === undefined) {
        void chooseSource(mode)
        return
      }
      step = 'details'
      select(mode)
    })
  }
  for (const choice of targetChoices) {
    choice.addEventListener('click', (event) => {
      if (event.target === chooseTargetButton) return
      const requestedTarget = choice.dataset.target === 'custom' ? 'custom' : 'default'
      targetMode = requestedTarget
      targetErrorKind = undefined
      renderDestination()
      if (requestedTarget === 'custom' && customTarget === undefined) void chooseTarget()
    })
    choice.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      choice.click()
    })
  }
  chooseTargetButton.addEventListener('click', (event) => {
    event.stopPropagation()
    targetMode = 'custom'
    void chooseTarget()
  })
  chooseSourceButton.addEventListener('click', () => { void chooseSource() })
  simulateMissingSourceButton.addEventListener('click', () => {
    if (!development) return
    simulateMissingSource = !simulateMissingSource
    if (simulateMissingSource) {
      selectionBeforeSimulation = selected
      step = 'details'
      select('fresh')
    } else if (selectionBeforeSimulation !== undefined) {
      const restoredSelection = selectionBeforeSimulation
      selectionBeforeSimulation = undefined
      step = 'details'
      select(restoredSelection)
    }
    renderSource()
  })
  restoreDefaultSourceButton.addEventListener('click', () => {
    if (defaultSource === undefined) return
    source = defaultSource
    sourceState = 'valid'
    sourceErrorKind = undefined
    renderSource()
  })
  ipcRenderer.on('dsh:data-home:source-error', (_event, result: DataHomeSourceResult) => {
    if (result.status !== 'invalid' && result.status !== 'unreadable') return
    sourceErrorKind = result.status
    renderSource()
  })
  ipcRenderer.on('dsh:data-home:target-error', (_event, result: DataHomeTargetResult) => {
    if (result.status !== 'not-empty' && result.status !== 'overlap' && result.status !== 'unreadable') return
    customTarget = undefined
    targetMode = 'custom'
    targetErrorKind = result.status
    renderDestination()
  })

  const closeLanguageMenu = (restoreFocus = false): void => {
    languageMenu.hidden = true
    languageTrigger.ariaExpanded = 'false'
    if (restoreFocus) languageTrigger.focus()
  }
  const openLanguageMenu = (): void => {
    languageMenu.hidden = false
    languageTrigger.ariaExpanded = 'true'
    languageOptions.find(option => option.dataset.language === language)?.focus()
  }
  const changeLanguage = (nextLanguage: DesktopLocaleId): void => {
    language = nextLanguage
    renderCopy()
    select(selected)
    closeLanguageMenu(true)
  }
  languageTrigger.addEventListener('click', () => {
    if (languageMenu.hidden) openLanguageMenu()
    else closeLanguageMenu()
  })
  languageTrigger.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    openLanguageMenu()
  })
  for (const option of languageOptions) {
    option.addEventListener('click', () => { changeLanguage(resolveDesktopLocale(option.dataset.language ?? 'en')) })
  }
  document.addEventListener('click', (event) => {
    if (!languageMenu.hidden && event.target instanceof Node && !languagePicker.contains(event.target)) closeLanguageMenu()
  })

  const showComparison = (): void => {
    closeLanguageMenu()
    overlay.hidden = false
    required('#acknowledge').focus()
  }
  const hideComparison = (): void => {
    overlay.hidden = true
    help.focus()
  }
  help.addEventListener('click', showComparison)
  required('#compare').addEventListener('click', showComparison)
  close.addEventListener('click', hideComparison)
  required('#acknowledge').addEventListener('click', hideComparison)
  overlay.addEventListener('click', (event) => { if (event.target === overlay) hideComparison() })

  const submitSelection = (): void => {
    if (selected === 'reused') {
      if (source !== undefined) ipcRenderer.send('dsh:data-home:selected', { mode: selected, source })
      return
    }
    const target = targetMode === 'default'
      ? { kind: 'default' as const }
      : customTarget === undefined ? undefined : { kind: 'custom' as const, selectionId: customTarget.selectionId }
    if (target === undefined) {
      targetErrorKind = 'unreadable'
      renderDestination()
      return
    }
    ipcRenderer.send('dsh:data-home:selected', selected === 'fresh'
      ? { mode: selected, target }
      : { mode: selected, source, target })
  }

  continueButton.addEventListener('click', () => {
    if (selected !== 'fresh' && displayedSource() === undefined) {
      void chooseSource(selected)
      return
    }
    if (selected !== 'reused' && step === 'details') {
      enterDestinationStep()
      return
    }
    if (selected !== 'reused' && selectedTargetPath() === undefined) {
      targetErrorKind = 'unreadable'
      renderDestination()
      return
    }
    submitSelection()
  })
  backButton.addEventListener('click', () => {
    if (step === 'destination') leaveDestinationStep()
    else ipcRenderer.send('dsh:data-home:cancelled')
  })
  window.addEventListener('keydown', (event) => {
    if (!languageMenu.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLanguageMenu(true)
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const focusedIndex = languageOptions.findIndex(option => option === document.activeElement)
        const direction = event.key === 'ArrowDown' ? 1 : -1
        const nextIndex = (focusedIndex + direction + languageOptions.length) % languageOptions.length
        languageOptions[nextIndex]?.focus()
      }
      return
    }
    if (event.key === 'Escape' && !overlay.hidden) hideComparison()
    else if (event.key === 'Escape') ipcRenderer.send('dsh:data-home:cancelled')
    else if (event.key === 'Enter' && overlay.hidden
      && !(event.target instanceof HTMLButtonElement)) continueButton.click()
  })
  renderCopy()
  select(selected)
}, { once: true })
