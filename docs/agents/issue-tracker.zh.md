# 问题跟踪器：本地 Markdown

[English](issue-tracker.md) | 中文

本仓库的问题和规格以本地 Markdown 文件的形式存放在 `.scratch/` 下。Git 会忽略此目录，不得提交或发布其中的内容。

## 约定

- 每项功能使用一个目录：`.scratch/<feature-slug>/`
- 规格文件：`.scratch/<feature-slug>/spec.md`
- 工单文件：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- 按依赖顺序从 `01` 开始为工单编号。
- 使用 `Status:` 行记录分流状态。
- 在 `## Comments` 标题下追加讨论内容。

## 远程跟踪器边界

除非维护者明确要求访问某一条远程记录，否则本地问题工作流不得读取或写入 GitHub Issues 或其他远程跟踪器。

背景上下文中出现 GitHub URL 或问题编号，不代表已授权访问或修改该记录。

## Skill 操作

- “发布到问题跟踪器”表示在 `.scratch/<feature-slug>/` 下创建文件。
- “获取相关工单”表示读取引用的本地 Markdown 文件。
- `to-spec` 写入 `.scratch/<feature-slug>/spec.md`。
- `to-tickets` 为每个已批准的工单在 `.scratch/<feature-slug>/issues/` 下分别写入一个文件。
- 未经维护者明确批准，不得修改或删除已有规格或工单。

## Wayfinding 操作

- 地图：`.scratch/<effort>/map.md`
- 子工单：`.scratch/<effort>/issues/<NN>-<slug>.md`
- 阻塞关系：`Blocked by: NN, NN`
- 认领：设置 `Status: claimed`
- 解决：追加 `## Answer`、设置 `Status: resolved`，并更新地图
