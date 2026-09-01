# Agent Note: Profile diagnostics and safe startup

Status: implemented

[English](2026-08-25-profile-diagnostic-safe-mode.md) | 中文

## Problem

Profile 软件包安装与 Cordis 启动可能在不同层失败，但普通子进程文本无法可靠区分临时 registry 故障、不安全构建请求、用户配置错误或某一个有缺陷的外部插件。把所有 Loader 错误都视为隔离会掩盖根因，而对每次 ready 前退出都重复重试会延迟确定性故障，并可能让用户无法进入恢复所需的诊断界面。

恢复过程还必须保留两项安全属性：软件包生命周期脚本需要精确的用户决定，供应链等待期不能仅为了完成修复而被降低。

## Decision

`dsh/profile-diagnostic/v2` 是包管理器适配器、Profile 修复、CLI 启动、Cordis Loader 审计、Host 清单与桌面 UI 共用的 incident 格式。记录把产品诊断码与原始错误码分开，标明操作阶段和责任根，沿原始 cause 链保留错误，只声明受保护操作，并在移除凭据和本地路径后保存有界证据。尚未分类的错误仍会显示原始证据，但只提供导出操作。

自动修改仅限能证明失效或停用的状态：fallback link、陈旧 lockfile importer、中断的隔离残留、孤儿 bundle 引用、已知废弃 Loader 行，以及安全的 Host 单例重连。网络、registry 认证、文件占用和等待期失败继续作为可重试环境 incident。只有故障能明确归属且有界修复无法恢复时，才隔离外部根。诊断绝不清空或重写用户凭据和 patch 文档。

客户端模块表导入失败包含足够身份信息，可以在不加载故障插件的情况下隔离：cause 链必须包含缺少供应者的不变量，外层错误必须标明 Loader entry 与模块，而且该模块必须同时是 Profile 的直接依赖和活动外部 bundle。服务端裸模块失败则沿完整 cause 链定位最深层 Loader import。只有最终 entry id 与模块名完全匹配唯一一个直接启用外部 Bundle 的原始声明、模块按 Loader 的 Profile 锚点仍无法解析，并且 Profile 与 home 用户 patch 都没有触及该 entry 时，系统才会自动隔离。这样，scoped 根包的错误 Bundle Patch 若引用不存在的 unscoped 模块，安装后即可立即以 `loader-module-unresolvable` 隔离；来源有歧义或用户修改过的组合仍保持不动并进入安全模式。无框架浏览器内核只把封闭的客户端错误形态通过经过认证的 Host Remote 上报，保持加载页可见并等待桌面监督器。CLI 只移除经过证明的根，运行内置包管理器，复查软件包残留、孤儿 bundle 与 Host 身份冲突，并保留其说明符和 bundle 位置供重试。监督器随后重启普通 Profile，让用户进入主界面并在诊断页看到隔离记录；无法完成验证时恢复 manifest，并改用安装自带的安全 Profile。

每次 `allowBuilds` 变更都是独立的精确键操作。失败的包管理器输出保留 pnpm 给出的精确 registry 包或 Git artifact 键。UI 在白色弹窗中展示根来源、键和风险，保留红色警告图标；黑色确认按钮只写入该键并重试原操作一次。取消不会改变任何策略。Profile 修复绝不设置 `minimumReleaseAge=0`，也不会允许全部构建。

桌面启动通过 `DSH_PROFILE_SAFE_MODE_ON_FAILURE=1` 明确选择安全模式恢复。正常 Profile 的确定性故障会写入 incident，并输出一条稳定 stderr 标记。监督器立即使用 `DSH_PROFILE_SAFE_MODE=1` 重启一次；CLI 随后只组合安装自带模板 bundle，忽略 Profile manifest、外部 bundle 和用户 patch 层。裸模块从安装方维护的 `$DSH_HOME/profiles/node_modules` fallback 开始解析；开发版使用受控 symlink，安装版使用只包含安装依赖闭包的模块代理。安全模式记录跳过内容，并提供普通诊断 UI。启动被限制为一次普通尝试和一次安全模式尝试；安全模式自身失败时监督器立即停止，保留原始 incident 为主证据，并把安全模式错误追加为次级证据。

Host 清单把持久 incident 与实时失败或未解析 Loader entry 合并，并通过生成的 Remote 方法提供精确授权、修复、隔离、恢复、卸载和导出操作。卸载已停用的隔离插件时，系统先清理该插件的陈旧 lockfile importer 与软件包残留，再只从修复报告和当前诊断报告中移除属于它的状态，最后删除持久隔离记录；其他 incident 保持不变。预检还会识别插件已停用且物理安装消失、持久隔离记录也已删除、但上述派生记录仍然存在的状态，以 `profile.quarantine-removal-residue` 报告并安全收敛元数据，不会重新隔离已经移除的插件。浏览器只显示当前 incident。完整双语规则总表位于 [`docs/profile-diagnostics.zh.md`](../../../../docs/profile-diagnostics.zh.md)，导出内容包括机器可读规则清单与版本、脱敏 incident、运行时事实、隔离记录和 Loader 摘要。

## Alternatives considered

**只在 Diagnostics React 组件解析文本。** 这会把策略复制到不可信的展示层，丢失原始 cause 链，而且启动故障时浏览器根本没有挂载，无法提供结果。

**自动授权 Git `prepare` 和已知原生包。** 这种做法安装更方便，却把包管理器安全决定变成不可见副作用。即使上一次安装已经暴露所需键，也仍保留精确确认。

**清理时关闭 minimum release age。** 进程局部覆盖能让停用依赖消失，但会削弱报告 incident 的同一条供应链规则。对已停用根执行有界直接清理，比放宽解析策略更安全。

**恢复前始终重试三次。** 确定性的 Profile 与配置故障不会因相同启动重复而改善。稳定标记允许立即尝试一次安全模式，同时不消耗普通重试预算。

**在原 Profile 中把全部外部行原地禁用后启动。** Profile 本身的解析或组合可能就是故障，而且界面启动前编辑它存在数据丢失风险。安装自带组合避开损坏输入，并把原文件保留给显式修复。

## Consequences

用户可以在不削弱包策略、不删除配置的情况下进入应用并检查失败的外部 Profile。支持导出不携带密钥或绝对用户路径，诊断也能区分“插件已隔离”和“插件为何被隔离”。

实现需要维护第二套刻意精简的启动组合，以及一个版本化 incident 文件。新的 pnpm 或 Cordis 故障需要分类器和聚焦 fixture 才会获得专用产品诊断码；在此之前仍以 `profile.unknown` 可见。安全模式只提供诊断，不提供普通第三方功能；安装自带模板损坏时仍需使用启动失败页。

聚焦覆盖固定分类、cause 归属、脱敏、精确构建授权、等待期保护、安全 Profile 组合、监督器回退、实时 Loader 投影、Remote 导出和诊断展示。桌面启动验收还必须检查新增 Harness 日志中的 ready 标记、可访问的客户端 URL 和持续存活的 Electron 进程。
