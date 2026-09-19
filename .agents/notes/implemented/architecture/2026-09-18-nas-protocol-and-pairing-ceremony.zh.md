# Agent Note: NAS protocol and Pairing Ceremony modules

Status: implemented

[English](2026-09-18-nas-protocol-and-pairing-ceremony.md) | 中文

## Problem

NAS 线路协议 v1 的方法、路由、JSON 文档类型、构造和运行时解析重复出现在 NAS 运行端主机、Desktop 网络 adapter、renderer bridge 及测试中。兼容性变更可能在两个线路端之间漂移，而 adapter 测试中的手写成功载荷会重复协议，而不是验证协议。

渲染层还用相互独立的 React 值表示配对流程中的地址、指纹、确认、忙碌操作和消息。把指纹绑定到已检查地址的顺序规则存在于事件处理函数中，因此迟到的证书检查结果可能被附到更新后的地址上。

## Decision

`@deepseek-ai/dsh-nas-protocol` 是 NAS 线路 seam 上的深 module。其 `NAS_PROTOCOL_V1` interface 统一拥有固定方法与路由、请求与响应 codec、线路文档类型、schema 注入和运行时校验。NAS 运行端主机与 Desktop 网络代码是两个 adapter。传输安全、认证、HTTP 状态映射、证书策略、凭据、发现和运行端选择仍位于协议 module 之外。

手写 golden 协议测试独立于 constructor 固定 v1。主机 adapter 测试继续覆盖真实 HTTP 状态与认证，Desktop adapter 测试继续覆盖兼容性、超时和固定路由。

`createNasPairingCeremony` 是 NAS 设置页面背后的进程内深 module。其 interface 接受编辑与信任意图，暴露一个可观察的带标签快照，并执行证书检查和配对。实现会把每个指纹绑定到已检查地址，在地址变化时使审核状态失效，忽略过期的检查完成结果，并始终一同提交已检查地址和指纹。发现、已保存运行端管理、已配对设备管理和运行端选择仍属于页面级职责。

配对流程不会建立信任。`DesktopNasRuntimeAuthority` 继续要求一次性检查和精确 origin 证书确认，然后才允许配对请求到达 NAS 运行端。

## Alternatives considered

**把协议放入 `client-connection`。** 拒绝，因为 NAS 运行端主机与 Desktop 网络代码是线路 seam 上的同级 adapter。让 Desktop 依赖更宽的 connection 包会倒置所有权，并导入无关的主机与浏览器职责。

**分别暴露路由常量、parser 和 builder。** 拒绝，因为调用方仍需重建操作分组及方法与路径关系。单个 `NAS_PROTOCOL_V1` descriptor 以更小 interface 提供更多 leverage。

**在 React state 中保留配对流程并添加 attempt counter。** 拒绝，因为 React 调用方仍会拥有指纹与地址绑定、过期异步完成、合法转换和重试状态。interface 仍会与实现近乎同样复杂。

**把整个 NAS 设置页移入一个状态机。** 拒绝，因为发现、运行端选择、设备管理和配对拥有独立生命周期。合并它们会降低 locality，并形成浅的页面级 interface。

## Relationship to existing decisions

本决策深化了 [NAS 运行端选择](../feature/2026-09-17-nas-runtime-selection.zh.md)、[NAS 远程 bridge 投影](./2026-09-17-nas-remote-bridge-projection.zh.md)和 [Desktop NAS 运行端 authority](./2026-09-18-desktop-nas-runtime-authority.zh.md)的线路与渲染层实现。它保留独立运行端模型、受限渲染层权限、显式证书核对、逐设备凭据和不静默回退规则。

## Consequences

协议变更现在集中于一个包，并在两个线路端对称校验。未来协议版本必须新增显式版本化 interface，而不能原地修改 v1。新增 workspace 包和文档是保持两个 adapter 相互独立的代价。

React 只渲染配对流程状态，不再复制异步顺序规则。测试通过与页面相同的 interface，可以确定性验证迟到完成、地址失效、确认、重试和重置行为。用户可见步骤、NAS 线路协议 v1、Desktop 信任策略与运行端切换行为均保持不变。
