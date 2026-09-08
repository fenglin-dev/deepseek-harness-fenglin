# Agent Note: 旧版 Session 插件诊断

Status: implemented

[English](2026-09-08-legacy-session-plugin-diagnostics.md) | 中文

## Problem

插件可以成功激活，却在 Agent 回调读取不兼容的 Session 接口时失败。软件包安装成功和 Loader 激活不能证明对话可用。

## Decision

Doctor 和插件清单共用只读风险检查，范围为已启用且声明 Session peer 依赖的外部 bundle。有界扫描识别对 `session.events` 的遍历，报告包内相对证据，绝不执行插件代码。分类器也识别对应的运行时 TypeError。诊断界面说明兼容更新及手动移除，不声称自动隔离。诊断演练中心提供仅供诊断使用、包含已复现源码模式但不会主动执行的 bundle，可在隔离 home 或明确确认的当前 Profile 中验证风险提示；“全部恢复”会移除保留的演练现场。

## Alternatives considered

按包名拉黑会在插件修复后继续阻止使用，并漏掉其他插件。自动隔离文本命中会误判注释、有保护的兼容代码或不同类型的接收对象。启动时调用任意插件回调会引入副作用和延迟。

## Consequences

风险提示不能证明运行时兼容性，不改变健康 Doctor 的退出码，不修改 Profile 文件，也不启动修复或安装。扫描跳过包内源码符号链接、依赖/vendor/测试目录及过大文件，并限制每包与总体源码读取量。压缩后的别名和其他接口差异可能漏检。受控回调复现和隔离目录的已安装包检查属于证据，不等于完整 Windows 界面验证。
