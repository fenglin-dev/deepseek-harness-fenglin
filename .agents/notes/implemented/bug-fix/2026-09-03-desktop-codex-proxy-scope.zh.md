# Agent Note: 将桌面系统代理限定到 Codex

Status: implemented

[English](2026-09-03-desktop-codex-proxy-scope.md) | 中文

## 问题

系统 PAC 可以为 ChatGPT、npm 元数据、包归档和 Git 选择不同路由。把 ChatGPT 路由复制到整个 Harness 环境，会在未检查目标的情况下改变插件安装流量。用户报告的 Windows pnpm 超时促成了这次检查，但报告尚不能证明路由错用就是其根因。

## 决策

本决策替代[系统代理继承记录](2026-08-26-desktop-system-proxy-inheritance.zh.md)中的全进程作用范围。Electron 在三秒期限内解析 ChatGPT 端点，通过 `DSH_DESKTOP_CODEX_PROXY` 传递结果，不改变通用代理变量。位于前面的 `DIRECT` 会结束路由选择。解析错误或超时保持父环境不变；日志省略解析器详情和地址。

CLI 只通过官方 Provider 已有的 `config.env`，将此路由应用到 `@deepseek-ai/dsh-subagent-codex` 条目。启动和 Patch 热重载都会在 Profile 合成后重新计算默认值。父环境或 Provider 显式设置的代理优先，不受键名大小写影响。其他 Provider 配置与回环绕过规则保持有效。不改写 Profile、pnpm、Git 或 Codex 配置文件。

共用 Profile 包管理器运行器会根据错误码追加超时、DNS、鉴权、TLS 或连接提示以及耗时。新增提示不复制原始 URL 或环境变量值，并区分显式环境配置和未经确认的实际路由。原始 pnpm 输出仍会保留，分享前可能需要脱敏。

## 曾考虑的替代方案

**移除 pnpm dispatcher。** 这会同时改变代理选择、自定义证书和连接行为，因此临时绕过成功不能单独证明库缺陷。内置 pnpm 实现保持不变。

**只解析一次 npm registry 并用于所有安装。** 归档和 Git 目标可能不同于 registry，这会重复同样的 PAC 路由错误。

**实现逐请求 PAC 桥接。** 这需要独立处理代理故障转移、鉴权、绕过规则及所有下载器。本次有意将自动路由限定到 Codex；插件安装保留 pnpm 和 Git 自身的配置。

## 后果

[便携 A/B 运行器](../../../../apps/desktop/scripts/proxy-ab/benchmark.mjs)使用同一个 pnpm 程序测量两种环境策略。可控错误路由场景会观察实际代理与 registry 请求，独立联网模式则探测固定公开 npm 包。每次尝试隔离冷缓存 store，并独立预热，避免缓存顺序偏差。报告区分请求失败、已校验安装、成功配对耗时及清理结果；模拟成功率提升不能当成互联网加速证据。Windows 包装脚本接收明确运行时路径，不修改安装包。

插件操作不会继承自动选择的 ChatGPT 代理。需要让 pnpm 使用代理的用户须显式配置。这不是完整 PAC 支持：Codex 仍接收基于单一端点的路由，系统代理设置改变后需要重启桌面端。

测试覆盖真实 Patch 合成、显式覆盖与重载、目标隔离、直连路由、解析失败与期限、脱敏提示及失败的包管理器子进程。原生 Windows 超时复现，以及认证代理、私有 CA、SOCKS 和 Codex 端到端连通性仍需人工验证；这些测试通过不代表用户的 Windows 问题已经解决。
