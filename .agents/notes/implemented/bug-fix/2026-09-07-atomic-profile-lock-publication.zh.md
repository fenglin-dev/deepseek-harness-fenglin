# Agent Note: Profile 锁原子发布

Status: implemented

[English](2026-09-07-atomic-profile-lock-publication.md) | 中文

## Problem

先创建 Profile 写锁再写入所有者信息，会在进程于两次操作之间终止时留下空锁。删除所有空锁又可能在存活所有者仍在初始化时放行两个写入者。[Issue 16](https://github.com/flaqai/open-deepseek-harness-desktop/issues/16) 报告了插件操作中断和 pnpm 连接超时。

## Decision

快照实现先在锁旁写入仅所有者可访问的临时文件并同步到磁盘，再通过排他硬链接发布。租约转换在现有所有者持锁期间使用原子重命名。发布失败会移除临时名称并保留现有所有者。损坏的所有者信息仍受保护，并给出可操作的错误；缺失租约使用独立错误。不支持硬链接的文件系统会安全拒绝操作。

pnpm 网络实现保留 dispatcher 及其代理和 TLS 设置。便携网络对照工具记录 Node 的 Undici 版本，以及能够识别时的 pnpm 内嵌版本。Windows 专属 fetch 修改需要受影响机器的验证证据。

## Alternatives considered

**立即删除损坏锁。** 这无法区分已中断的所有者与正在写锁的存活旧版进程。

**替换 pnpm fetch 并省略 dispatcher。** 这会丢弃已配置的路由和证书行为。单机请求成功不能证明行为等价。

## Consequences

新所有者发布不会暴露不完整的 JSON。对于已有损坏锁，操作人员需要先关闭所有 DSH 实例，再将锁移到其他位置。强制退出可能留下未引用的临时文件，但不会占用 Profile。聚焦测试覆盖竞争获取、租约发布失败、损坏所有者、死亡旧版 PID 和保留 token 的释放行为。原生 Windows 验证及报告中的网络超时仍待完成。
