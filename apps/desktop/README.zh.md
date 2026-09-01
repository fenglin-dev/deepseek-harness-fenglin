# DeepSeek Harness Desktop

[English](README.md) | 中文

`@deepseek-ai/dsh-desktop` 是现有 DeepSeek Harness Web GUI 的原生应用宿主。它启动一个本地 Harness 进程，等待规范的就绪输出，再用经过加固的 Electron 窗口加载该回环地址。Harness 数据仍保持普通格式，但存放在桌面端自有 home 中，不再实时共享官方 CLI 的 `~/.dsh` 目录树。

## 从当前仓库运行

使用 Node `^22.19.0 || >=24.0.0`，先构建仓库，再启动桌面应用：

```sh
pnpm install
pnpm run build
pnpm run dev:desktop
```

桌面 `dev` 命令会监听宿主源码，短暂防抖后重新构建，并且只在构建成功后重启 Electron。构建失败时当前应用继续运行，监听器会在下一次编辑后重试。

应用提供与 `dsh web` 相同的引导和设置界面。用户无需维护第二份配置，即可配置 DeepSeek 或其他兼容 API Provider、选择模型、查看已安装插件、编辑受支持的插件设置、调用 Skill、选择工作区并管理会话。

## 独立数据目录与导入

安装版使用平台应用数据根下的 `open-deepseek-harness-desktop/dsh-home`，源码开发版使用其中的 `development/dsh-home`。两者的 Electron 偏好、浏览器会话数据、日志、解压运行时和 Harness 状态彼此独立，也不再与官方 CLI 共用。自动化和高级启动显式设置的 `DSH_HOME` 仍具有最高优先级。

首次普通启动时，如果发现官方 `~/.dsh`，应用会在 Harness 启动前提供三个选择：把受支持的用户数据导入独立 home、直接复用官方 home，或全新开始。导入与全新开始会进入第二步，让用户保留桌面版管理的默认位置，或选择一个既有空文件夹作为独立配置目录；直接复用仍把经识别的来源本身作为活动 home。自定义目标由 Electron 生成短期不透明选择标识，并在最终路径确认后再次检查为空，渲染层不能提交任意路径。选择页默认跟随操作系统语言，并提供即时中英文切换。导入模式通过拒绝符号链接的白名单处理设置、凭据、会话、工作区元数据、Agent 预设、Skill 与连接状态，且不修改来源；Profile、`node_modules`、锁文件、预装插件 marker、隔离与健康状态、匿名用户 id 均不会复制。应用会另行把 Web Profile 依赖与 bundle 的有序交集记录到 `imported-plugin-restore.v1.json`，并且只提取布尔型 `allowBuilds` 条目。进入客户端后，一次性弹窗与“插件”页面允许用户选择可迁移的 registry、npm alias 和不含凭据的 Git 插件，并通过现有 CLI 串行重新安装；本地来源与带凭据来源会显示原因但不能执行。桌面预置插件先完成核对，同名恢复项显示为客户端已提供。精确构建许可合并到独立 Profile，`false` 优先，任何全局安全降级均被忽略。由于不复制官方锁文件，声明版本范围可能解析到更新的兼容版本。导入只会从复制得到的设置中删除 `ui-onboarding` 完成记录，使独立桌面环境显示自己的设置向导；其余受支持设置保持不变。复用模式会有意共享官方 Profile、插件、构建许可与向导状态，任一应用的修改都会作用于同一批文件。每条插件生命周期命令都会收到选定的 `DSH_HOME`。

完成首次设置后，可在“通用设置”中把活动 home 切换到本构建的独立目录、经识别的官方 `~/.dsh`、另一个经识别的现有 DSH 目录，或选择一个空文件夹创建新配置。原生目录选择器会在 Electron 原子记录目标并完整重启应用前再次验证目录。新选的空文件夹会走普通的全新安装启动流程，包括初始化 Web Profile 与安装预置插件。切换不会复制、合并、移动、覆盖或删除任何数据；各目录分别保留自己的会话、设置、Profile 与插件。启动环境显式提供 `DSH_HOME` 时此控件会禁用，因为启动环境仍拥有最高优先级。

