---
description: "浏览器安全的 Workspace 路径辅助函数：拼接相对路径、缩写 POSIX 主目录并生成显示标题。"
kind: "package-library"
---

# dsh-util-workspace-path

[English](README.md) | 中文

## 概述

供 Workspace 相关客户端和控制器包共享、可在浏览器使用的路径辅助函数。该包负责拼接 Workspace 相对路径、缩写用于展示的 POSIX 主目录、从 POSIX 或 Windows 路径提取 Workspace 标题，并拥有在 Sidebar 与资源模型之间命名工作区文件的 `dsh-resource://file/…` 地址语法；它不提供 Cordis service，也不持有运行时状态。

## 目录

- [文件地址](#file-addresses)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="file-addresses"></a>
## 文件地址

资源地址 = `dsh-resource://<type>/…`，type（URI 的 host）即资源协议键（`file`，或插件在 `ResourceProtocolMap` 中声明的键）；其他 scheme 属导航协议，另行定义。文件地址有两种作用域。`dsh-resource://file/session/<sessionId>/<path>` 以相对该 Session 工作区根的路径命名文件（`dsh-resource://file/session/abc123/src/notes.txt`），由 Host 对它为该 Session 持有的根解析。`dsh-resource://file/absolute/<path>` 以去掉前导 `/` 的绝对路径命名文件（POSIX 上为 `dsh-resource://file/absolute/home/ys/notes.txt`，Windows 盘符为 `dsh-resource://file/absolute/C:/x/y.txt`，UNC 路径为 `dsh-resource://file/absolute//server/share/y.txt`，其空的首段保留 UNC 身份）；它不带 Session，由读者自己的 Session 解析，Host 的工作区限制照样适用。语法住在 [`src/file-address.ts`](src/file-address.ts)；路径辅助函数留在 [`src/index.ts`](src/index.ts) 并再导出它。

`sessionFileAddress(sessionId, relativePath)` 与 `absoluteFileAddress(absolutePath)` 构造地址：`\` 归一为 `/`，去掉前导 `./` 或 `/`，id 与每个路径段做组件编码但 `:` 保持字面，因此名字里的 `#`、`?`、空格都能保留，盘符也照原样可读。`fileAddressFor(sessionId, cwd, path)` 按调用方手里的路径选作用域：相对路径或落在 `cwd` 内的绝对路径成为 `session` 相对地址，其他绝对路径成为 `absolute` 地址。`parseFileAddress(address)` 用 `new URL()` 读回：scheme 必须是 `dsh-resource`、host 必须恰为 `file`；`session` 地址得到 `{ scope, sessionId, path }`（path 为工作区相对路径），`absolute` 地址得到 `{ scope, path }` 并还原前导 `/`（UNC 路径还原为 `//`），以盘符开头者除外。对其他 type 或 scheme、未知作用域、缺 id 或路径、非 URL、或转义格式错误的输入返回 `undefined`，是否算失败由调用方决定。

-----

## 已知限制与暂缓事项

<a id="known-limitations-and-deferred-work"></a>

- **路径解析仅处理字面值**——它识别 POSIX 绝对路径、Windows 盘符路径和 UNC 路径，拼接相对路径时保留 Workspace 路径的分隔符，但不访问文件系统，也不规范化 `.` 与 `..` 路径段。
- **主目录缩写仅支持 POSIX**——Windows 路径保持不变，因为可移植浏览器无法安全推断 Windows 主目录路径等价关系。


<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。这个工具不持有可变运行时关系。
