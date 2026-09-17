/** Copy dictionaries for the archived-session Settings page. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  nav: '已归档会话',
  title: '已归档会话',
  description: '查看隐藏的历史会话，并将它们恢复到原来的工作区位置。会话内容不会在归档或恢复时改变。',
  search: '搜索已归档会话…',
  searchAria: '搜索已归档会话',
  workspaceFilter: '按工作区筛选',
  allWorkspaces: '所有工作区',
  loading: '正在读取会话…',
  emptyTitle: '暂无已归档会话',
  emptyDescription: '归档后的会话会显示在这里。',
  noMatchesTitle: '没有匹配的会话',
  noMatchesDescription: '请调整搜索内容或工作区筛选条件。',
  unarchive: '取消归档',
  restoreAll: '全部取消归档',
  restoring: '正在恢复…',
  restoreFailed: '无法恢复会话，请稍后重试。',
  ungrouped: '未分组',
  dateUnknown: '时间未知',
  countOne: '{n} 个会话',
  countOther: '{n} 个会话',
} satisfies Record<string, string>

/** Archived-session page locale key union. */
export type ArchivedSessionsLocaleKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  nav: 'Archived sessions',
  title: 'Archived sessions',
  description: 'Review hidden conversations and restore them to their original workspaces. Archiving and restoring do not change conversation contents.',
  search: 'Search archived sessions…',
  searchAria: 'Search archived sessions',
  workspaceFilter: 'Filter by workspace',
  allWorkspaces: 'All workspaces',
  loading: 'Reading sessions…',
  emptyTitle: 'No archived sessions',
  emptyDescription: 'Archived conversations will appear here.',
  noMatchesTitle: 'No matching sessions',
  noMatchesDescription: 'Adjust the search or workspace filter.',
  unarchive: 'Unarchive',
  restoreAll: 'Unarchive all',
  restoring: 'Restoring…',
  restoreFailed: 'Could not restore the session. Try again.',
  ungrouped: 'Ungrouped',
  dateUnknown: 'Unknown time',
  countOne: '{n} session',
  countOther: '{n} sessions',
} satisfies Record<ArchivedSessionsLocaleKey, string>