打包版本携带 `bundled-plugins/manifest.json` 中六个经过固定版本和完整性校验的归档。本地打包开始前，pnpm 会通过 registry 条目的 `latest` 稳定 dist-tag 解析版本，从 npm 官方 registry 下载 tarball，核对 registry 提供的 SHA-512，并原子替换整套快照；固定 Git 条目继续保留经过审核的提交和归档。GitHub 打包只解析一次快照，并让所有平台复用同一组文件。Harness 启动前按清单预设包括 Better Sidebar 在内的六个插件，且始终把安装包内的本地归档交给 pnpm，不会从 registry 解析或下载该插件包；普通传递依赖仍由 Profile 的 pnpm store 与解析规则管理。所有平台安装包都不携带 Codex 和 Claude Code：用户在“外部工具”中点击安装后，客户端才从 npm 下载精确版本的官方 `@deepseek-ai/dsh-subagent-codex@0.1.2-alpha.1` 或 `@deepseek-ai/dsh-subagent-claude-code@0.1.2-alpha.1` 及其平台依赖，因此这一步需要联网。开发版使用仓库固定的 pnpm，安装版使用内置 pnpm，两者都不依赖系统 pnpm。持久种子标记在用户卸载后继续保留，因此启动不会擅自装回插件，而用户明确点击发现页或导入插件恢复操作时仍可重新安装。桌面端继续保留精确白名单的延后安装任务和进度能力，供明确的恢复流程复用，但 Better Sidebar 不再自动触发进入后的延后任务。打包不会复制开发电脑 Web profile 中已经安装或更新过的插件。

开发与打包脚本会从 Desktop 和 Web 各自的应用目录执行。每个 Unix 打包命令都会把明确的平台与架构同时传给运行时和 Codex 准备步骤，使 macOS Apple 芯片、macOS Intel、Linux x64 与 Windows x64 的 staging 相互独立。

## 可选终端命令

Windows 与 macOS 安装版可以注册由桌面客户端管理的 `dsh` 命令，但不会把应用私有的 npm 或 pnpm 暴露到系统环境。Windows 安装向导提供默认不勾选的当前用户 PATH 选项，“通用设置”也提供安装、检查修复和移除；静默安装只有显式传入 `/ADDCLI=1` 才会启用。macOS 由“通用设置”在 `.zprofile` 或 `.bash_profile` 中维护带固定标记的精确区块，首次修改前保留一次备份；无法识别的 Shell 只显示手动说明，不自动修改配置。

启动器始终使用应用内置的 Node、Harness 和 pnpm 路径，并在每次调用时读取 `data-home-setup.json`：导入与全新模式跟随首次设置时确认的独立 home（包括可选的自定义空文件夹目标），复用模式跟随用户选择的官方或既有 DSH home。首次目录选择尚未完成、设置文件损坏或内置运行时不完整时，命令会明确失败并提示打开客户端修复，不会静默创建另一套环境。发现其他来源的 `dsh` 时会先显示冲突，只有用户明确确认后才让客户端入口优先。卸载仅删除本应用写入的精确 PATH 条目或 Shell 标记区块。

## 桌面发行包

在架构匹配的 Mac 上使用下列命令构建 ad-hoc 签名、未公证的 macOS 软件包：

```sh
npm run package:desktop:macos:arm64
npm run package:desktop:macos:x64
```

产物写入 `.artifacts/desktop-macos/`。每个安装包在同一个运行时归档中内嵌目标平台的 Harness 生产依赖闭包、Node 24.11.1 和 pnpm 11.7.0；准备脚本仅在固定 Node 归档与官方 SHA-256 一致时接受它。首次启动时，应用会把归档解压到按版本隔离的用户数据目录，使 Node ESM 能看到真实的 `node_modules` 层级。内置 Node 负责启动 Harness，插件管理器通过绝对路径使用内置 pnpm，插件生命周期脚本的 `PATH` 则以内置运行时的 `bin` 目录开头。布局标记会让不完整的安装包缓存自动失效。

在 Windows 上使用下列命令构建未签名的 Windows x64 NSIS 安装程序：

```sh
npm run package:desktop:win:x64
```

安装程序写入 `.artifacts/desktop-windows/DeepSeek-Harness-windows-x64.exe`。它包含官方 Windows x64 Node 24.11.1 可执行文件、pnpm 11.7.0，以及保留真实 `node_modules` 层级且无符号链接的 Harness 生产依赖闭包，用户无需在 `PATH` 中安装 Node 或 pnpm。Harness 环境会把内置运行时放在最前面，保证包含 `%SystemRoot%`、`System32`、Wbem 与 Windows PowerShell，再保留 Electron 启动时继承的用户 PATH。因此插件可以按裸命令名启动 Windows 系统程序和已继承的第三方命令。未出现在这份继承 PATH 中的第三方工具仍不可用；客户端运行期间修改注册表 PATH 或安装新命令后需要重启应用，客户端不会执行 PowerShell profile 来发现其他命令。Electron Builder 运行前，准备脚本会校验官方 Node 归档的 SHA-256、必需的 Windows 原生模块、内置 pnpm 版本，并实际启动 Harness 等待就绪。

