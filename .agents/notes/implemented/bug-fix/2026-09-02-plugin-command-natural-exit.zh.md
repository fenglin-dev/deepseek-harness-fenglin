# Agent Note: 插件命令自然退出

Status: implemented

[English](2026-09-02-plugin-command-natural-exit.md) | 中文

## 问题

Windows 打包已完成插件安装，但 CLI 随后因 libuv 的 `UV_HANDLE_CLOSING` 断言而中止。插件分发器调用 `process.exit()`，在句柄可能仍活动时强制进行原生资源拆卸。

## 决策

插件分发器将执行结果赋给 `process.exitCode`，让 Node 完成事件循环。成功、诊断和失败退出码保持不变；安装检查仍拒绝非零结果。

## 考虑过的替代方案

重试断言或忽略原生退出码可能接受损坏的运行时。更换内置 Node 版本会扩大验证范围。自然退出消除了强制拆卸，无需采用这两种折中。

## 影响

意外保留的引用句柄可能让 CLI 无法退出，必须由其所有者修复。源码启动测试观察 `beforeExit` 并核对成功和失败退出码；原生 Windows 打包验证真实插件安装及安装后应用启动。
