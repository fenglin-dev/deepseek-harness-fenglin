/**
 * `sidebarRight` namespace dictionaries.
 *
 * Everything a user reads in this column is here, including the strings handed
 * to the docking kit — the kit renders no copy of its own, so its whole
 * vocabulary is this package's to own and translate.
 */

/** Simplified Chinese dictionary and key-set source of truth. */
export const zh = {
  'chrome.expand': '展开侧栏',
  'chrome.collapse': '收起侧栏',
  'chrome.toFullscreen': '全屏显示侧栏',
  'chrome.exitFullscreen': '退出侧栏全屏',
  'dock.emptyPane': '空面板',
  'dock.splitPane': '向右分栏',
  'dock.splitPaneDisabled': '已达两格上限',
  'dock.splitPaneNarrow': '栏宽不足，拖宽侧栏后再分栏',
  'dock.closeTab': '关闭',
  'dock.addTab': '新标签页',
  'dock.dockFloat': '收回到侧栏',
  'dock.closeFloat': '关闭',
  'tab.guide.title': '开始',
  'tab.unavailable': '这类内容还没有可用的查看方式。',
  'guide.lead': '侧栏用来放你想一直看着的东西。',
  'guide.body': '会话里的文件和产物会开在这一栏，也可以从下面的入口打开。',
} satisfies Record<string, string>

/** Right-Sidebar dictionary key union. */
export type SidebarRightKey = keyof typeof zh

/** English dictionary, checked against the Chinese key set. */
export const en = {
  'chrome.expand': 'Open the sidebar',
  'chrome.collapse': 'Close the sidebar',
  'chrome.toFullscreen': 'Show the sidebar fullscreen',
  'chrome.exitFullscreen': 'Exit sidebar fullscreen',
  'dock.emptyPane': 'Empty pane',
  'dock.splitPane': 'Split to the right',
  'dock.splitPaneDisabled': 'Two panes is the limit',
  'dock.splitPaneNarrow': 'Not enough width to split; widen the sidebar',
  'dock.closeTab': 'Close',
  'dock.addTab': 'New tab',
  'dock.dockFloat': 'Send back to the sidebar',
  'dock.closeFloat': 'Close',
  'tab.guide.title': 'Start',
  'tab.unavailable': 'Nothing here can view this kind of content yet.',
  'guide.lead': 'The sidebar holds what you want to keep looking at.',
  'guide.body': 'Files and artifacts from the conversation open in this column; the entries below open more.',
} satisfies Record<SidebarRightKey, string>
