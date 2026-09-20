/** Locale namespace owned by Session export browser feedback. */
export const NS = 'session-log-download'

/** Simplified-Chinese Session export strings. */
export const zh = {
  'header.more': '更多操作',
  'menu.download': '下载 Session 日志',
  'dialog.preparingTitle': '正在导出 Session',
  'dialog.privacyTitle': '导出会话诊断',
  'dialog.privacyDescription': '选择诊断包是否包含自定义提示词原文。版本标识会保留，原文默认不包含。',
  'dialog.includeCustomInstructions': '包含自定义提示词原文',
  'dialog.rememberChoice': '不再提示，记住本次选择',
  'dialog.includeRememberWarning': '以后导出的诊断包将自动包含提示词原文，分享前请确认其中没有敏感信息。',
  'dialog.export': '导出',
  'dialog.cancel': '取消',
  'dialog.preparingDescription': '正在准备包含当前 Session、子 Session 和附件的 ZIP 文件。',
  'dialog.successTitle': 'Session 导出已开始下载',
  'dialog.successDescription': '浏览器正在下载 Session ZIP 文件。',
  'dialog.errorTitle': 'Session 导出失败',
  'dialog.close': '关闭',
  'dialog.commandFailed': '无法启动 Session 导出。',
} as const

/** English Session export strings. */
export const en: Record<keyof typeof zh, string> = {
  'header.more': 'More actions',
  'menu.download': 'Download session log',
  'dialog.preparingTitle': 'Exporting Session',
  'dialog.privacyTitle': 'Export conversation diagnostics',
  'dialog.privacyDescription': 'Choose whether the diagnostic archive includes custom-prompt plaintext. Version identifiers remain; plaintext is excluded by default.',
  'dialog.includeCustomInstructions': 'Include custom-prompt plaintext',
  'dialog.rememberChoice': 'Do not ask again; remember this choice',
  'dialog.includeRememberWarning': 'Future diagnostic archives will automatically contain prompt plaintext. Check for sensitive content before sharing.',
  'dialog.export': 'Export',
  'dialog.cancel': 'Cancel',
  'dialog.preparingDescription': 'Preparing a ZIP containing this Session, its sub-Sessions, and attachments.',
  'dialog.successTitle': 'Session download started',
  'dialog.successDescription': 'The browser is downloading the Session ZIP.',
  'dialog.errorTitle': 'Session export failed',
  'dialog.close': 'Close',
  'dialog.commandFailed': 'Could not start the Session export.',
}

/** Stable locale keys consumed by the shared modal. */
export type SessionLogDownloadKey = keyof typeof zh
