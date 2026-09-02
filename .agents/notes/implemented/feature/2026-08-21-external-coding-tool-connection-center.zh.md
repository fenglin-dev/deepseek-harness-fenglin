# Agent Note: 外部编码工具连接中心

Status: implemented

[English](2026-08-21-external-coding-tool-connection-center.md) | 中文

## 问题

把编码产品作为 Harness 子 agent 使用需要同时满足两个事实：其 Provider bundle 必须属于活动 Web profile，并且所选 agent preset 必须启用对应 Provider 的工具行。插件清单会展示前一个事实，但 agent preset 选择器只会在用户已经知道该检查哪个 preset 后展示后一个事实。因此，即便 Codex Provider 安装成功，实际入口仍很难发现；而把每个产品名称都做成可安装项，又会错误暗示运行时具备并不存在的 Provider 支持。

## 决策

Settings 在现有产品分区旁提供一个根 `external-tools` 分区。它为每个编码产品展示单一连接流程，并并行读取 Host 所有的两份状态：实时插件清单与 Host 连接设置。Codex 与 Claude Code 可操作，因为本版本存在对应的官方 Provider bundle。安装使用已经与应用基线验证过的精确 Provider 发布版本；安装完成后要求完整重启，因为运行中的 Loader 树不可修改。Provider 坐标独立于桌面端版本选择，因为上游发布源码版本并不保证 npm 存在同版本软件包。Hermes 与 Trae 在正式 Provider bundle 和工具行出现前保持为不可操作的占位项。

打包门禁读取与内置回退相同的兼容清单，并在生成任何桌面产物前查询 npm 官方 registry。它要求每个 Provider 坐标及经过审核的 SHA-512 完全匹配，要求 Provider 依赖经过审核的原生产品运行时，并把每个可选平台包解析为带完整性元数据的精确已发布版本。滚动远程副本由仓库专用 GitHub Actions 工作流无密钥签名。Desktop main 只有在 Sigstore 验证 GitHub OIDC 签发方及精确仓库/工作流/分支身份，并且 in-toto 主体摘要、schema、桌面版本线、有效期和闭集工具全部匹配后才会采用。程序只原子缓存已经验证的文档；刷新失败或不可用时先尝试签名缓存，再回退到安装包内置的精确坐标，永远不会跟随 dist-tag。渲染层只向解析器提交闭集工具 id，不会获得路径、命令或通用软件包解析能力。

连接受支持的产品会独立于 Session preset 身份保存一项 Host 设置。`AgentPresets` 负责安全边界投影：Host 注册唯一的产品专用 projector，每个启用的 `dsh-tool-subagent` 实例挂载到合格 Agent 自己的 scope。`standard`、`code` 与 `cordis` 参与投影，`minimal` 保持不变。空闲 Agent 立即更新；已经运行的 Agent 保留精确的当前工具 fiber，直到回到 idle。从 idle 同步进入 running 的状态变化会在提示词组装前再次对齐，因此恢复的历史 Session 会从下一轮获得当前连接，而运行中的请求不会被修改。

每个模型请求 step 使用的精确动态投影都会记录为一次 `external-tools/resolved`。某个 Session 曾使用连接工具后，后续断开的 step 会记录空列表。同一个 step 的重试不会重复记录，因此模型可见工具可以从 Session 重建，而不是从可变的当前设置推断。

浏览器永远不会收到文件系统路径或组装文档。有类型的 `pluginInventory` Remote 只接受闭集中的 `codex` 与 `claude-code` id，并把 preset 所有权委托给 `AgentPresets`。这样，软件包安装、roster 创作与 UI 展示仍由各自既有所有者负责，同时产品获得一个统一且容易发现的入口。

清单单独记录审核坐标时使用的源码版本，不把它等同于 Provider 版本。打包会拒绝过期的源码审核基线或运行时不匹配，而不假定合并上游就等于审核了桌面兼容性；registry 检查仍拒绝未发布坐标。桌面端在每次安装请求时刷新，只共享进行中的查询，因此断网失败和成功响应都不会把选择冻结到应用退出。每次查询都会执行签名、有效期、版本线和修订回退检查。测试覆盖网络恢复、同一进程采用新签名修订版，以及并发请求共用一次刷新。

