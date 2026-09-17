# 领域文档

[English](domain.md) | 中文

本仓库使用多上下文领域文档布局。

## 探索前必读

阅读与当前工作相关的以下资料：

- 根目录的 `CONTEXT-MAP.md`（若存在），以及其中每个相关上下文的 `CONTEXT.md`。
- [`../architecture.zh.md`](../architecture.zh.md)，了解系统组成和扩展点。
- [`../glossary.zh.md`](../glossary.zh.md)，了解仓库术语。
- [`.agents/notes/`](../../.agents/notes/README.zh.md) 下相关的活跃 Agent Note。

将 `implemented/` 下的 Agent Note 视为当前决策，将 `proposed/` 下的记录视为待定提案，将 `rejected/` 下的记录视为已否决的备选方案。归档记录是冻结的历史资料，不是当前依据。

如果某个上下文文件不存在，请直接继续。领域建模工作流会在术语或决策确定后按需创建地图和上下文文件。

## 布局

```text
/
├── CONTEXT-MAP.md
├── apps/
│   └── <app>/CONTEXT.md
├── packages/
│   └── <group>/CONTEXT.md
├── native/CONTEXT.md
├── python/CONTEXT.md
└── website/CONTEXT.md
```

`CONTEXT-MAP.md` 只列出实际存在的上下文。默认不要为每个包分别创建上下文；共享同一套领域词汇和归属模型的包应归为一组。

系统级决策继续使用 Agent Note。上下文文件负责定义术语并指向相关 Agent Note，不重复其中的决策理由。

## 使用既有词汇

在问题标题、提案、假设和测试中，使用相关 `CONTEXT.md` 和 [`../glossary.zh.md`](../glossary.zh.md) 定义的术语。如果缺少所需概念，请重新考虑该术语，或记录此空缺以供领域建模处理。

## 标记冲突

如果提议的工作与已实现的 Agent Note 冲突，请明确指出冲突并链接该记录，不要静默覆盖它。
