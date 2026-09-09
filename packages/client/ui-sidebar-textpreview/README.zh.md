---
description: "dsh Web 客户端右侧 Sidebar 的纯文本查看器 tab 类型：对一个工作区文件分页读取，带行导航、换行、重新读取，并兜底认领每个 file 资源地址。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-textpreview

[English](README.md) | 中文

## 概述

右侧 Sidebar 的纯文本查看器：一个工作区文本文件，一次读一页行，带行号导航、换行与重新读取。它是每个 `file` 资源地址的兜底类型，也是 `ui-sidebar-right` 之外交付的 tab 类型的样板：来自 Sidebar 的每个 import 都是类型，文件的元数据来自共享的 `file` 资源，正文是类型自己的事，类型的控件住在自己的体里。

## 目录

- [注册了什么](#what-it-registers)
- [地址](#addresses)
- [怎么读](#how-it-reads)
- [导航](#navigation)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="what-it-registers"></a>
## 注册了什么

- **类型** —— `ctx.sidebarRightTabs.register(...)`，id 为 `@deepseek-ai/dsh-client-ui-sidebar-textpreview`（这个实现在 tab 系统里的唯一键，也是其体注册所用的 key），kind `text`，pattern `dsh-resource://file/**`，档位 `fallback`。在 `extension` 或 `builtin` 档以更窄 pattern（比如 `*.png`）注册的类型接走那些地址；其余一切落到这里。整个地址就是内容身份，所以不同目录下同名的两个文件、或同一路径在两个会话之下，是两个 tab；解码后的 basename 是 tab 标题。
- **体** —— keyed 坑位 `sidebar.right.pane.tab`，键为类型的 id。它的头部行显示 Host 的绝对路径，并在提示中保留完整值，末端是类型的两个控件：换行开关（默认开；长行折行直到读者关掉它，按 tab 记）与重新读取按钮。Sidebar 的 tab 条不承载这个类型的任何控件。体占满 pane 体的全部高度：头部行不动，其下的文件体是唯一的滚动者，于是短文件不留没有样式的空白，长文件在固定的路径下滚动。 元数据尚未提供绝对路径时，头部使用请求路径。
- **一个 store 与一个 face**，会话作用域、按 tab id 分桶。store 持有已读的页（以每页起始的 1 起行号为键，连同它们所属的文件版本）、文件末尾标志、进行中的读取或其失败，以及视图：滚动位置、换行（初始为开）、体最近答过的导航 revision。face（`loadPage`、`reloadPages`）执行读取并经 store 的 action 写入。owner 的 `signal` abort 时——即 tab 记录消失时——桶被忘掉。

<a id="addresses"></a>
## 地址

tab 的地址是 `dsh-resource://file/session/<sessionId>/<相对该会话工作区根的路径>` 或 `dsh-resource://file/absolute/<去掉前导 / 的绝对路径>`（一个 URI，authority 是资源协议 `file`，路径以作用域开头），由 `@deepseek-ai/dsh-util-workspace-path` 的 `fileAddressFor` 构造、`parseFileAddress` 读回；每段都做 component 编码，本包从不自己拆这个串。`rpc.ts` 里的 `hostFileOf` 把地址变成端点所需的会话与路径：`session` 地址在它命名的会话下读取，相对路径由 Host 对该会话的工作区根解析；`absolute` 地址在坑位被挂载的会话下以绝对路径读取，Host 的工作区限制照样适用。畸形地址直接抛错，因为注册表把每个 `file` 地址都路由给这个类型，造地址的调用方本应使用助手。

<a id="how-it-reads"></a>
## 怎么读

正文通过 `useTabInfo().tab` 读取记录、导航和生命周期。元数据与内容来自不同的地方：

- `useResource<'file'>(tab.contentId)`——来自 `@deepseek-ai/dsh-client-resources` 的标准 hook——从 `@deepseek-ai/dsh-api-workspace-files` 的 `file` 提供方得到 `{ absolutePath, version, bytes, changed }`。体读 `changed` 与失败态：agent 在上次 `stat` 之后写了文件时，一条提示带着重新载入按钮出现；资源为 `failed` 时——文件没了，或 Host 拒绝——一条失败条占据同一位置，显示失败句与同一个重新载入按钮，并优先于尚未处理的 `changed`。两种情况下已读的页都留在屏幕上：正文绝不在读者眼前被替换。
- 页来自 `remote.workspaceFiles.read(sessionId, path, { offset }, signal)`，在 `rpc.ts` 绑定、由 face 以地址所命名的会话与路径调用。首次挂载读第一页；已加载文本末尾的 **加载更多** 按钮读下一页直到 `eof`。每页带着自己的行数（`lines`），单个空行与越过文件末尾的页由此区分。来自更新文件版本的第一页替换旧版本的页；更新版本的后续页不被采用——从第一页重新走一遍，于是体永不混合两个版本。失败的页按 `workspace-file/*` 错误码各显示一句（`not-found`、`outside-workspace`、超过字节上限的页 `too-large`、`not-text`、`not-regular-file`）或传输层自己的消息，并带一个重读同一页的重试。
- **重新载入** —— 变更提示条的按钮与头部的重新读取控件都调用资源的 `reload()`（重新 `stat`，清掉 `changed`）与 face 的 `reloadPages`（丢掉所有页，重读第一页）。重载淘汰仍在飞的读取——face 按 tab 记请求代次，旧代次结算的页什么也不写。滚动位置保留，读者停在原处。

文案来自 `sidebarTextpreview` locale 命名空间。

<a id="navigation"></a>
## 导航

`ctx.sidebarRight.openResource(address, { params: { line } })`——`read` 工具行以此传它的 `offset`——以 `navigation.params` 到达，体把它收窄为 `file` 资源类型声明的参数（`SidebarRightResourceParamsMap['file']`，`{ line?: number }`，1 起），不做运行时校验：`params` 是同进程的类型化值。已加载的页够不到该行时，体读下一页，再读，直到覆盖它或文件结束；然后把该行滚到顶部并标记，每个 `navigation.revision` 一次。同一 revision 下重新挂载的体恢复读者的滚动位置而不再跳。不带 `revealIfOpened: false` 再次打开同一文件时聚焦已有 tab，并把新参数作为新 revision 送达。

<a id="model-experience"></a>
## 模型体验

无，因为预览是纯浏览器侧的查看器，不注册工具、提示词段或会话事件。

#### KV Cache 影响

无直接影响；用户在这里读到的东西永不进入模型请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>
- **只有纯文本。** 没有语法高亮、图片、Markdown 渲染或搜索；目录地址以 `not-regular-file` 失败。
- **页按顺序加载。** 大文件深处的一行要先加载它之前的每一页；没有到任意偏移的 seek。
- **换行图标为包内自绘。** `IconWrapOutline16` 住在 `src/client/icons.tsx`，直到共享图标集提供为止；props 契约已经一致。
- **滚动写入未节流。** 每次滚动事件都把偏移记进 store；行块已 memo 化，于是由此引发的重渲染交还给 React 的是同一批元素。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>

**运行时不变量：** 不发布 companion。该类型唯一的运行时状态是每 tab 一份的 Slot store，由持有它的正文写入、随 tab 的中止信号忘掉；没有第二个观测源可与之比对。
