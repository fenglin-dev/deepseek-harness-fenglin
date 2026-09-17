# Agent Note: 通过单一接口封装桌面端 Profile 变更

Status: implemented

[English](2026-09-17-desktop-profile-mutation-module.md) | 中文

## Problem

桌面端 Profile 变更行为分散在 Electron 入口、候选 Profile 准备、事务激活、恢复暂存、Harness 生命周期事件和快照安全机制中。入口文件必须直接协调临时目录、进程环境、就绪门槛、回滚和恢复状态，导致变更调用方依赖事务内部机制，也使保持行为不变的修改难以审查。

## Decision

桌面端通过单一 `DesktopProfileMutation` 接口负责基于候选 Profile 的变更。调用方只描述操作、预期包和回调；回调获得临时 Profile 目录及一组封闭的受支持写命令。该模块统一协调候选准备、激活、Harness 就绪、回滚、恢复候选和快照安全，并以类型化错误表示忙碌、取消、已回滚、需要恢复和外部写入超时等结果。

现有 Profile CLI 继续作为持久化与加锁的权威。`ProfileTransactionManager` 和候选辅助函数保留为模块内部协作者，`PluginSnapshotManager` 继续作为同级安全机制，Market 自有命令不进入此接口，Electron 入口继续负责面向产品的对话框和重启决策。

启动阶段和受管变更共享候选边界，但提供不同的语义方法。启动阶段可以准备一个候选 Profile，以独立安全点保护每次写入并累计多次变更，再由 `finishStartup` 激活候选；受管操作则依次完成准备、写入、激活，并等待普通 Harness 就绪序列后才返回。没有常驻 Harness 时，恢复直接写入活动 Profile；否则使用隔离的恢复候选。

## Alternatives considered

**继续在 Electron 入口中编排。** 未采用，因为每条新增变更路径仍会重复候选、就绪、回滚和恢复规则。

**向调用方暴露事务管理器和候选原语。** 未采用，因为这只会移动文件而不会形成更深的模块，调用方仍需理解内部生命周期顺序。

**把所有 Profile 写入都纳入新接口。** 未采用，因为 CLI 事务协议、Market 命令和用户快照恢复具有不同的职责与确认语义。

## Consequences

Electron 入口现在通过更小的语义接口委托桌面端自有候选变更，不再保存候选或恢复事务状态。接口测试覆盖受管提交、启动中止、类型化回滚和直接恢复行为；现有底层故障注入测试会保留，直到接口层具备等价覆盖。此次抽取保持现有行为，不改变已发布的 Profile 格式或 CLI 命令。
