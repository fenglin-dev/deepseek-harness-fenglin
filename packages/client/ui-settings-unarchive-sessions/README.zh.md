---
description: "dsh Web 客户端的已归档会话设置页：按 Workspace 分组搜索，并提供单项与批量恢复操作。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-unarchive-sessions

[English](README.md) | 中文

## 概述

**已归档会话**设置页用于恢复从 Workspace 导航中隐藏的会话。它按保留的 Workspace 位置分组，并在组内按最近活动排序；用户可以按标题、Session id 或 Workspace 筛选，再执行单项或批量恢复。每次恢复都经由共享的 Workspace 命令，会话内容不会改变。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

打开设置并选择**已归档会话**，即可看到当前从所有分组视图中隐藏的会话。在已提供设置外壳、Workspace 服务与 Session 列表的 Web 组合中挂载 `@deepseek-ai/dsh-client-ui-settings-unarchive-sessions`；该页面注册自己的导航条目，无需配置。

### 阅读一行

每个 Workspace 分组显示其归档数量。每行显示 Session 标题或 id 以及最近已知活动时间；缺少已加载摘要时仍以 id 保留恢复入口。搜索匹配标题或 Session id，Workspace 选择器进一步缩小分组结果。页面等待 Session 与 Workspace 状态后再渲染，并区分归档为空和筛选无匹配。

### 恢复会话

取消归档会把 Session 恢复到其 Workspace 下记录的位置；不属于任何 Workspace 时则恢复到未分组列表。设置页标题栏还提供“全部取消归档”，对当前归档集合依次调用同一操作。只有 Host 返回更新后的归档状态后，对应行才消失；单项或批量调用失败时会保留尚未恢复的行并显示可重试错误。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

页面是 id 为 `archived-sessions` 的一个本地化 `settings.section` 贡献；导航条目、模态框与挂载的分区都归设置外壳所有，不在此包内。

### 注册与数据来源

`apply()` 注册 locale namespace，并贡献一个 `settings.section` 和一个 `settings.action`。分区从 `useWorkspaces` 读取归档集合与 Workspace 位置，从 `useSessions` 读取标题与时间；标题栏操作读取同一归档集合。两处写入都使用由 `ctx.uiWorkspace.unarchiveSession` 支持的 `unarchive` 回调。

### 行的派生

行从完整归档集合派生。Workspace 归属来自各 Workspace 保留的 `sessionIds`；不属于任何 Workspace 的成员显示在未分组分组中。已加载摘要提供显示标题和时间，摘要缺失时回退到持久 Session id，因此仍可恢复。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | 宿主 loader 入口：该页面仅供浏览器使用，因此插件体为空 |
| [`src/client/index.ts`](src/client/index.ts) | 浏览器插件：locale namespace、分区注册、注入的取消归档操作 |
| [`src/client/ArchivedSessionsSection.tsx`](src/client/ArchivedSessionsSection.tsx) | 页面组件：分组、搜索、Workspace 筛选、每行的取消归档 |
| [`src/client/ArchivedSessionsAction.tsx`](src/client/ArchivedSessionsAction.tsx) | 设置标题栏批量恢复操作 |
| [`src/client/locales.ts`](src/client/locales.ts) | 全部可见与无障碍字符串的中英文字典 |
| [`src/client/ArchivedSessionsSection.module.css`](src/client/ArchivedSessionsSection.module.css) | 页面样式 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

以下页面覆盖承载该页面的设置界面、其背后的归档写入，以及它所渲染的状态。

- [ui-settings](../ui-settings/README.zh.md)——声明 `settings.section` 与 namespace scope 服务的领域底座。
- [ui-settings-general](../ui-settings-general/README.zh.md)——渲染导航并挂载该分区的设置外壳。
- [ui-workspace](../ui-workspace/README.zh.md)——其 Session 行负责归档的侧边栏浏览器，以及本页面借以恢复的 `ctx.uiWorkspace` 服务。
- [Workspace Controller](../../api/workspace-controller/README.zh.md)——`workspace.unarchiveSession` Remote 与持有归档集合的 Client model。
- [Workspace 子系统](../../../docs/subsystems/workspace.zh.md)——持久归档集合、其领域字段，以及恢复背后的注册表操作。

-----

<a id="model-experience"></a>
## 模型体验

无。该包是浏览器端 UI 插件层，不注册任何面向模型的内容。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制界定本页面能够恢复哪些已归档会话；它们是当前包约束。

- **页面只列出会话，不提供会话删除**：归档可通过本页面恢复，而删除会话记录仍是彼此独立的能力。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。本包是浏览器端设置页，只注册一个本地化 `settings.section` 贡献及其 locale namespace；它不发出 Cordis 事件，也不持有跨插件可变关系。
