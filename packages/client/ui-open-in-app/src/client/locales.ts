/** `open-in-app` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'open-in-app'

/** Application labels shared verbatim by both dictionaries (product names). */
const PRODUCT_NAMES = {
  'app.cursor': 'Cursor',
  'app.vscode': 'VS Code',
  'app.vscodeinsiders': 'VS Code Insiders',
  'app.windsurf': 'Windsurf',
  'app.zed': 'Zed',
  'app.sublimetext': 'Sublime Text',
  'app.xcode': 'Xcode',
  'app.androidstudio': 'Android Studio',
  'app.intellij': 'IntelliJ IDEA',
  'app.pycharm': 'PyCharm',
  'app.webstorm': 'WebStorm',
  'app.phpstorm': 'PhpStorm',
  'app.goland': 'GoLand',
  'app.rider': 'Rider',
  'app.rustrover': 'RustRover',
  'app.fork': 'Fork',
  'app.sourcetree': 'Sourcetree',
  'app.github': 'GitHub Desktop',
  'app.tower': 'Tower',
  'app.gitkraken': 'GitKraken',
  'app.smartgit': 'SmartGit',
  'app.sublimemerge': 'Sublime Merge',
  'app.ghostty': 'Ghostty',
  'app.warp': 'Warp',
  'app.iterm': 'iTerm2',
  'app.kitty': 'kitty',
  'app.windowsterminal': 'Windows Terminal',
  'app.gitbash': 'Git Bash',
  'app.gnometerminal': 'GNOME Terminal',
  'app.konsole': 'Konsole',
} as const

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'open.title': '在 {app} 中打开工作目录',
  'open.tooltip': '在本地打开',
  'open.error': '打开失败',
  'menu.toggle': '选择打开方式',
  'menu.aria': '打开方式',
  ...PRODUCT_NAMES,
  'app.finder': '访达',
  'app.explorer': '文件资源管理器',
  'app.filemanager': '文件管理器',
  'app.terminal': '终端',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<OpenInAppKey, string> = {
  'open.title': 'Open workspace in {app}',
  'open.tooltip': 'Open locally',
  'open.error': 'Failed to open',
  'menu.toggle': 'Choose an app to open in',
  'menu.aria': 'Open in',
  ...PRODUCT_NAMES,
  'app.finder': 'Finder',
  'app.explorer': 'File Explorer',
  'app.filemanager': 'Files',
  'app.terminal': 'Terminal',
}

/** Key domain of the `open-in-app` namespace (zh is the source of truth). */
export type OpenInAppKey = keyof typeof zh

/** Russian dictionary, key-identical to the Chinese source of truth. */
export const ru: Record<OpenInAppKey, string> = {
  'open.title': 'Открыть рабочую область в {app}',
  'open.tooltip': 'Открыть локально',
  'open.error': 'Не удалось открыть',
  'menu.toggle': 'Выберите приложение для открытия',
  'menu.aria': 'Открыть в',
  ...PRODUCT_NAMES,
  'app.finder': 'Finder',
  'app.explorer': 'Проводник',
  'app.filemanager': 'Файлы',
  'app.terminal': 'Терминал',
}

/** Japanese dictionary. */
export const ja: Record<OpenInAppKey, string> = {
  'open.title': '{app} でワークスペースを開く', 'open.tooltip': 'ローカルで開く', 'open.error': '開けませんでした',
  'menu.toggle': '開くアプリを選択', 'menu.aria': 'アプリで開く', ...PRODUCT_NAMES,
  'app.finder': 'Finder', 'app.explorer': 'エクスプローラー', 'app.filemanager': 'ファイル', 'app.terminal': 'ターミナル',
}

/** Korean dictionary. */
export const ko: Record<OpenInAppKey, string> = {
  'open.title': '{app}에서 작업 공간 열기', 'open.tooltip': '로컬에서 열기', 'open.error': '열지 못했습니다',
  'menu.toggle': '열 앱 선택', 'menu.aria': '다음에서 열기', ...PRODUCT_NAMES,
  'app.finder': 'Finder', 'app.explorer': '파일 탐색기', 'app.filemanager': '파일', 'app.terminal': '터미널',
}

/** Spanish dictionary. */
export const es: Record<OpenInAppKey, string> = {
  'open.title': 'Abrir el espacio de trabajo en {app}', 'open.tooltip': 'Abrir localmente', 'open.error': 'No se pudo abrir',
  'menu.toggle': 'Elegir una aplicación', 'menu.aria': 'Abrir en', ...PRODUCT_NAMES,
  'app.finder': 'Finder', 'app.explorer': 'Explorador de archivos', 'app.filemanager': 'Archivos', 'app.terminal': 'Terminal',
}

/** French dictionary. */
export const fr: Record<OpenInAppKey, string> = {
  'open.title': 'Ouvrir l’espace de travail dans {app}', 'open.tooltip': 'Ouvrir localement', 'open.error': 'Échec de l’ouverture',
  'menu.toggle': 'Choisir une application', 'menu.aria': 'Ouvrir dans', ...PRODUCT_NAMES,
  'app.finder': 'Finder', 'app.explorer': 'Explorateur de fichiers', 'app.filemanager': 'Fichiers', 'app.terminal': 'Terminal',
}

/** German dictionary. */
export const de: Record<OpenInAppKey, string> = {
  'open.title': 'Arbeitsbereich in {app} öffnen', 'open.tooltip': 'Lokal öffnen', 'open.error': 'Öffnen fehlgeschlagen',
  'menu.toggle': 'App zum Öffnen auswählen', 'menu.aria': 'Öffnen mit', ...PRODUCT_NAMES,
  'app.finder': 'Finder', 'app.explorer': 'Datei-Explorer', 'app.filemanager': 'Dateien', 'app.terminal': 'Terminal',
}

/** Brazilian Portuguese dictionary. */
export const ptBR: Record<OpenInAppKey, string> = {
  'open.title': 'Abrir o espaço de trabalho no {app}', 'open.tooltip': 'Abrir localmente', 'open.error': 'Falha ao abrir',
  'menu.toggle': 'Escolher um aplicativo', 'menu.aria': 'Abrir em', ...PRODUCT_NAMES,
  'app.finder': 'Finder', 'app.explorer': 'Explorador de Arquivos', 'app.filemanager': 'Arquivos', 'app.terminal': 'Terminal',
}
