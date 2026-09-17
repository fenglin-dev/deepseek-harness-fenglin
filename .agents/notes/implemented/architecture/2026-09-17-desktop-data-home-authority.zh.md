# Agent Note: 集中桌面端数据目录权威

Status: implemented

[English](2026-09-17-desktop-data-home-authority.md) | 中文

## Problem

桌面端数据目录规则原先分散在纯文件系统函数与 Electron Host 编排中。首次启动、Settings 选择器和启动恢复都必须理解目录分类、不透明选择标识、有效期、renderer 归属、最终复验、来源与目标重叠、复制或复用准备、setup 发布和重启顺序。因此，部分测试只能读取 `main.ts` 并断言源码字符串，而不能通过单一接口验证行为。

## Decision

`DesktopDataHomeAuthority` 负责所有由 Desktop 发起的数据目录生命周期。它发现官方与社区来源、创建有界选择会话、签发和消费不透明选择、在提交时重新验证路径、准备全新、导入、复制或复用目录、原子发布 setup 记录，并决定是否需要完整重启。Electron Host 保留为呈现 adapter：它负责沙箱窗口、原生对话框、sender 身份检查、本地化确认和焦点行为，然后把每项业务决定委托给 authority。

选择器产生的是短期能力，而不是由 renderer 在切换时直接提供的路径。Settings 与恢复选择会绑定到一个 renderer id 和预期选择种类。选择会话分别绑定自定义目标和经过明确确认的旧社区来源，并在接受最终选择前再次执行文件系统分类。发布流程会先停止活动 Profile 所属的常驻服务，setup 写入成功后才安排重启。

现有文件系统函数作为内部 implementation 协作者继续保留，负责路径、复制、身份和 setup 原语；其磁盘 schema 与 allowlist 均不改变。启动初始化、运行期选择器变更、Settings 切换和恢复切换现在共享同一个 authority，不再在 `main.ts` 中重复协议。

## Alternatives considered

**只移动不透明 token map。** 未采用，因为调用方仍需组合最终复验、重叠检查、准备、发布与重启顺序。

**把 Electron 窗口和对话框也移入 authority。** 未采用，因为原生呈现和 sender 身份属于 Electron adapter；引入它们会让业务接口更难测试，却不会增加 depth。

**切换时接受 renderer 直接提供的路径。** 未采用，因为这会削弱现有的有界选择和最终复验保证。

## Consequences

Electron 入口不再导入底层数据目录变更规则，也不再保存选择能力。接口测试覆盖选择后目标发生变化、旧社区来源明确确认、全新初始化、renderer 绑定切换、setup 发布和重启顺序。UI 测试只保留 adapter 断言，不再通过源码字符串复制 authority 的 implementation。现有数据、setup 记录、来源分类和用户可见选择器行为保持兼容。
