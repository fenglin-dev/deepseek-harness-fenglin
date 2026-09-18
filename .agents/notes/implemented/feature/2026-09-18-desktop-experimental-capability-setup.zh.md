# Agent Note：桌面端实验能力配置

Status: implemented

[English](2026-09-18-desktop-experimental-capability-setup.md) | 中文

## 问题

上游 Browser Use 和 Computer Use Provider 是普通插件，不是 profile bundle。只添加 Provider 包会缺少共享服务和 Loader 行，因此设置页可能显示依赖已下载，但任何 Session 都无法使用。浏览器启动 Provider 在 profile 未指定可执行文件时，还会默认选择 Playwright 单独下载的 Chrome for Testing，即使电脑已经安装 Chrome。Auto review 是 bundle，但仅安装不会为当前 Session 选择它的权限预设。

## 决定

社区 Desktop 在同一个「工具与能力」分区中，把 Browser Use、Computer Use 和 Auto review 作为实验能力放在外部产品连接上方。每个配置对话框说明可选 Provider，以及各选项适合的使用条件。

Browser Use 和 Computer Use 安装通过 Desktop Remote 传递封闭的配方标识，并绑定一个经过审核的精确 Provider 包。Host 拒绝 profile、包与配方不匹配的组合，然后通过既有可观察、可取消的插件任务安装共享服务、安装 Provider，并调用唯一的 CLI 组合操作。CLI 只替换 Web profile patch 中由社区拥有的区块，校验结果，并把该 patch 纳入既有插件事务与快照文件。

可见的 Playwright MCP 和 Chrome DevTools MCP 启动配方复用系统已安装的 Chrome 或 Chromium 可执行程序，并使用隔离 profile。CLI 检查 macOS、Windows 和 Linux 标准位置，也接受显式的 `CHROME_PATH`；找不到时让配方失败，而不是下载 Chrome for Testing。连接已有浏览器和 Stagehand 在设置页能够收集端点或模型配置之前仍只下载。

Auto review 继续使用其 bundle 自有的 profile patch。该 bundle 安装后，设置页把当前活动 Session 切换到 `/permission auto`；没有活动 Session 时会显示结果，但不把安装判为失败。

## 考虑过的替代方案

**把每项能力都当作另一种外部工具。** 否决：实验性运行时能力配置当前 Harness 执行环境，而 Codex、Claude Code 和 WorkBuddy 连接独立产品。一个不分组的列表会隐藏不同的权限与重启后果。

**通过 Remote 发送任意 Loader 行和配置。** 否决：由渲染器控制包名和 YAML 会扩大安装权限。封闭配方让包版本、依赖与配置继续由 Host 和 CLI 拥有。

**依赖各 Provider 的上游浏览器发现。** 否决：Playwright MCP 会选择 Chrome for Testing，并要求再次下载一个大型浏览器。Desktop 配置承诺在隔离启动时复用已安装的系统浏览器。

**替换完整的 profile patch。** 否决：该文件也属于用户与其他功能。Desktop 只拥有带标记的能力区块，安装未完成时，事务恢复完整文件。

## 后果

安装完成组合的 Browser Use 或 Computer Use 选项现在会产生一个重启后应用的 profile 变更，并保留终端进度、暂停、停止、回滚与快照行为。继续暂停的任务会重复原来的封闭配方。系统浏览器发现按平台处理，没有受支持的可执行程序时会给出修正提示并失败。除非用户选择连接模式，否则配置不会复用日常浏览数据，也不会声称只下载的选项已经启用。

## 测试

CLI 测试覆盖系统浏览器发现、明确的无浏览器失败、自有区块替换，以及与用户行共存。Host 测试钉住配方白名单和有序变更步骤。Client 测试覆盖双栏布局、按选项变化的说明、受控安装进度、重启行为、暂停配方继续、Auto review 激活，以及重启后的 inventory 状态。
