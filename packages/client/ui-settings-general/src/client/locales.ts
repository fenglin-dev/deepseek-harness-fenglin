/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'nav.reorder': '拖动调整设置项顺序',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
  'onboarding.start': '开始使用',
  'onboarding.step.models': '连接模型',
  'onboarding.step.phone': '连接手机',
  'onboarding.step.messages': '连接 IM 机器人',
  'onboarding.step.codex': '连接 Codex',
  'onboarding.step.ready': '准备完成',
  'onboarding.back': '返回步骤',
  'onboarding.done': '完成此项',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'nav.reorder': 'Drag to reorder settings',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
  'onboarding.start': 'Get started',
  'onboarding.step.models': 'Connect a model',
  'onboarding.step.phone': 'Connect your phone',
  'onboarding.step.messages': 'Connect IM bots',
  'onboarding.step.codex': 'Connect Codex',
  'onboarding.step.ready': 'Ready',
  'onboarding.back': 'Back to steps',
  'onboarding.done': 'Complete step',
} satisfies Record<SettingsKey, string>
