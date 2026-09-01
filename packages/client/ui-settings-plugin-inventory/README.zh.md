---
description: "dsh Web 客户端的插件清单、诊断、恢复、外部工具设置与实时插件市场探索界面。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-plugin-inventory

[English](README.md) | 中文

## 概述

`dsh-client-ui-settings-plugin-inventory` 提供插件清单、诊断、导入插件恢复、外部工具与插件市场探索的客户端界面。新对话页的**探索插件**控件从已安装市场组合四项推荐或分类条目，显示市场拥有的热度与当前 Profile 状态，并同时提供受控直接安装和完整市场深层跳转。本包不保留重复的完整目录或兜底统计数据。既有**插件列表**标签页会懒读取宿主清单，并渲染可搜索的 Loader 状态与配置。

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

桌面专属的**诊断演练中心**为隔离 home 和需明确确认的当前 Profile 都提供了**隔离卸载残留**场景。它会写入经过审核的旧版修复报告、诊断报告和 lockfile 组合，调用正式 Doctor，并将演练报告保留到用户点击**全部恢复**；渲染层不能传入软件包、路径或任意载荷。当前 Profile 样本绝不替换全局 Host override。“全部恢复”会执行离线强制依赖重建，并在 Harness 恢复前验证受管文件哈希、本次运行的 pnpm 链接和最终 Doctor 结果；恢复失败仍会显示并允许重试。

### 探索市场插件

在新对话页打开**探索插件**即可浏览推荐榜或任一非空市场分类。四张卡片显示分类、作者、简介、30 天下载量、Star，以及已安装、未安装、需要重启、不可用或状态未知。**去市场查看**会打开对应市场条目；**立即安装**只对拥有明确 npm 包身份且尚未安装的条目开放，用户确认第三方代码风险后，复用设置页相同的宿主/桌面受控安装、诊断和进度查询流程。仅有源码地址的条目仍只允许前往市场查看。市场缺失时，用户明确执行的安装或更新会使用受校验的内置市场归档，并提示需要快速重启。网络与目录失败会显示实际消息；过期排行仅在明确警告后继续展示。

### 阅读卡片

每张收起的卡片使用模块短名称作为标题，并以小标签表示有效启停状态；已启用的条目还会显示彩色根 fiber 状态圆点。展开卡片后会直接展示 Loader 树条目 id、有效配置，已启用条目还会显示 Cordis 状态；已停用条目省略重复的「未挂载」运行状态。搜索按名称与条目 id 过滤目录。

### 重试失败的读取

读取失败会在标签页内渲染通用失败状态；重试会重新执行懒 `list()` 调用，且不会暴露传输细节。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

清单标签页是宿主拥有快照的只读投影；插件激活期间不执行任何 Remote 读取，首次选择时才取快照。探索功能按需读取插件市场已有的 `dsh-market/registry` 与 `dsh-market/installed` 标准资源，再由这个桌面端包完成推荐和分类四卡预览。精简排行缓存 24 小时，本机安装状态则在每次打开时刷新；手动刷新会绕过目录缓存。设置领域导航请求携带目标市场标签与插件，不让本包耦合设置外壳。直接安装只接受市场明确提供的 npm 包身份，并把结构化请求交给现有受控安装器，绝不执行目录中的自由格式命令字符串。

### 注册

浏览器插件注册一个 id 为 `all` 的本地化 `settings.plugins.tab` 贡献；「插件」分区拥有导航入口与标签栏。注册使用 `ctx.slots.inject()`，因此能跟随标签 slot 的延迟声明、重新声明、本地化变化与 teardown，而无需 import 分区拥有方。

### 渲染

条目 id 仍作为 React key、展开标识、详情值与额外的搜索目标；代码不按字符串形状对它分类。

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


这些限制定义清单与探索视图的新鲜度和触达范围；它们是当前包约束。

- **每次 Settings 挂载或重试只读取一份快照**：标签页不订阅 Loader 变化，也不会在重连后自动重新读取；切换标签页会保留当前快照，重新打开 Settings 则会取得新快照。
- **只读 Loader 视图**：本地搜索不会额外引入来源、按来源分组、当前浏览器激活诊断或插件修改控件。
- **市场数据可用性**：预览依赖已安装的插件市场提供标准目录与安装状态资源，并需要目录连接正常；失败会如实展示并允许重试。
- **受限的过期回退**：24 小时缓存过期且目录刷新失败时，旧排行只会在明确标注过期后继续展示；未知安装状态绝不会被显示成未安装。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
