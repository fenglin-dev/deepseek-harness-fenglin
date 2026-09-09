/** Complete copy for the desktop data directory chooser. */
import { desktopDictionary, type DesktopLocaleId } from '../desktop-locale.ts'
import { additionalDataHomeLocales } from './data-home-extra.ts'
type DataHomeMode = 'imported' | 'reused' | 'fresh'

export interface DetailCopy {
  title: string
  risk?: string
  location: string
  sharing: string
  plugins: string
  builds: string
}

const zh = {
  windowTitle: '选择数据目录', languageLabel: '语言', importTitle: '导入到独立环境', recommended: '推荐',
  importSummary: '复制用户数据和插件清单，进入后可选择恢复插件。', reuseTitle: '直接使用此配置',
  reuseSummary: '与所选目录共享设置、凭据、会话和插件。', freshTitle: '全新开始',
  freshSummary: '不导入任何现有数据。', locationLabel: '数据位置', sharingLabel: '共享范围',
  pluginsLabel: '已有插件', buildsLabel: '构建权限', compare: '查看完整对比', back: '上一步',
  continue: '继续', comparisonTitle: '这三个选项有什么区别？', suitableLabel: '适合谁',
  compareImportLocation: '将所选目录中的设置、凭据、会话、Skills 等用户数据复制到桌面版独立目录。', compareReuseLocation: '直接使用所选 DSH 配置目录。',
  compareFreshLocation: '创建新的桌面版独立目录。', compareImportSharing: '不共享；复制后互不影响。',
  compareReuseSharing: '共享；两端修改会互相影响。', compareFreshSharing: '不共享任何既有数据。',
  compareImportPlugins: '复制安全的插件恢复清单但不复制 Profile 或运行时；进入后可选择联网重新安装。', compareReusePlugins: '直接使用所选目录中已有插件。',
  compareFreshPlugins: '从空白 Profile 开始，只安装预置项。', compareImportSuitable: '希望保留数据，同时隔离桌面版的用户。',
  compareReuseSuitable: '希望桌面版与所选 DSH 配置始终一致的用户。', compareFreshSuitable: '希望完全从零配置的用户。',
  comparisonNote: '“导入”一次性复制用户数据、插件清单与精确构建许可，恢复后仍使用独立 Profile；只有“直接使用”会持续共享所选插件环境。',
  acknowledge: '知道了', helpLabel: '查看三个选项的区别', closeLabel: '关闭', modeGroupLabel: '数据目录模式',
  sourceDetected: '已检测到 DSH 配置', sourceCustom: '已选择其他 DSH 配置', sourceMissing: '未在默认位置检测到 DSH 配置',
  sourceUnreadable: '无法读取默认 DSH 配置目录', sourceReadySummary: '该目录包含受支持的 DSH 数据。',
  sourceMissingSummary: '如果你使用其他数据目录，可以手动选择。', sourceUnreadableSummary: '你可以重新选择一个可读取的配置目录，或全新开始。',
  chooseSource: '选择已有配置目录', changeSource: '选择其他目录', restoreDefaultSource: '恢复默认目录',
  sourceRequired: '需要先选择已有配置目录。', sourceInvalid: '这里不像有效的 DSH 配置目录，请重新选择。',
  sourceReadFailed: '无法读取此目录，请检查权限后重试。',
  simulateMissingSource: '开发：模拟未找到配置', restoreDetectedSource: '开发：恢复真实检测',
  destinationTitle: '选择配置目录', destinationSummary: '决定桌面版将把独立配置保存在哪里。来源目录不会被修改。',
  defaultTargetTitle: '默认设置', defaultTargetSummary: '使用桌面版管理的独立目录，升级和修复时最省心。',
  customTargetTitle: '自定义配置目录', customTargetSummary: '选择一个空文件夹作为此客户端的独立配置目录。',
  chooseTarget: '选择空文件夹', changeTarget: '更换文件夹', targetRequired: '请先选择一个空文件夹。',
  targetNotEmpty: '所选文件夹不是空的，请选择或新建空文件夹。', targetUnreadable: '无法读取所选文件夹，请检查权限。',
  targetOverlap: '配置目录不能位于导入来源内部，也不能包含导入来源。',
  targetGroupLabel: '配置目录位置',
}

