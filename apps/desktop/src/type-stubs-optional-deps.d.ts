// optional desktop deps
declare module 'es-module-lexer' {
  export const init: any
  export function parse(source: string, name?: string): any
}
declare module 'ws' {
  export type RawData = any
  export interface WebSocket {
    on(event: string, listener: (...args: any[]) => void): any
    once(event: string, listener: (...args: any[]) => void): any
    send(data: unknown): void
    close(...args: any[]): void
    readyState: number
    [key: string]: any
  }
  export const WebSocket: any
  export class WebSocketServer { constructor(...args: any[]); [key: string]: any }
  const def: any
  export default def
}
declare module 'electron-updater' {
  export type ProgressInfo = any
  export type UpdateInfo = any
  export type AppUpdater = any
  export const AppUpdater: any
  export const autoUpdater: any
  const x: any
  export default x
}
declare module 'electron-updater/out/electronHttpExecutor.js' {
  export class ElectronHttpExecutor { constructor(...args: any[]); [key: string]: any }
  const x: any
  export default x
}
declare module 'sigstore' { const x: any; export = x }
declare module 'cos-nodejs-sdk-v5' { class COS { constructor(...args: any[]); [key: string]: any }; export = COS }
declare module 'app-builder-lib' {
  export type Packager = any
  export type BeforePackContext = any
  export type Configuration = any
  export type Arch = any
  export const Packager: any
  export const Arch: any
  const x: any
  export = x
}
declare module 'app-builder-lib/out/winPackager.js' { export type WinPackager = any; export const WinPackager: any; const x: any; export = x }
declare module 'app-builder-lib/out/fileMatcher.js' { export const getFileMatchers: any; const x: any; export = x }
declare module 'app-builder-lib/out/asar/asar.js' { export const readAsar: any; export class Node { [k: string]: any }; const x: any; export = x }
declare module 'sharp' { const x: any; export = x }
declare module '@electron/get' { const x: any; export = x }
