import { Button, IconEditOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CustomInstructionsLocaleKey } from './locales.ts'
import css from './CustomInstructions.module.css'

export interface CustomInstructionsRowInjected {
  open: () => void
}

export type CustomInstructionsRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'settings.customInstructions'>
  & InjectFace<CustomInstructionsRowInjected>

/** General Settings entry point for global and Workspace prompts. */
export function CustomInstructionsRow({ open, t }: CustomInstructionsRowProps) {
  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.rowTitle}>{t('rowTitle' satisfies CustomInstructionsLocaleKey)}</div>
        <div className={css.rowDescription}>{t('rowDescription')}</div>
      </div>
      <Button variant="outline" onClick={open}>
        <IconEditOutline16 />
        {t('configure')}
      </Button>
    </div>
  )
}
