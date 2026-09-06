# Agent Note: 将桌面系统代理传递给受管 Harness 进程

Status: implemented

[English](2026-08-26-desktop-system-proxy-inheritance.md) | 中文

## 问题

Electron 会自动使用操作系统代理，但由桌面端拥有的 Harness 进程及其受管产品 subagent 只继承进程环境变量。因此，用户可以通过系统代理加载桌面 UI，而包内 Codex app-server 仍会尝试直接建立 WebSocket 连接，反复超时后才回退到较慢的传输方式。此时已安装的 Codex 包和原生平台载荷都是健康的，重新安装连接插件无法修复这种网络配置不一致。

## 决策

Electron 就绪后，桌面宿主解析 ChatGPT Codex 端点。[仅限 Codex 的作用范围决策](2026-09-03-desktop-codex-proxy-scope.zh.md)将该路由限定到官方 Provider 的运行时环境，并加入回环绕过，而不是作用于整个 Harness 环境。已发布的连接插件无需修改源码，也不改写用户的 Codex 配置。

显式代理环境变量始终优先。直接路由、不受支持的代理路由、格式错误的结果或解析失败都会保持进程环境不变。宿主只记录是否启用了系统代理继承，绝不记录解析到的代理地址。

## 曾考虑的替代方案

**修改已发布的 Codex 连接插件。** 桌面端会从 npm 安装官方包，无法替换已经发布的 DeepSeek scope 版本。后续连接插件可以启用 Codex 原生系统代理功能，但这无法修复现有安装。

**把系统代理复制到 `~/.codex/config.toml`。** 这会让桌面端成为原生 Codex 配置的第二责任方，并可能覆盖 Codex CLI 与 Codex 应用共同使用的设置。

**禁用 WebSocket 传输。** HTTPS 回退可以避开反复握手延迟，但会放弃产品首选传输方式，也不能让其他受管网络客户端采用桌面端的网络路由。

## 后果

系统路由可用时，Codex 接收基于端点解析的结果；显式部署或 Provider 代理变量仍优先。插件安装保留自身 pnpm 与 Git 配置。单一代理 URL 不能表达全部 PAC 目标规则；此集成不声称具备完整 PAC 支持，也不代表已验证所有平台的连通性。
