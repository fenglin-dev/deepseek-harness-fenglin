# pnpm 与 Cordis Profile 诊断

[English](profile-diagnostics.md) | 中文

本文档定义 `dsh/profile-diagnostic/v2` 表示的问题、每类问题保留的证据，以及桌面客户端可以提供的操作。“诊断”页面只展示当前真实 incident；本文档是完整规则总表，并由导出的诊断报告引用。

## 诊断记录

每个问题都包含稳定的产品诊断码、存在时的 pnpm 或 Node 原始错误码、来源子系统、操作阶段、严重程度、可安全展示的归属、允许操作和有界证据。阶段包括 `preflight`、`install`、`resolve`、`compose`、`import`、`apply`、`activate`、`runtime` 与 `repair`；来源包括 `pnpm`、`profile`、`loader`、`cordis`、`runtime` 与 `config`。

归属可以指出直接 Profile 依赖、依赖链、Loader entry id、模块名或配置类型，但绝不包含绝对本地路径。证据沿完整 JavaScript `cause` 链保留，每项最多 8 KiB，并脱敏 Harness home、用户 home、API key、Token、密码、Cookie、Authorization 值和 DeepSeek 风格密钥。无法识别的原始错误码和证据归入 `profile.unknown`，诊断引擎不会凭空编造修复方式。

## 操作策略

| 策略 | 适用问题 | 行为 |
|---|---|---|
| 自动修复 | 失效 fallback link 或 junction、停用的 lockfile importer、中断的隔离残留、孤儿 bundle 引用、已知废弃 Loader 行，以及可验证的 Host 单例重连 | 备份或保留持久 incident，执行有界变更，并在报告成功前重新检查 |
| 必须确认 | 对 pnpm `allowBuilds` 的任何修改 | 展示根插件、精确包或 Git artifact 键、脚本原因与风险；只授权该键并重试一次 |
| 只重试不隔离 | 网络错误、registry 错误、401/403、等待期拒绝和临时文件占用 | 保留插件和供应链设置，不隔离无关根插件 |
| 隔离 | 能归属到单个外部根插件，且安全收敛或重试仍无法修复 import、apply、activate 或 Host 身份问题 | 从活动依赖和 bundle 组合移除该根，保留其说明符与 bundle 位置，并提供恢复或卸载操作 |
| 保留并手动修复 | 用户凭据、Profile YAML/JSON、未知 patch 和归属不明确的重复注册 | 保留文件，尽量指出字段或 entry，并提供打开配置与导出；绝不静默清空或重写 |

产品绝不会设置 `dangerouslyAllowAllBuilds`，不会为了完成修复而把 `minimumReleaseAge` 降为 0，也不会把 registry 认证或网络错误当成插件有缺陷的证据。随安装包提供的内置 bundle 可以在其受审查清单中携带构建策略；用户 Profile 的变化仍必须经过精确键确认。

## 已实际遇到的规则

