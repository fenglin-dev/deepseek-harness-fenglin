# Agent Note：Desktop NAS 运行端 authority

状态：已实现

[English](2026-09-18-desktop-nas-runtime-authority.md) | 中文

## 问题

NAS Store 与网络 Client 已经拥有各自的实现，但跨越二者的产品规则仍由 `main.ts` 持有。运行端选择、启动时运行端快照、待确认的证书 pin、精确 origin 凭据注入、身份校验、设备撤销、连接展示与重启顺序，分散在全局状态、Electron hooks、启动分支、重试处理和九个 IPC handlers 中。

这组 module 很浅：调用方必须理解接近完整的实现并重复维护顺序约束。已有测试分别覆盖 Store 和网络 Client，却无法通过一个 interface 验证完整 Desktop NAS 行为。

## 决策

`DesktopNasRuntimeAuthority` 是拥有 Desktop NAS 策略的 deep module。它的 interface 暴露启动运行端、渲染层安全状态、一个带类型的运行端操作入口、连接已选启动运行端、证书接受决策与精确 origin 请求授权。实现内部隐藏 Store/Client 组合、待确认 pin、凭据查找与过期检查、健康与身份检查、状态发布、连接展示、自设备撤销清理、常驻服务停止和重启顺序。

Desktop 进程启动时选择的运行端会固定到重启为止。进程保持打开时，持久化状态可以变化，但不会热切换正在使用的运行端。请求授权仍跟随当前持久化选择，从而保留等待重启期间的既有过渡行为。

Electron 在该 seam 上仍只是 adapter。专用 IPC adapter 先校验渲染端归属与原始 payload 形状，再向 authority 发送带类型的操作。TLS 和请求 hooks 向 authority 查询同步策略决策。连接 adapter 把 authority 拥有的顺序翻译为加载进度、窗口有效性、URL 加载、Desktop 日志与恢复展示，同时不把 Electron 类型引入 authority module。

文件与安全存储继续通过 `NasRuntimeStore` 保持为可本地替换依赖；HTTPS 操作继续位于网络 adapter 之后。既有 Store 与 Client 测试保留为 adapter 契约测试，authority 测试则通过其 interface 覆盖跨模块行为。

## 考虑过的替代方案

**为每个 Store 或网络方法暴露一个 public 方法。** 不采用，因为调用方仍需编排配对 pin、凭据查找、身份检查、状态发布与重启顺序，module 仍然很浅。

**为所有 NAS 行为使用完全通用的命令总线。** 不采用，因为证书与请求授权属于同步宿主策略，连接则拥有独立生命周期。强行通过同一个通用命令处理三者会降低清晰度，却不会增加 leverage。

**继续把编排留在 `main.ts`，只增加更多 helper functions。** 不采用，因为无法通过 deletion test：删除这些 helpers 后不会恢复一个一致的拥有者，安全规则仍散落在互不相关的 Electron 调用点。

## 与既有决策的关系

本说明深化了 [NAS 运行端选择](../feature/2026-09-17-nas-runtime-selection.zh.md) 的宿主侧实现，并与 [NAS 远程桥投影](./2026-09-17-nas-remote-bridge-projection.zh.md) 互补。它保留既有的独立运行端模型、显式切换、禁止静默回退、缩减渲染层权限与逐设备撤销。没有更早的有效说明负责宿主编排 seam，因此本决策不取代任何说明。

## 结果

启动、重试、IPC、TLS 与请求授权现在共享同一个策略拥有者。修改 NAS 身份、凭据、配对、撤销或重启规则时具有更强 locality，并且无需 Electron 即可通过 authority interface 验证。`main.ts` 只保留 adapters 与通用应用生命周期。

这是行为保持型重构。它不改变存储格式、wire protocol、错误、自动重试、回退、连接界面或运行端切换语义。未来的热切换、凭据刷新或新连接阶段需要另行进行产品决策。
