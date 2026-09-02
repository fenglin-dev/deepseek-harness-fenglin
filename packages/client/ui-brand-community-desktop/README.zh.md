---
description: "社区桌面版的侧边栏与会话首页品牌占位包，仅在 community-desktop 构建中生效。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-community-desktop

[English](README.md) | 中文

## 概述

本包仅在 `DSH_CLIENT_BUILD_PROFILE` 为 `community-desktop` 时填充侧边栏和会话首页的品牌插槽。它将社区桌面版标识与上游官方产物分离，不持有用户状态，也不直接修改上游基础组件。

## 目录

- [使用方式](#use-this-package)
- [实现原理](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用方式

将本包组合进社区桌面版 Web Bundle，并以 `DSH_CLIENT_BUILD_PROFILE=community-desktop` 构建。其他 Profile 不会注册社区品牌占位，因此官方构建可以通过同一组插槽提供自己的品牌包。

-----

<a id="understand-the-implementation"></a>
## 实现原理

客户端入口通过侧边栏和会话 Hero 插槽注册骑鲸图标及社区产品名称。注册同时受 Profile 和生命周期约束，HMR 或释放时会撤下整组占位，不会留下混合品牌状态。

本包不发布 invariant companion，因为它只贡献无状态的品牌插槽渲染器。

<a id="model-experience"></a>
## 模型体验

无，因为本包只提供浏览器展示内容；这里没有任何内容会进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 浏览器标题由构建时的 `DSH_CLIENT_TITLE` 独立选择。
- 其他部署应提供不同的插槽占位包，而不是在运行时配置本包。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

社区资产和 Profile 判定应保持在本包中；不要为品牌直接修改上游侧边栏或会话组件。

</details>