在 Linux 上使用下列命令构建 Linux x64 软件包：

```sh
npm run package:desktop:linux:x64
```

DEB 与 RPM 文件写入 `.artifacts/desktop-linux/`。与 macOS 相同，它们包含目标平台原生的 Node、pnpm 与 Harness 生产运行时归档。`Desktop packages` 工作流会运行四个原生任务，上传五种安装包并生成 `SHA256SUMS`。手动运行默认只保留 Actions artifact；仅从 `dsh-v*` 标签明确要求发布，或推送该标签时，才会使用固定平台文件名创建或更新对应 GitHub Release。

## 进程生命周期

Electron 主进程不经过 shell，直接启动 `node apps/cli/lib/bin.js web --host 127.0.0.1 --port 0`。所有打包平台都使用内置的目标平台原生 Node，不使用 Electron 或用户安装的 Node 可执行文件。宿主只把 `dsh web: http://127.0.0.1:<port>` 识别为就绪信号，将 stdout 和 stderr 追加到 Electron 的平台日志目录；应用退出时先发送 `SIGTERM`，超过固定期限后再发送 `SIGKILL`。默认关闭窗口只会隐藏到系统托盘；用户可以改为关闭即请求完整退出，所有显式退出都会等待 Harness 清理。启动期间，单向确定进度条只按桌面环境、内置运行时、Profile 兼容性、预设插件与 Harness 的真实里程碑前进，同时显示当前操作和插件名称；Harness 就绪时达到 100%，随后才把窗口交给 Web GUI。Harness 数据目录尚未确定时，目录选择页跟随系统外观；完成选择后，持久化的 `ui-theme.preference` 会通过同一个 `system`／`light`／`dark` 来源同步加载页、原生边框、自定义顶栏、首次引导和 Web 主界面，并在用户切换主题时继续更新。Harness 在就绪前连续退出三次后会停止自动重启，并显示重试与日志操作。连接页等待十五秒后也会显示同一个固定日志入口，但不会把缓慢启动判为失败。

托盘可以恢复窗口、定位 Harness 日志、切换通知、启用已打包 macOS 的登录启动或退出。崩溃、最终启动失败和恢复通知均可关闭并按事件节流。桌面偏好以原子方式存入以仓库名命名的 Electron `userData`；非法字段会各自恢复安全默认值。

可通过 `DSH_DESKTOP_DSH_BIN` 测试其他已构建的 `dsh` 启动文件。若 Electron 继承的环境无法找到 `node`，可设置 `DSH_DESKTOP_NODE_BIN`。

## 官方源码更新

用户确认后，升级器快进工作树，通过桌面 Harness 所选的 Node 可执行文件运行 `pnpm install --frozen-lockfile`，再执行完整仓库构建。依赖安装与构建子进程不会继承名称包含凭据特征的环境变量。准备失败时，升级器把工作树重置到原提交并重新准备该版本；如果恢复失败，结果会明确报告回退不完整，而不会把旧构建显示为健康状态。升级成功后需重启应用，设置卡片会提供该操作。

只有在测试另一个可信工作树时才设置 `DSH_DESKTOP_SOURCE_ROOT`。没有 Git 工作树的安装包不会运行该升级器；安装包自动更新仍以签名发布元数据和可用回退为前提。

## 打包版本的 Release 发现

打包应用会在启动后和用户明确请求时检查 `https://github.com/flaqai/open-deepseek-harness-desktop` 的 Releases，并识别社区 `odsh-v*`、旧版 `dsh-v*` 和普通 `v*` 标签。稳定版会依据语义版本忽略预发布，即使 GitHub 元数据标记错误也不会接受；预发布客户端可以发现任意更高的预发布或稳定版本。Release 请求超过十五秒后会显示明确错误，不会让设置页一直停留在检查状态。发现可用版本时，“设置”上方只显示这一项，同时继续在“通用设置”中显示版本状态；桌面宿主会隐藏其他插件提供的页脚快捷按钮。支持的 macOS 和 Windows 安装版可以下载并校验所选安装程序，其他目标则会在系统浏览器中打开经过仓库校验的 Release 页面。

## 安全性

渲染进程使用 `nodeIntegration: false`、`contextIsolation: true` 和 `sandbox: true`。导航仅允许 Harness 进程对应的精确回环来源。新开的 HTTPS 窗口交给系统浏览器，其余新窗口全部拒绝。除受监管 Harness 来源的主框架发起的安全剪贴板写入外，渲染进程的权限请求全部拒绝；剪贴板读取和其他所有权限仍保持拒绝。因此，共用客户端可直接使用标准 Web Clipboard API，而不必暴露通用的高权限 Electron bridge。