const en: typeof zh = {
  windowTitle: 'Choose data directory', languageLabel: 'Language', importTitle: 'Import into an independent environment', recommended: 'Recommended',
  importSummary: 'Copy user data and the plugin list, then choose which plugins to restore.', reuseTitle: 'Use this configuration directly',
  reuseSummary: 'Share settings, credentials, sessions, and plugins with the selected directory.', freshTitle: 'Start fresh',
  freshSummary: 'Do not import any existing data.', locationLabel: 'Data location', sharingLabel: 'Sharing',
  pluginsLabel: 'Existing plugins', buildsLabel: 'Build approvals', compare: 'View full comparison', back: 'Back',
  continue: 'Continue', comparisonTitle: 'How do these options differ?', suitableLabel: 'Best for',
  compareImportLocation: 'Copy user settings, credentials, sessions, Skills, and other supported data from the selected directory into an independent desktop directory.', compareReuseLocation: 'Use the selected DSH configuration directory directly.',
  compareFreshLocation: 'Create a new independent desktop directory.', compareImportSharing: 'Not shared; each side changes independently.',
  compareReuseSharing: 'Shared; changes on either side affect the other.', compareFreshSharing: 'No existing data is shared.',
  compareImportPlugins: 'Copy a safe restore list without Profiles or runtimes, then choose plugins to reinstall online.', compareReusePlugins: 'Use plugins already installed in the selected directory.',
  compareFreshPlugins: 'Start with an empty Profile and install only presets.', compareImportSuitable: 'Keep existing data while isolating the desktop app.',
  compareReuseSuitable: 'Keep the desktop app and the selected DSH configuration fully aligned.', compareFreshSuitable: 'Configure everything from scratch.',
  comparisonNote: 'Import copies user data, a plugin list, and exact build rules once while keeping an independent Profile. Only direct use continuously shares the selected plugin environment.',
  acknowledge: 'Got it', helpLabel: 'Compare the three options', closeLabel: 'Close', modeGroupLabel: 'Data directory mode',
  sourceDetected: 'DSH configuration detected', sourceCustom: 'Another DSH configuration selected', sourceMissing: 'No DSH configuration found in the default location',
  sourceUnreadable: 'The default DSH configuration directory cannot be read', sourceReadySummary: 'This directory contains supported DSH data.',
  sourceMissingSummary: 'If you use another data directory, you can select it manually.', sourceUnreadableSummary: 'Choose a readable configuration directory or start fresh.',
  chooseSource: 'Choose existing configuration', changeSource: 'Choose another directory', restoreDefaultSource: 'Restore default directory',
  sourceRequired: 'Choose an existing configuration directory first.', sourceInvalid: 'This does not look like a valid DSH configuration directory. Choose another directory.',
  sourceReadFailed: 'This directory cannot be read. Check its permissions and try again.',
  simulateMissingSource: 'Dev: simulate missing config', restoreDetectedSource: 'Dev: restore detected config',
  destinationTitle: 'Choose configuration location', destinationSummary: 'Choose where Desktop keeps its independent configuration. The source directory is left unchanged.',
  defaultTargetTitle: 'Default location', defaultTargetSummary: 'Use the desktop-managed independent directory for the simplest upgrades and repairs.',
  customTargetTitle: 'Custom configuration directory', customTargetSummary: 'Choose an empty folder for this client\'s independent configuration.',
  chooseTarget: 'Choose empty folder', changeTarget: 'Change folder', targetRequired: 'Choose an empty folder first.',
  targetNotEmpty: 'The selected folder is not empty. Choose or create an empty folder.', targetUnreadable: 'The selected folder cannot be read. Check its permissions.',
  targetOverlap: 'The configuration directory cannot be inside the import source or contain it.',
  targetGroupLabel: 'Configuration location',
}

