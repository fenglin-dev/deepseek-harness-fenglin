/** Permission policy for the supervised Harness renderer. */

const CLIPBOARD_WRITE_PERMISSION = 'clipboard-sanitized-write'

const PROMPTABLE_PERMISSIONS = new Set([
  'ar', 'automatic-fullscreen', 'background-fetch', 'background-sync',
  'captured-surface-control', 'clipboard-read', 'deprecated-sync-clipboard-read',
  'display-capture', 'fileSystem', 'fullscreen', 'geolocation', 'geolocation-approximate',
  'hand-tracking', 'hid', 'idle-detection', 'keyboardLock', 'local-fonts',
  'local-network', 'local-network-access', 'loopback-network', 'media', 'mediaKeySystem',
  'midi', 'midiSysex', 'nfc', 'notifications', 'payment-handler',
  'periodic-background-sync', 'persistent-storage', 'pointerLock', 'screen-wake-lock',
  'sensors', 'serial', 'smart-card', 'speaker-selection', 'storage-access',
  'system-wake-lock', 'top-level-storage-access', 'usb', 'vr',
  'web-app-installation', 'web-printing', 'window-management',
])

export interface HarnessPermissionDetails {
  readonly mediaType?: 'video' | 'audio' | 'unknown'
  readonly mediaTypes?: readonly ('video' | 'audio')[]
}

/** Permissions intentionally handled outside this policy remain fail-closed. */
export function isPromptableHarnessPermission(permission: string): boolean {
  return PROMPTABLE_PERMISSIONS.has(permission)
}

/** Sanitized clipboard writes preserve the existing no-dialog copy UX. */
export function isSilentHarnessPermission(permission: string): boolean {
  return permission === CLIPBOARD_WRITE_PERMISSION
}

/**
 * Decide whether one renderer permission request is allowed.
 *
 * Promptable capabilities are admitted only from the main frame at the exact
 * supervised Harness origin. The caller still owns user consent; this function
 * never grants a promptable capability by itself.
 *
 * @param permission Electron permission name.
 * @param requestingUrl URL loaded by the requesting frame.
 * @param trustedOrigin Exact loopback origin selected by Harness readiness.
 * @param isMainFrame Whether the requesting frame is the top-level renderer.
 * @returns Whether the request may proceed to silent handling or user consent.
 */
export function isTrustedHarnessPermissionRequest(
  permission: string,
  requestingUrl: string | undefined,
  trustedOrigin: string | undefined,
  isMainFrame: boolean,
): boolean {
  if (
    (!isSilentHarnessPermission(permission) && !isPromptableHarnessPermission(permission))
    || requestingUrl === undefined
    || trustedOrigin === undefined
    // Chromium reports false for every File System Access permission check.
    || (!isMainFrame && permission !== 'fileSystem')
  ) return false

  try {
    return new URL(requestingUrl).origin === trustedOrigin
  } catch {
    return false
  }
}

/** Stable, least-privilege keys used for in-memory grants during one renderer run. */
export function harnessPermissionDecisionKeys(
  permission: string,
  details: HarnessPermissionDetails = {},
): readonly string[] {
  if (permission !== 'media') return [permission]
  const mediaTypes = details.mediaTypes ?? (details.mediaType === undefined ? [] : [details.mediaType])
  const known = [...new Set(mediaTypes.filter(type => type === 'audio' || type === 'video'))].sort()
  // Older Chromium request details may omit mediaTypes. In that case the dialog
  // explicitly names both capabilities before granting either one.
  return (known.length === 0 ? ['audio', 'video'] : known).map(type => `media:${type}`)
}

