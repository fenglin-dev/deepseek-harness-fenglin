# Fenglin rebuild-v2 — exclusive overlay checklist

Baseline: upstream/master @ 680c129b3a (NAS included).
Worktree: D:\10140\deepseek-harness-v2-wt-clean branch fenglin/rebuild-v2
Rule: never mass-disable web-all UI rows; pet defaults via settings.yaml only.

## 1. Branding (帮助页 / 图标 / 版本)
- root + desktop package.json version **3.0.0**
- desktop homepage → fenglin-dev/deepseek-harness-fenglin
- main.ts help URLs → fenglin repo
- application-menu About → 由枫林维护的独立版
- release-checker / release-downloader → fenglin GitHub
- build/icon.ico + src/icon.png → whale-girl
- electron-builder win.icon: build/icon.ico

## 2. Update detect (检查下载更新)
- RELEASES_ENDPOINT / URL_PREFIX → fenglin repo
- proxy auto-detect + CNB/mirror slow fallback (from rebuild release-downloader)

## 3. Windows runtime
- process-control.js stub + prepare-windows-runtime overlay
- nas-protocol in electron-builder files + desktop deps (cordis, http-proxy, nas-protocol)
- tsconfig.host.json += vendor/hmr
- pnpm-workspace: drop unused @electron/osx-sign patch
- external-tool manifest desktopVersion 3.0.0 + browser fallback pins 0.1.6-alpha.1
- Node 24.21.0; smoke continue-on-error

## 4. Desktop interaction
- main.ts case 'reload' → mainSurface.renderer.reload()
- InputBar visible paperclip
- community-locales empty (zh/en only)

## 5. Plugins (三个 + 梁神)
Bundled: @linxin666/dsh-web-all, @linxin666/dsh-liangshen, dsh-music-huazai, dsh-whale-widget-bowl
- prepare-prebuilt writes:
  - cordis.patch.yml: enable liangshen + ssh + plugin-manager ONLY
  - settings.yaml: pet.enabled=false (not loader disable)
  - fenglin-ui-guard.yml: re-enable UI rows after user patch
- launch.ts: web ... --patch DSH_HOME/fenglin-ui-guard.yml
- preset agent.cordis.yml: workflow-worker-thread + tool-ralph disabled:true
- lever client: resolve current→blank→mainView; no return null on missing; RPC result optimistic
- do NOT rewrite plugin-bundle cordis.patch.yml

## 6. NAS
- keep upstream as-is; only ensure deps packed

## Forbidden
- mass-disable web-all children
- github: music install path without proxy (ship local tgz)
- editing web-all node_modules cordis.patch.yml in prepare script
