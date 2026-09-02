---
description: "为对话中选中的只读文字提供复制和对话草稿快捷操作。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-selection-actions

[English](README.md) | 中文

## 概述

本包为显式对话范围内选中的文字提供面向桌面端的“复制”“在新对话询问”和“添加到当前对话”操作。它在弹层获取焦点前捕获不可变文字，且绝不自动发送草稿。

## 目录

- [使用选中文字操作](#use-the-selection-actions)
- [安全边界](#understand-the-safety-boundary)
- [模型体验](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-the-selection-actions"></a>
## 使用选中文字操作

使用主键完成划选后会打开紧凑工具条，右键点击有效选区则打开圆角菜单。新对话和当前对话操作只写入本地化 Markdown 引用草稿，不会提交。

-----

<a id="understand-the-safety-boundary"></a>
## 安全边界

只接受完整位于 `data-selection-actions-scope` 内的选区。输入框、编辑器、控件、对话框、菜单、设置 Portal 和侧边栏都不参与；当目标输入框或会话无法安全接收草稿时，相关操作会隐藏。

本包不发布 invariant companion，因为浏览器选区范围和不可变快照检查由功能本身直接执行。

<a id="model-experience"></a>
## 模型体验

无，因为浏览器端草稿控件会让选中文字保持在模型上下文之外，直到人类提交生成的草稿。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 暂不处理触摸长按划选；首版面向鼠标和触控板交互。
- 在出现明确的扩展使用方和权限模型前，操作列表保持固定。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

必须保留不可变选区快照和显式范围边界；不得让弹层焦点或导航改变操作最终消费的文字。

</details>