const ENGLISH_PERMISSION_NAMES: Readonly<Record<string, string>> = {
  ar: 'use augmented reality',
  'automatic-fullscreen': 'enter full screen automatically',
  'background-fetch': 'download data in the background',
  'background-sync': 'synchronize data in the background',
  'captured-surface-control': 'control a captured surface',
  'clipboard-read': 'read the clipboard',
  'deprecated-sync-clipboard-read': 'read the clipboard',
  'display-capture': 'share or record the screen',
  fileSystem: 'access a local file or folder',
  fullscreen: 'enter full screen',
  geolocation: 'access your location',
  'geolocation-approximate': 'access your approximate location',
  'hand-tracking': 'access hand-tracking data',
  hid: 'connect to a HID device',
  'idle-detection': 'detect whether you are away',
  keyboardLock: 'capture keyboard input',
  'local-fonts': 'read locally installed fonts',
  'local-network': 'access devices on your local network',
  'local-network-access': 'access devices on your local network',
  'loopback-network': 'access local services on this computer',
  mediaKeySystem: 'use protected media playback',
  midi: 'connect to a MIDI device',
  midiSysex: 'send MIDI system-exclusive messages',
  nfc: 'access NFC tags',
  notifications: 'show system notifications',
  'payment-handler': 'handle payment requests',
  'periodic-background-sync': 'synchronize data periodically in the background',
  'persistent-storage': 'keep local site data from being removed automatically',
  pointerLock: 'lock the pointer',
  'screen-wake-lock': 'keep the screen awake',
  sensors: 'access device sensors',
  serial: 'connect to a serial device',
  'smart-card': 'connect to a smart card reader',
  'speaker-selection': 'select an audio output device',
  'storage-access': 'access cross-site storage',
  'system-wake-lock': 'keep the system awake',
  'top-level-storage-access': 'access top-level site storage',
  usb: 'connect to a USB device',
  vr: 'use virtual reality',
  'web-app-installation': 'install a web application',
  'web-printing': 'access printers',
  'window-management': 'manage application windows',
}

const CHINESE_PERMISSION_NAMES: Readonly<Record<string, string>> = {
  ar: '使用增强现实',
  'automatic-fullscreen': '自动进入全屏',
  'background-fetch': '在后台下载数据',
  'background-sync': '在后台同步数据',
  'captured-surface-control': '控制已捕获的画面',
  'clipboard-read': '读取剪贴板',
  'deprecated-sync-clipboard-read': '读取剪贴板',
  'display-capture': '共享或录制屏幕',
  fileSystem: '访问本地文件或文件夹',
  fullscreen: '进入全屏',
  geolocation: '获取位置信息',
  'geolocation-approximate': '获取大致位置信息',
  'hand-tracking': '获取手部追踪数据',
  hid: '连接 HID 设备',
  'idle-detection': '检测你是否离开设备',
  keyboardLock: '捕获键盘输入',
  'local-fonts': '读取本机字体',
  'local-network': '访问局域网设备',
  'local-network-access': '访问局域网设备',
  'loopback-network': '访问本机服务',
  mediaKeySystem: '播放受保护媒体',
  midi: '连接 MIDI 设备',
  midiSysex: '发送 MIDI 系统专用消息',
  nfc: '访问 NFC 标签',
  notifications: '发送系统通知',
  'payment-handler': '处理支付请求',
  'periodic-background-sync': '定期在后台同步数据',
  'persistent-storage': '保留本地站点数据不被自动清理',
  pointerLock: '锁定鼠标指针',
  'screen-wake-lock': '保持屏幕常亮',
  sensors: '读取设备传感器',
  serial: '连接串口设备',
  'smart-card': '连接智能卡读卡器',
  'speaker-selection': '选择音频输出设备',
  'storage-access': '访问跨站存储',
  'system-wake-lock': '阻止系统休眠',
  'top-level-storage-access': '访问顶层站点存储',
  usb: '连接 USB 设备',
  vr: '使用虚拟现实',
  'web-app-installation': '安装 Web 应用',
  'web-printing': '访问打印机',
  'window-management': '管理应用窗口',
}

/** Human-readable capability name for the native consent dialog. */
export function harnessPermissionName(
  permission: string,
  details: HarnessPermissionDetails,
  language: 'zh' | 'en',
): string {
  if (permission === 'media') {
    const keys = harnessPermissionDecisionKeys(permission, details)
    if (language === 'zh') {
      if (keys.length === 1 && keys[0] === 'media:audio') return '使用麦克风'
      if (keys.length === 1 && keys[0] === 'media:video') return '使用摄像头'
      return '使用麦克风和摄像头'
    }
    if (keys.length === 1 && keys[0] === 'media:audio') return 'use the microphone'
    if (keys.length === 1 && keys[0] === 'media:video') return 'use the camera'
    return 'use the microphone and camera'
  }
  const names = language === 'zh' ? CHINESE_PERMISSION_NAMES : ENGLISH_PERMISSION_NAMES
  return names[permission] ?? (language === 'zh' ? '使用此系统能力' : 'use this system capability')
}
