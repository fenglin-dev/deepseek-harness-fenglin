# Agent Note: 由渲染器投影拥有 Desktop 下载设置

Status: implemented

[English](2026-09-17-desktop-settings-projection.md) | 中文

## Problem

Desktop 下载设置组件同时拥有 preload 订阅、初始加载、已保存值、可编辑草稿、临时密码、操作状态、错误和持久化调用。因此展示代码既要理解表单渲染，也要理解传输协调；测试必须构造完整 bridge，其他设置界面也无法复用同一状态而不重复生命周期。

## Decision

`DownloadNetworkProjection` 是下载网络设置在渲染器中的所有者。它订阅主进程发布，加载初始设置和测试状态，分离已保存值与草稿，只在内存中保留临时密码输入，按目标管理保存和重置状态，运行有界测试，并通过 external-store 接口发布不可变快照。

`DesktopShellController` 在 capability 可用时创建、启动并释放该投影。React 设置组件通过 `useSyncExternalStore` 消费快照，并发出具有语义的编辑、保存、重置和测试意图；它不再接收原始下载网络 bridge。Release 来源重试也先把设置变更委托给投影，再刷新 Release 状态。

## Alternatives considered

**保留 React 本地状态，只抽取辅助函数。** 拒绝，因为订阅、异步持久化和错误归属仍会留在视图中。

**把所有下载字段加入现有 shell 快照。** 拒绝，因为下载设置有独立生命周期和草稿模型；放入宽泛的 shell 快照会让无关的更新界面也观察表单编辑。

**创建通用设置表单 store。** 拒绝，因为当前没有第二个消费者需要这层抽象，而且凭据草稿与目标专用 patch 具有明确语义。

## Consequences

设置视图现在只依赖一个内聚投影和语义意图。订阅标识稳定，渲染所需派生状态直接来自不可变快照，传输 fixture 被移到投影测试。新增所有者具有明确的 start 和 dispose 生命周期；在 `DesktopShellController` 之外构造它的调用方必须同时调用这两个方法。