API 密钥仍由 Harness credentials 服务持有。可选的首次导入只会把凭据文档作为不透明用户数据复制到独立 home；不会解析、显示、记录或删除来源。直接复用则是用户明确选择让桌面版就地使用官方 credentials 服务。沙箱 preload 在源码运行中暴露类型化源码更新调用，并提供桌面能力、偏好更新、固定日志定位、Release 发现、安装包归档精确白名单，以及桌面端拥有的导入插件恢复清单中的不透明 id。Electron 从经过验证的文件解析恢复说明符；渲染层不能通过该桥接提交包说明符、命令或路径。其他任意包名仍必须经过受保护的 Harness 插件服务。Release URL 仅限本仓库，渲染进程不能提供文件路径。在 Windows 和 Linux 上，preload 还会渲染桌面宿主自有标题栏，并将固定的最小化、最大化或还原、关闭意图直接发送给主进程。它不暴露通用命令、文件系统、URL 打开或下载方法。

Profile 插件属于可信的可执行代码。内置包管理运行时让插件的 pnpm 生命周期脚本使用确定的工具版本，但不会对从 registry、Git 仓库、tarball 或本地 checkout 安装的代码提供沙箱或背书。

<a id="cross-platform-release-matrix"></a>

## 跨平台发行矩阵

源码宿主只使用 macOS、Windows 和 Linux 共用的 Electron 与 Node 进程 API。macOS 保留原生标题栏与交通灯按钮；Windows 和 Linux 使用无系统边框 BrowserWindow，其渲染器只承载 36 px 可拖拽标题栏及最小化、最大化或还原、关闭按钮。独立的 `WebContentsView` 从 `y = 36` 开始加载启动页、Harness 和所有插件，因此内容视口天然排除桌面 chrome，全视口 Web 内容也无法渲染到窗口按钮下方。打包工作流会在匹配的原生运行器上构建以下矩阵：

| 平台 | 原生运行器 | 产物 |
| --- | --- | --- |
| macOS arm64 | `macos-15` | DMG 与 ZIP |
| macOS x64 | `macos-15-intel` | DMG 与 ZIP |
| Windows x64 | `windows-2025` | NSIS EXE |
| Linux x64 | `ubuntu-24.04` | DEB 与 RPM |

Windows 任务会把最终 NSIS 产物静默安装到包含空格和中文字符的路径，检查安装后的运行时，使用隔离的应用数据启动已安装程序，并在上传产物前要求 Harness 输出就绪行，同时确认六个启动预设的依赖、bundle 条目、Profile 锁文件和持久化 seed 标记均已生成。Better Sidebar 必须在 Harness 就绪前完成安装，而 Codex 与 Claude Code 在用户操作前必须保持未安装。其他平台仍需完成原生安装、首次启动、退出、子进程清理、目录选择、文件打开、PTY 与沙箱行为的发布验证。只有在发布签名与回滚可用后才添加已签名的更新元数据。

不得通过把整个工作区源码复制进 Electron 来打包仓库。发布产物必须只包含已发布的运行时闭包、生成的第三方声明，且不得包含开发凭证。

## 扩展方向

桌面专属行为保持在 agent loop 之外。插件与 Skill 管理继续使用 Harness 服务和现有设置界面。远程控制应通过 transport 插件接入：它把经过身份验证的 IM 会话映射为持久化 Harness 会话输入，并通过 interaction 服务回传审批或问题答复。微信、Discord 和 Slack 适配器应作为建立在公共 transport 服务之上的独立 Provider 插件，并明确实现身份映射、授权、审计事件、限流和撤销。

后续桌面里程碑依次为已签名安装器、审批请求的原生通知、托盘状态、深层链接和经过身份验证的本地控制端点。内置浏览器、Git 面板、终端和插件市场只应作为由 Harness 服务支撑的 client 插件加入，不能依赖 Electron 专属状态。

## 限制

- 当前源码运行需要已构建的仓库和兼容的 Node 可执行文件。
- macOS arm64 与 x64 的 DMG 和 ZIP 使用 ad-hoc 签名且未公证；首次启动时需要用户在 Gatekeeper 中明确授权。
- Windows x64 安装程序未签名，Linux x64 软件包也没有仓库签名；用户必须核对 `SHA256SUMS` 与发布来源。
- Developer ID 签名、公证、安装包自动安装、Windows/Linux 登录启动、深链接和 IM 控制尚未实现。源码升级器只接受来自官方 `master` 的干净快进更新；本地分叉仍需人工处理。
- Windows 打包任务会在构建运行器上验证安装和 Harness 就绪；macOS 与 Linux 打包任务仍只证明原生组装完成，还需安装与运行时验证。
