/** Selected-text action labels and feedback. */

/** Dictionary namespace owned by the selected-text action plugin. */
export const NS = 'selectionActions'

/** Simplified Chinese dictionary. */
export const zh = {
  'action.copy': '复制',
  'action.ask': '在新对话询问',
  'action.append': '添加到当前对话',
  'action.restart': '快速重启',
  'status.copied': '已复制选中文字',
  'status.added': '已添加到当前对话',
  'status.newConversation': '已添加到新对话草稿',
  'error.copy': '复制失败',
  'error.action': '操作失败，请重试',
  'error.restart': '无法快速重启，请稍后再试',
  'prompt.ask': '请回答以下选中内容：',
  'toolbar.aria': '选中文字操作',
  'menu.aria': '选中文字菜单',
} satisfies Record<string, string>

/** Dictionary key union. */
export type SelectionActionsKey = keyof typeof zh

/** English dictionary. */
export const en = {
  'action.copy': 'Copy',
  'action.ask': 'Ask in new conversation',
  'action.append': 'Add to current conversation',
  'action.restart': 'Quick restart',
  'status.copied': 'Selected text copied',
  'status.added': 'Added to the current conversation',
  'status.newConversation': 'Added to a new conversation draft',
  'error.copy': 'Copy failed',
  'error.action': 'Action failed. Try again.',
  'error.restart': 'Could not restart. Try again shortly.',
  'prompt.ask': 'Please answer the following selected text:',
  'toolbar.aria': 'Selected text actions',
  'menu.aria': 'Selected text menu',
} satisfies Record<SelectionActionsKey, string>

/** Russian dictionary checked against the English key source. */
export const ru = {
  'action.copy': 'Копировать',
  'action.ask': 'Спросить в новом диалоге',
  'action.append': 'Добавить в текущий диалог',
  'action.restart': 'Быстрый перезапуск',
  'status.copied': 'Выделенный текст скопирован',
  'status.added': 'Добавлено в текущий диалог',
  'status.newConversation': 'Добавлено в черновик нового диалога',
  'error.copy': 'Не удалось скопировать',
  'error.action': 'Операция не удалась. Повторите попытку.',
  'error.restart': 'Не удалось перезапустить. Повторите чуть позже.',
  'prompt.ask': 'Ответьте на следующий выделенный текст:',
  'toolbar.aria': 'Действия с выделенным текстом',
  'menu.aria': 'Меню выделенного текста',
} satisfies Record<SelectionActionsKey, string>