| 产品诊断码 | 原始错误码或证据 | 含义与默认处理 |
|---|---|---|
| `pnpm.build-script-blocked` | `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`、`ERR_PNPM_IGNORED_BUILDS`、`prepare`、`allowBuilds` | 某个依赖希望执行生命周期代码。保留精确键，要求确认后只重试原操作一次；取消时让插件保持停用或隔离。 |
| `pnpm.minimum-release-age` | `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`、`ERR_PNPM_NO_MATURE_MATCHING_VERSION`、`ERR_PNPM_MISSING_TIME` | 供应链等待期拒绝了一个或多个版本。展示包与版本证据，保留保护并等待后重试。 |
| `pnpm.unexpected-store` | `ERR_PNPM_UNEXPECTED_STORE`、`ERR_PNPM_UNEXPECTED_VIRTUAL_STORE`、`ERR_PNPM_STORE_BREAKING_CHANGE` | Profile 曾由不同 pnpm store 或 virtual-store 格式安装。使用产品内置 pnpm 11.7.0，只重建受影响的 Profile 依赖目录。 |
| `pnpm.network` | `ECONNRESET`、`ETIMEDOUT`、`ENOTFOUND`、`EAI_AGAIN`、socket 或 registry mirror 失败 | 作为环境错误处理。重试；必要时只修复 Profile 局部 registry 配置。 |
| `pnpm.registry-auth` | `ERR_PNPM_FETCH_401`、`ERR_PNPM_FETCH_403`、registry 401/403 | 保留插件，并要求正确的 registry 凭据或 scope 配置。 |
| `profile.host-dependency-conflict` | Profile 根插件把身份敏感 Host 包解析到另一份物理副本 | 展示完整依赖链。只有版本范围和已安装身份能证明安全收敛时才重连，否则隔离责任根插件。 |
| `profile.orphaned-bundle` | 软件包不再是可管理依赖，但仍存在于 `dsh.profile.bundles` | 移除失效 bundle 引用，不重新安装用户已经卸载的插件。 |
| `profile.quarantine-removal-residue` | 停用插件、活动 manifest 条目和持久隔离记录都已消失，但修复报告、诊断报告、lockfile importer 或不完整软件包目录仍引用它 | 只移除陈旧派生状态，不重装或再次隔离已消失的插件，并保留其他无关 incident。 |
| `profile.module-resolution` | `failed to import loader entry`、`ERR_MODULE_NOT_FOUND`、`missed the module table`、模块未实体化或缺少 package factory | 遍历完整 cause 链并归属最深层 Loader entry。若最终 entry 与唯一一个直接启用的外部 Bundle 原始声明完全一致，但裸模块无法解析，则安装后立即以 `loader-module-unresolvable` 隔离该根包；用户改写或来源有歧义时只进入诊断安全模式，不自动移除。 |
| `loader.duplicate-entry` 与 `loader.duplicate-registration` | Loader id、配置路径、persona、route、prompt section、service 或进程全局单例重复 | 身份能证明是旧行时移除；否则标明冲突双方并隔离外部根，或要求手动修复配置。 |
| `loader.lifecycle-failed` | `failed to apply loader entry`、import、mount、apply、activate 或 fiber 失败 | 沿 `cause` 走到最内层，归属 entry 与模块；只有重试或收敛无法修复外部根时才隔离。 |
| `config.credentials-invalid` | `.credentials.yaml` 解析或字段类型错误，包括非字符串 `version` | 报告字段路径和期望类型，保持用户凭据文档不变；阻断启动时进入诊断安全模式。 |
| `runtime.launch-invalid` | 内置 pnpm 或 Node 缺失、`DSH_PNPM_BIN` 无效、运行时路径错误，或 Harness 在 ready 前退出 | 校验结构化可执行文件与参数数组。包含空格或非 ASCII 字符的路径绝不经过拼接的 shell 命令。 |

## pnpm 规则预防

| 产品诊断码 | 覆盖的 pnpm 规则 |
|---|---|
| `pnpm.lockfile` | lockfile 过期、缺失依赖、格式版本不兼容和 importer manifest 缺失 |
| `pnpm.integrity` | tarball integrity 或大小异常、store 内容被修改和软件包内容异常 |
| `pnpm.patch-failed` | patch 应用失败或 patch 目标无效 |
| `pnpm.version-resolution` | 无匹配版本、workspace 内无匹配版本和发布通道不匹配 |
| `pnpm.runtime-version` | Node engine 不支持、Node 版本无效、modules 布局不兼容和 virtual store 不匹配 |
| `pnpm.peer-dependency` | Peer 依赖问题、不安全 peer diamond 和 `dedupePeerDependents` 收敛失败 |
| `pnpm.supply-chain` | trust downgrade、缺失发布时间、非法 convergence override 和被禁止的传递型 Git 或 path 依赖 |
| `pnpm.invalid-dependency` | 非法包名和所有 resolver 都无法处理的依赖说明符 |
| `pnpm.config-parse` | 非法 `pnpm-workspace.yaml`、`package.json`、JSON 或 JSON5 配置 |

