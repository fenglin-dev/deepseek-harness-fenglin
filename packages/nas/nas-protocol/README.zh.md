---
description: "供 NAS 运行端与 Desktop adapter 共享的 NAS 线路协议 v1 路由、JSON 文档、构造与运行时校验。"
kind: "package-reference"
---

# @deepseek-ai/dsh-nas-protocol

[English](README.md) | 中文

## 概述

`dsh-nas-protocol` 是 NAS 线路协议 v1 的唯一事实来源：固定 HTTP 方法与路由、健康和配对文档、已配对设备管理消息、构造以及运行时校验。NAS 运行端主机与 Desktop 网络代码是该 seam 上的两个 adapter。本包不包含传输、TLS、凭据、Electron 或 React 行为。

**运行时不变量：**不发布配套组件。两个适配器都通过本包校验固定的 v1 线路文档；传输安全仍由各自的适配器负责。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [开发备注](#dev-note)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)

<a id="use-this-package"></a>
## 使用本包

线路两端都使用 `NAS_PROTOCOL_V1`。NAS 运行端 adapter 使用每项操作的 `path`、请求 parser 和响应 constructor；Desktop adapter 使用同一个 `path`、请求 constructor 和响应 parser。Parser 接受 `unknown`，并在不保留被拒载荷的情况下抛出 `NasProtocolViolation`。若健康文档的 `protocolVersion` 不等于 `NAS_PROTOCOL_V1.version`，Desktop adapter 会另行拒绝。

v1 interface 覆盖 `GET /nas/health`、`POST /nas/pair`，以及需要认证的 `GET` 或 `POST /nas/devices`。导出类型只描述线路文档。运行端选择、证书指纹、已保存凭据、发现候选和 Desktop 状态属于各自的所属 module。

<a id="understand-the-implementation"></a>
## 理解实现

本包在构造健康和配对文档时注入固定 schema 标识，并在解析时校验相同标识。它校验必填字符串、受支持的 Linux 架构、可解析时间戳、配对 token 长度及每条已配对设备记录。手写 golden 测试独立于 constructor 固定协议，避免两个 adapter 同时漂移却未被发现。

<a id="further-exploration"></a>
## 进一步探索

- [NAS 运行端主机 adapter](../../client/connection/README.zh.md)——围绕这些消息的认证与 HTTP 状态行为。
- [Desktop NAS 运行端模式](../../../apps/desktop/README.zh.md#nas-runtime-mode)——证书、凭据、身份和运行端选择策略。

<a id="dev-note"></a>
## 开发备注

无。

<a id="model-experience"></a>
## 模型体验

无，因为本线路库既不组装也不发送模型请求。

#### KV Cache 影响

无；本包不会贡献模型可见内容。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与延期工作

- 版本 1 不协商版本；Desktop 会拒绝任何不同的协议版本。
- 本协议不定义传输安全或授权。TLS 终止、证书策略、受信 authority 与 bearer 凭据由其 adapter 拥有。
