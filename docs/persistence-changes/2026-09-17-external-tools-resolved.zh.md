---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-09-17-external-tools-resolved

[English](2026-09-17-external-tools-resolved.md) | 中文

## 概述

新增一个可忽略、仅写入日志的事件，记录每次模型请求中实际投影的 Codex 和 Claude Code 工具。Host 侧的有界投影只保留最新记录，用于避免重复写入和重建状态；该事件不会进入模型历史或客户端可见的对话内容。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

```yaml persistence-change
schemaVersion: 1
id: 2026-09-17-external-tools-resolved
baseline: false
changes:
  - root: "event:external-tools/resolved"
    previous: null
    after: "68bec9ab0213191ac3b19deb41231bd973fb444a25e2085f922fe4277f9a20e5"
    decision: same-version
```

<a id="compatibility"></a>
## 兼容性

该事件属于新增项，并标记为可忽略。按照已发布 Session 的接纳规则，不认识该事件的读取方可以跳过它；当前读取方会校验固定的工具标识以及数字类型的 turn、step 坐标。旧会话不包含此事件，重建时投影保持 null。已有事件信封、字段和值类型均未改变，因此 Session 格式版本保持不变，也不需要迁移。

<a id="verification"></a>
## 验证

Agent Presets、Session 投影和 Session 格式迁移的聚焦测试均已通过。V2 到 V3 接纳测试验证了该可忽略事件会被保留且 turn、step 不会被误当作序列引用，同时覆盖未知工具标识、畸形载荷拒绝和已发布 V3 产物恢复。持久化预览仅识别出一个新增事件根，无需提升版本。

<a id="dev-note"></a>
## 开发备注

无。