分类器遵循 pnpm 公开的[错误码](https://pnpm.io/errors)、[依赖解析](https://pnpm.io/settings/dependency-resolution)、[构建脚本安全](https://pnpm.io/settings/build)和[Peer 依赖](https://pnpm.io/settings/peer-dependencies)规则。不同 pnpm 版本对同一规则的措辞可能不同，因此产品诊断码保持稳定，而 `nativeCode` 和脱敏证据保留原始事实。

## Profile 与 Cordis 规则预防

| 产品诊断码 | 覆盖的 Profile 与 Loader 规则 |
|---|---|
| `profile.bundle-invalid` | bundle 包缺少 `dsh.bundle.patch`、bundle patch 声明无效，或依赖不是有效 bundle |
| `profile.module-resolution` | 相对模块越过允许基准、裸模块无法从安装/Profile 锚点解析、客户端请求未进入模块表，或已启用模块始终没有 Fiber |
| `profile.patch-invalid` | patch 目标不存在、patch 文档为空、顶层类型无效、`!!js` 插值失败，或 Profile/home patch 损坏 |
| `loader.unresolved-injection` | 必需服务一直不可用，Fiber 在结算后仍处于 pending |
| `loader.rollback-failed` | Loader update、remove、move、HMR 或事务回滚失败 |
| `loader.duplicate-registration` | 进程全局 service、route、prompt section、persona、配置路径或单例插件重复注册 |

当调用方能证明文件职责时，Profile 解析错误会标记为 `profile-manifest`、`workspace`、`lockfile`、`profile-patch`、`home-patch` 或 `credentials`。未知用户文件会被保留，绝不进行推测性规范化。

## 诊断安全模式

桌面启动会设置允许受保护恢复的显式策略。客户端模块表导入失败会先归属到 Loader entry 与精确的直接外部 bundle。由于该故障发生在 Host ready 之后、客户端插件树建立之前，无框架浏览器内核会调用一个经过认证、参数封闭的恢复 Remote，并让加载页保持可见。Host 再次验证归属、活动 manifest 条目、软件包移除和最终依赖图后，CLI 保留可重试隔离记录，监督器在不加载该 bundle 的情况下重启普通 Profile。用户随后无感进入主界面，并能在诊断页看到被隔离插件及根因。彻底卸载这个已停用插件时，系统还会清理其陈旧 lockfile importer 和软件包残留，在不丢弃其他 incident 的前提下收敛对应修复与诊断记录，并最后删除隔离记录。旧版或中断的卸载若已经删除插件和隔离记录、却留下这些派生引用，系统会以 `profile.quarantine-removal-residue` 报告；启动修复与诊断操作只清理陈旧元数据，不会再次隔离已经消失的插件。其他确定性的 Profile、Loader、Cordis、凭据或运行时配置 incident 会写入脱敏 v2 incident，并输出一个稳定的可恢复标记。监督器随后立即重启一次，使用安装包自带的诊断 Profile；该 Profile 只加载随产品发布的模板 bundle，跳过外部 bundle 与用户 patch 层。

安全模式记录进入时间、跳过的 bundle 名称，以及是否跳过用户层。其裸模块解析以安装方维护的 `$DSH_HOME/profiles/node_modules` fallback 为锚点，不再使用活动 Profile 或 CLI 包。主界面的“诊断”页面保持可用，展示根因、证据、风险和受保护操作。修复成功后重新启动正常 Profile。启动最多执行一次普通尝试和一次安全模式尝试；若安装自带的诊断 Profile 也失败，监督器会立即停止，保留原始 Profile incident 作为主证据，并把安全模式失败追加为次级证据。

## 导出

`dsh/profile-diagnostic-export/v1` 包含 v2 问题、完整的机器可读规则清单与版本、平台、架构、Node 版本、所选 Profile 名称、安全模式摘要、隔离记录和当前 Loader entry 摘要。它不包含凭据正文、环境变量值、完整 diff、绝对用户路径、包管理器命令拼接或无界堆栈。当前导出只是某一时刻的支持资料，不是配置备份，也不是授权令牌。
