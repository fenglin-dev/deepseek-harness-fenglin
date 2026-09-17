# Agent Note: 集中管理 Desktop 特权 IPC 协议

Status: implemented

[English](2026-09-17-desktop-ipc-protocol-module.md) | 中文

## Problem

Electron 主进程与沙箱 preload 在特权操作和状态发布中重复维护频道字符串。一次重命名可能让两端监听不同频道，协议审查也必须同时搜索庞大的主进程入口和大量转发方法。渲染器类型还镜像了若干由 Host 拥有的数据传输对象，却没有检查两种表示是否持续一致。

## Decision

`desktop-ipc-protocol.ts` 统一拥有 Harness preload 暴露的每项 capability 的精确频道标识。主进程与 preload 在注册、调用、发送和订阅时共同引用这套词汇。preload 仍通过具有语义方法的独立冻结 capability 对外发布；协议模块不会向渲染器暴露通用 invoke、send、文件系统、进程、路径、命令或 URL 操作。

主进程处理器继续在特权操作位置校验渲染器归属和每个不可信参数。共享频道词汇不会把授权移到渲染器，也不会把已知频道名视为权限。协议测试要求频道带命名空间且互不重复，Host 与 Client 则分别在仓库指定的 TypeScript 程序中编译。

## Alternatives considered

**提供一个带 allowlist 的通用 invoke 方法。** 拒绝，因为它会抹去渲染器边界上的 capability 专用签名，也会让后续扩展更容易进入过宽的传输层。

**继续把频道字符串放在各调用方旁边。** 拒绝，因为 main 与 preload 仍会独立漂移，协议审查也仍然依赖搜索。

**把 Electron 授权移入协议表。** 拒绝，因为发送者身份和参数校验依赖主进程实时状态，应留在各特权处理器中。

## Consequences

频道重命名现在只修改一套词汇，TypeScript 会定位所有消费者。preload 继续保持窄而基于 capability 的接口，main 继续对发送者和 payload 保有最终权限。渲染器包仍只声明自己消费的 bridge 子集。Host 测试不会导入 Client 源码，因为仓库有意把这两个编译面作为独立程序处理。
