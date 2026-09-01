# Agent Note: 使用原生视图边界隔离桌面标题栏与 Harness 渲染器

Status: implemented

[English](2026-08-31-desktop-titlebar-webcontents-isolation.md) | 中文

## 问题

Windows 和 Linux 需要自定义桌面 chrome，但覆盖在 Harness 渲染器内部的标题栏会与所有插件共享同一个 Chromium 视口。根节点内边距、固定 body 矩形和安全区变量可以指导遵守约定的布局，却无法约束任意 `position: fixed`、`100vh`、body portal 或高层级遮罩。因此，即使内置客户端遵守 inset 契约，任何全视口插件仍可能覆盖窗口按钮。

## 决策

Windows 和 Linux 在一个无系统边框 BrowserWindow 中使用两个沙箱原生渲染器。BrowserWindow 渲染器只加载 36 px 桌面标题栏文档和最小权限的窗口控制 preload。一个 `WebContentsView` 从 `x = 0, y = 36` 开始填满剩余内容尺寸，并加载启动进度、Harness 与所有插件 UI。窗口缩放、最大化和还原事件会重新计算该视图的原生边界。

两个 preload 暴露互不相交的能力。桌面应用 IPC 只接受 Harness 渲染器，最小化、最大化或还原、关闭意图只接受标题栏渲染器。导航、新窗口策略和权限处理只应用于 Harness。主进程会把 Harness 页面标题和主题变化同步到标题栏。

Harness URL 保留桌面模式和平台元数据，但声明零标题栏 inset，因为内容渲染器内部不存在覆盖式 chrome。共享弹窗、首次引导、横幅、附件遮罩、图片预览和插件 portal 会使用自己的完整本地视口，不再增加桌面专用偏移。macOS 继续使用原生标题栏和单渲染器。

窗口释放时，桌面宿主会显式释放内容渲染器。若无法创建拆分内容视图，宿主会销毁未完成的无边框窗口并创建带原生系统边框的新窗口，绝不会退回到把自定义窗口按钮覆盖在 Harness 上的结构。

## 考虑过的替代方案

**修补 Better Sidebar 或识别全屏插件。** 插件专用 CSS 无法保护未来插件、portal 或运行时 DOM 变化，还会让桌面宿主依赖第三方实现细节。

**保留固定 body 和 URL inset 契约。** 该方案能为遵守约定的 Web 代码提供安全区，但不会改变固定定位和视口相对内容的包含视口。其历史实现归档在[内容边界说明](../../archived/bug-fix/2026-08-29-windows-custom-titlebar-content-bounds.md)中。

**在 Windows 和 Linux 恢复系统原生边框。** 原生边框可以提供隔离，但会放弃既有桌面 chrome 和跨平台操作。独立标题栏渲染器可以在保留外观的同时建立原生边界。

## 后果

Chromium 只会向插件报告缩小后的内容视图尺寸，因此插件无法渲染到标题栏矩形。Windows 和 Linux 会增加一个轻量渲染器，桌面宿主也必须把加载、消息、权限、页面标题、主题、尺寸变化和释放操作路由到正确视图。测试会固定几何与发送者身份；原生 Windows 和 Linux 安装包验证仍负责显示缩放、最大化或还原、托盘恢复和插件交互行为。
