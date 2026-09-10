import { describe, expect, it } from 'vitest'
import { trayMessages } from '../src/locales/shell.ts'

describe('desktop tray locales', () => {
  it.each([
    ['zh-CN', '打开窗口'], ['ja-JP', 'ウインドウを開く'], ['ko-KR', '창 열기'],
    ['es-ES', 'Abrir ventana'], ['fr-FR', 'Ouvrir la fenêtre'], ['de-DE', 'Fenster öffnen'],
    ['pt-BR', 'Abrir janela'], ['ru-RU', 'Открыть окно'],
  ])('uses the active desktop language for %s', (locale, openLabel) => {
    expect(trayMessages(locale).open).toBe(openLabel)
  })

  it('falls back to English for an unsupported language', () => {
    expect(trayMessages('it-IT').open).toBe('Open Window')
  })
})
