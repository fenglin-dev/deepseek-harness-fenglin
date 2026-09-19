---
description: "由 NAS 部署端与 Desktop adapter 共享的 NAS 运行端通信包映射。"
kind: "package-group"
---

# nas/ — 连接 Desktop 与 NAS 运行端

[English](README.md) | 中文

## 概述

`nas/` 组拥有 NAS 运行端与 Desktop 进程共享的通信事实。部署、Desktop 运行端选择、凭据、证书策略和渲染层展示均不属于本组。

## 包

| 包 | 职责 |
|---|---|
| [`nas-protocol/`](nas-protocol/README.zh.md) | 用于健康检查、配对和已配对设备管理的版本化固定路由 JSON 消息 |

## 相关文档

- [Desktop NAS 运行端模式](../../apps/desktop/README.zh.md#nas-runtime-mode)——运行端选择、证书策略、凭据与连接行为。
- [客户端连接](../client/connection/README.zh.md)——NAS 运行端主机 adapter 与认证路由。

## 开发备注

无。
