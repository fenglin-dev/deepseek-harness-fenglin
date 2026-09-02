---
description: "dsh Web 客户端中按作用域分组的插件清单，以及诊断、恢复、外部工具设置与实时插件市场探索界面。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-plugin-inventory

[English](README.md) | 中文

## 概述

`dsh-client-ui-settings-plugin-inventory` 提供插件清单、诊断、导入插件恢复、外部工具与插件市场探索的客户端界面。**插件列表**标签页会懒调用 `ctx.remote.pluginInventory.list()`，并渲染两个可折叠分组：Agent 预设组合在前，全局 Loader 平面在后。它展示预设来源、条件门、失败优先的全局条目、由预设提供的全局条目，并跨两个作用域搜索，但不修改其启停状态。新对话页的**探索插件**控件从已安装市场组合四项推荐或分类条目，显示市场拥有的热度与当前 Profile 状态，并同时提供受控直接安装和完整市场深层跳转。本包不保留重复的完整目录或兜底统计数据。加载、空结果、无匹配与通用失败状态只属于已挂载组件；没有 roster 时标签页只渲染全局平面并保持展开。

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

打开设置中的「插件」分区并选择**插件列表**标签页，即可查看宿主的插件清单。插件激活期间不会读取 Remote——首次选择该标签页时才挂载组件，并通过 `api-remotes` 懒调用 `ctx.remote.pluginInventory.list()`。

打开**诊断**可检查 Profile 依赖、Loader、隔离与卸载一致性。`profile.quarantine-removal-residue` 卡片表示插件已停用且物理安装已经消失，但派生 lockfile 或诊断状态仍引用它；**清理卸载残留**会调用受控 Profile doctor，既不重新安装，也不再次隔离该插件。

诊断会区分 Loader 模块自身缺失与 Loader 已存在但其发布代码导入依赖缺失，并把两类故障都归属到唯一负责的外部 Bundle。内部 `@deepseek-ai/dsh-*` 包缺失会显示为 DSH 代际不兼容，不会引导用户安装 Host 内部包。`settings.yaml` 无效时，桌面安全模式保持原文件不动，并提供固定路径操作：打开文件，或先逐字节保留原文，再重置为空的有效映射并重启 Harness。

桌面专属的**诊断演练中心**为隔离 home 和需明确确认的当前 Profile 都提供了**隔离卸载残留**场景。它会写入经过审核的旧版修复报告、诊断报告和 lockfile 组合，调用正式 Doctor，并将演练报告保留到用户点击**全部恢复**；渲染层不能传入软件包、路径或任意载荷。当前 Profile 样本绝不替换全局 Host override。“全部恢复”会执行离线强制依赖重建，并在 Harness 恢复前验证受管文件哈希、本次运行的 pnpm 链接和最终 Doctor 结果；恢复失败仍会显示并允许重试。

### 探索市场插件

在新对话页打开**探索插件**即可浏览推荐榜或任一非空市场分类。四张卡片显示分类、作者、简介、30 天下载量、Star，以及已安装、未安装、需要重启、不可用或状态未知。**去市场查看**会打开对应市场条目；**立即安装**只对拥有明确 npm 包身份且尚未安装的条目开放，用户确认第三方代码风险后，复用设置页相同的宿主/桌面受控安装、诊断和进度查询流程。仅有源码地址的条目仍只允许前往市场查看。市场缺失时，用户明确执行的安装或更新会使用受校验的内置市场归档，并提示需要快速重启。网络与目录失败会显示实际消息；过期排行仅在明确警告后继续展示。

### 阅读卡片

每张收起的卡片使用模块短名称作为标题，并以小标签表示启停状态；已启用的条目还会显示彩色根 fiber 状态圆点。展开卡片后会显示声明的条目 id、完整模块标识与状态事实：预设行说明它来自哪个预设、组合存活时的运行状态，以及它携带的禁用条件；被预设提供的全局行说明它由 Agent 预设按会话提供、列出启用它的预设，并提供跳转到预设组的入口。预设名经共享的 `presetDisplayText` 纯函数（`dsh-agent-presets/display`）叠在 [`ui-agent-preset`](../ui-agent-preset/README.zh.md) 的字典上解析：内置预设走当前语言，用户自建预设保留自己的元数据，因此英文界面不会回显预设文件里的中文名。搜索按模块名称与条目 id 过滤两组。

### 预设切换器

切换器与通用设置各行使用同一种「选择胶囊 + 菜单」控件。它列出 roster 的每个预设——默认项带后缀、坏预设带标记——并且只改变列表显示什么：它不写任何设置，选中坏预设时在行的位置展示 discovery 报告的原因。选默认预设或某个会话的预设仍在原处：Agent 预设分区与新会话页。

### 重试失败的读取

读取失败会在标签页内渲染通用失败状态；重试会重新执行懒 `list()` 调用，且不会暴露传输细节。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

该标签页是宿主拥有快照的只读投影；插件激活期间不执行任何 Remote 读取，首次选择时才取快照。

### 注册

浏览器插件注册一个 id 为 `all` 的本地化 `settings.plugins.tab` 贡献；「插件」分区拥有导航入口与标签栏。注册使用 `ctx.slots.inject()`，因此能跟随标签 slot 的延迟声明、重新声明、本地化变化与 teardown，而无需 import 分区拥有方。

### 渲染

行 key 按作用域限定（`global:`、`preset:<id>:<index>`），因此同一模块出现在两个作用域时保持各自的展开状态；条目 id 只在行声明了它时作为详情展示，代码不按字符串形状对它分类。预设提供标记在客户端推导：一个全局条目在全局被停用、且至少一个预设行对同一模块标识实际启用时才携带它，因此被所有预设关掉（或仅条件声明）的模块保持单纯的已停用，而不是夸大提供关系。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

以下页面覆盖设置分区、Remote 调用与宿主侧投影。

- [ui-settings-plugins](../ui-settings-plugins/README.zh.md)——本标签页注册进的「插件」分区。
- [ui-settings](../ui-settings/README.zh.md)——声明 `settings.plugins.tab` 的领域底座。
- [api-remotes](../../api/remotes/README.zh.md)——`pluginInventory.list()` 背后的 Remote BFF 表面。
- [plugin-inventory](../../host/plugin-inventory/README.zh.md)——本标签页所渲染的宿主侧只读 Loader 投影。

-----

<a id="model-experience"></a>
## 模型体验

无。该包是浏览器端清单投影，不注册任何面向模型的内容。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制定义清单视图的新鲜度与触达范围；它们是当前包约束。

- **每次 Settings 挂载或重试只读取一份快照**：标签页不订阅 Loader 变化，也不会在重连后自动重新读取；切换标签页会保留当前快照，重新打开 Settings 则会取得新快照。
- **清单状态只读**：全局平面与预设平面都不修改启停状态或自定义组合文件；列表内唯一的修改操作是显式、受保护地卸载插件市场包本身。
- **市场数据可用性**：预览依赖已安装的插件市场提供标准目录与安装状态资源，并需要目录连接正常；失败会如实展示并允许重试。
- **受限的过期回退**：24 小时缓存过期且目录刷新失败时，旧排行只会在明确标注过期后继续展示；未知安装状态绝不会被显示成未安装。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。本包只持有一个只读 Settings contribution。
