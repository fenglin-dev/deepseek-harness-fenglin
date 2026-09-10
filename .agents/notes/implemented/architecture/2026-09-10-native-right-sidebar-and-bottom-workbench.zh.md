# Agent Note: 原生右侧栏与独立底部工作台

Status: implemented

[English](2026-09-10-native-right-sidebar-and-bottom-workbench.md) | 中文

## Problem

上游客户端和 Better Sidebar 过去都提供了相互重叠的右侧界面。完整保留两套实现会产生重复页签、相互竞争的布局状态和脆弱的全视口 CSS；完全移除 Better Sidebar 又会失去仍有价值的底部终端与工作台。

## Decision

上游 `@deepseek-ai/dsh-client-ui-sidebar-right` 包是右侧栏的唯一所有者。布局采用上游全局主面板，Conversation 界面注册为 `main.conversation`，使面板导航与右侧栏可见性共享上游状态模型。

内置 Better Sidebar 0.19.0 通过官方右侧栏服务贡献兼容的右侧内容，只独立拥有底部工作台。桌面客户端不扫描或重写插件 DOM，不增加插件专属标题栏 CSS，也不挂载第二个右侧栏容器。

社区扩展与这一所有权边界保持正交：Session 操作、插件发现、设置导航操作和桌面命令继续通过各自现有的插槽与服务注册。

## Alternatives considered

**完整保留两套侧栏。** 这能保留所有历史实现，但会让同一区域存在两个所有者，并使响应式行为取决于插件加载顺序。

**移除 Better Sidebar。** 官方侧栏能更清晰地覆盖右侧体验，但会一并失去具有独立价值的底部终端与工作台。

**用桌面专属 CSS 修补 Better Sidebar。** 这只能隐藏个别冲突，其他全视口插件仍需重复修补，无法建立唯一的布局所有权。

## Consequences

应用只展示一个官方右侧栏和一个 Better Sidebar 底部工作台。Better Sidebar 必须使用与上游侧栏 API 兼容的版本；其内置归档继续固定版本并校验完整性。其他插件可以扩展官方侧栏而无需理解桌面标题栏几何，底部面板行为也与右侧栏选择和导航相互隔离。
