/** Tray-menu copy follows the active Harness language rather than the operating-system locale. */
export interface TrayCopy {
  open: string
  openWeb: string
  restart: string
  openLog: string
  launchAtLogin: string
  notifications: string
  quit: string
  logErrorTitle: string
}

const zh: TrayCopy = { open: '打开窗口', openWeb: '在浏览器中打开', restart: '快速重启', openLog: '打开 Harness 日志', launchAtLogin: '开机自启', notifications: '系统通知', quit: '退出', logErrorTitle: '无法打开日志' }
const en: TrayCopy = { open: 'Open Window', openWeb: 'Open in Browser', restart: 'Quick Restart', openLog: 'Open Harness Log', launchAtLogin: 'Launch at Login', notifications: 'Notifications', quit: 'Quit', logErrorTitle: 'Could Not Open Log' }
const ja: TrayCopy = { open: 'ウインドウを開く', openWeb: 'ブラウザで開く', restart: 'クイック再起動', openLog: 'Harness ログを開く', launchAtLogin: 'ログイン時に起動', notifications: 'システム通知', quit: '終了', logErrorTitle: 'ログを開けません' }
const ko: TrayCopy = { open: '창 열기', openWeb: '브라우저에서 열기', restart: '빠른 재시작', openLog: 'Harness 로그 열기', launchAtLogin: '로그인 시 실행', notifications: '시스템 알림', quit: '종료', logErrorTitle: '로그를 열 수 없음' }
const es: TrayCopy = { open: 'Abrir ventana', openWeb: 'Abrir en el navegador', restart: 'Reinicio rápido', openLog: 'Abrir registro de Harness', launchAtLogin: 'Abrir al iniciar sesión', notifications: 'Notificaciones', quit: 'Salir', logErrorTitle: 'No se pudo abrir el registro' }
const fr: TrayCopy = { open: 'Ouvrir la fenêtre', openWeb: 'Ouvrir dans le navigateur', restart: 'Redémarrage rapide', openLog: 'Ouvrir le journal Harness', launchAtLogin: 'Ouvrir à la connexion', notifications: 'Notifications', quit: 'Quitter', logErrorTitle: 'Impossible d’ouvrir le journal' }
const de: TrayCopy = { open: 'Fenster öffnen', openWeb: 'Im Browser öffnen', restart: 'Schnell neu starten', openLog: 'Harness-Protokoll öffnen', launchAtLogin: 'Bei Anmeldung starten', notifications: 'Benachrichtigungen', quit: 'Beenden', logErrorTitle: 'Protokoll konnte nicht geöffnet werden' }
const ptBR: TrayCopy = { open: 'Abrir janela', openWeb: 'Abrir no navegador', restart: 'Reinício rápido', openLog: 'Abrir log do Harness', launchAtLogin: 'Abrir ao iniciar sessão', notifications: 'Notificações', quit: 'Sair', logErrorTitle: 'Não foi possível abrir o log' }
const ru: TrayCopy = { open: 'Открыть окно', openWeb: 'Открыть в браузере', restart: 'Быстрый перезапуск', openLog: 'Открыть журнал Harness', launchAtLogin: 'Запускать при входе', notifications: 'Уведомления', quit: 'Выйти', logErrorTitle: 'Не удалось открыть журнал' }

/** Complete tray dictionaries keyed by every language exposed by Desktop. */
export const trayDictionaries = { zh, en, ja, ko, es, fr, de, 'pt-BR': ptBR, ru } as const