## 考虑过的替代方案

**把连接按钮放进 Agent presets。** 否决，因为 Provider 安装与 Loader 激活属于 profile 部署状态，而不是 preset 创作状态。一个停用的工具行无法在不把插件管理能力引入 roster UI 的前提下，说明 Provider 是缺失、仍在安装，还是正等待重启。

**复制或修改 `standard`。** 否决，因为两种做法都会继续把连接状态耦合到 Session preset 选择。受管副本还会与后续随附 preset 改进产生偏离，而且已有历史 Session 仍无法使用刚连接的产品。

**重组运行中 Session 的整个 preset。** 否决，因为这会同时改变提示词 section、Skill、监听器、隔离服务和工具。需求只是在下一次安全请求边界增加产品工具；替换完整组装会让既有能力失去对应项，并可能中断活动工作。

**为 Hermes 与 Trae 提供通用软件包输入框。** 否决，因为产品名称不能证明存在兼容的 `SubagentProvider`、工具行、软件包来源或协议契约。不可操作的占位项可以表达预期导航，却不会把任意软件包安装伪装成连接承诺。

**安装 npm 未带版本的 latest tag。** 否决，因为 dist-tag 可能滞后，也可能独立于桌面基线移动。Provider 协议兼容性属于打包应用的一部分，因此此入口固定匹配的发行版本。

**根据桌面端版本拼接 Provider 版本。** 否决，因为上游可以发布源码标签，却不发布该版本的所有软件包。即使存在经过审核的兼容 Provider 发布版本，拼接出的精确请求也可能永远无法解析。

**每次 Provider 重新发布都要求发布新版桌面端。** 否决，因为已经发布的客户端仍可能兼容新的经过审核的 Provider 坐标。签名滚动清单可以更新这项闭集映射，同时不扩大安装器能力，也不信任未签名的 Release 资源。

**提交长期私有签名密钥。** 否决，因为仓库访问权也会同时暴露兼容清单签名权。GitHub OIDC 为每次发布提供短期 Fulcio 证书，客户端固定签发方与工作流身份，并要求通过带 Rekor 证据的 Sigstore 验证。

## 后果

用户无需预先知道软件包名或 preset 工具行就能发现 Codex 与 Claude Code；连接现在表示已有或新建完整模式 Session 从下一轮开始可用。产品专用提示会把这些工具与同名 shell 可执行文件区分开；缺失的旧 `external-tools` 预设 id 则回退到 `standard`，使旧桌面会话仍可恢复。闭集 Remote 与唯一 projector 防止便利界面退化成任意 preset 编辑器或 shell 启动器。通用 roster 不依赖具体产品工具包；桌面 Host 拥有固定的 Provider/工具绑定。新增另一个可操作产品需要正式 Provider bundle、闭集 Host id、明确的适用模式决策、本地化产品文案，以及覆盖边界投影、持久请求记录、Remote 注册与 Settings 交互的聚焦测试。

## 验证

preset 测试固定适用模式、独立设置、已有会话投影、旧预设回退、断开移除、minimal 排除、重复 projector 拒绝，以及每个 step 唯一的持久能力记录。真实 Web composition 测试会启动已安装的 Codex bundle，并断言 `standard` 同时得到 `subagent_codex` schema 与模型提示。Host 测试固定有类型的 Remote 清单，客户端测试固定本地化分区注册、闭集工具 id 安装、受支持操作、诚实占位项与 Codex 连接状态变化。桌面测试覆盖清单解析、签名主体摘要匹配、有效期与版本线拒绝、缓存所有权和精确内置回退。在线 registry 门禁验证两个 Provider、原生运行时、每个声明的平台包与经过审核的 SHA-512。类型检查覆盖 projector 依赖图、生成的 Remote 图、preload IPC 与桌面客户端组装。