const details: Record<'zh' | 'en', Record<DataHomeMode, DetailCopy>> = {
  zh: {
    imported: {
      title: zh.importTitle,
      location: '将所选配置复制到桌面版独立数据目录，原目录保持不变。',
      sharing: '复制完成后不共享；桌面版与来源目录的后续修改互不影响。',
      plugins: '复制插件恢复清单但不复制 Profile、node_modules 或锁文件；进入后可选择重新安装，预置同名项不会重复安装。',
      builds: '导入经过验证的精确 allowBuilds 布尔规则并与独立 Profile 合并；任何明确 false 都不会被放宽。',
    },
    reused: {
      title: zh.reuseTitle,
      risk: '桌面版与所选目录的修改会互相影响，包括凭据、会话和插件。',
      location: '直接使用所选目录，不创建第二份 Harness 配置。',
      sharing: '共享设置、凭据、会话、Agent 预设、Skills、Profile 和插件。',
      plugins: '保留当前版本；同名、npm alias 或同 GitHub 仓库与子路径不重复安装。',
      builds: '与现有 allowBuilds 取并集，用户明确设置的 false 不会被覆盖。',
    },
    fresh: {
      title: zh.freshTitle,
      location: '创建空白的桌面版独立数据目录。',
      sharing: '不读取或修改任何已有 DSH 配置。',
      plugins: '从空白 Profile 开始，只核对桌面版预置插件。',
      builds: '仅加入预置插件经过审核且确实需要的构建许可。',
    },
  },
  en: {
    imported: {
      title: en.importTitle,
      location: 'Copy into the desktop-owned data directory while leaving the selected source unchanged.',
      sharing: 'Nothing stays shared after copying; later changes in Desktop and the source remain independent.',
      plugins: 'Copy a plugin restore list without Profiles, node_modules, or lockfiles. Choose what to reinstall after entry; matching presets are not duplicated.',
      builds: 'Merge validated exact allowBuilds booleans into the independent Profile. Every explicit false remains denied.',
    },
    reused: {
      title: en.reuseTitle,
      risk: 'Desktop and the selected directory affect each other, including credentials, sessions, and plugins.',
      location: 'Use the selected directory directly without creating a second Harness configuration.',
      sharing: 'Share settings, credentials, sessions, Agent presets, Skills, Profiles, and plugins.',
      plugins: 'Keep current versions; matching names, npm aliases, or GitHub repository subpaths are not installed twice.',
      builds: 'Merge with existing allowBuilds while preserving every explicit false rule.',
    },
    fresh: {
      title: en.freshTitle,
      location: 'Create an empty desktop-owned data directory.',
      sharing: 'Do not read or modify any existing DSH configuration.',
      plugins: 'Start from an empty Profile and reconcile only desktop presets.',
      builds: 'Add only reviewed lifecycle approvals required by desktop presets.',
    },
  },
}

export type DataHomeCopy = { readonly [Key in keyof typeof en]: string }
export type DataHomeDetails = Record<DataHomeMode, DetailCopy>

const copyDictionaries = {
  zh,
  en,
  ...Object.fromEntries(Object.entries(additionalDataHomeLocales).map(([id, value]) => [id, value.copy])),
}

export const copyFor = (locale: DesktopLocaleId): DataHomeCopy => desktopDictionary(locale, copyDictionaries)
export const detailsFor = (locale: DesktopLocaleId): Record<DataHomeMode, DetailCopy> => desktopDictionary(locale, {
  zh: details.zh,
  en: details.en,
  ...Object.fromEntries(Object.entries(additionalDataHomeLocales).map(([id, value]) => [id, value.details])),
})
