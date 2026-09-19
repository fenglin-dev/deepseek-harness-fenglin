# Agent Note：可选工作运行时的所有权

Status: implemented

[English](2026-09-19-optional-workspace-runtimes.md) | 中文

## 问题

Desktop 过去把 Python 与 Office 依赖视为安装包资源。这会让每个安装包承担对应平台的载荷体积，把 Office Skill 绑定到私有 Desktop Host 的提前安装路径，也无法让不同 Profile 独立选择是否开放 Python 代码执行。如果复用插件安装来替代，又会向渲染层暴露任意包坐标，并把可执行运行时生命周期与 Profile 包生命周期混在一起。

## 决策

`OptionalRuntimeManager` 是 Electron 主进程中负责可选工作运行时的深 module。只有它可以解析经过签名、与版本和目标绑定的元数据，通过应用网络路径下载、续传部分文件、校验大小与 SHA-256、执行 tar 策略、原子解压、拥有共享的 `userData/optional-runtimes` 缓存，并为规范化 Harness home 记录引用。其渲染层接口只接受闭合能力 `office` 与 `ptc`；绝不接受 URL、路径、可执行文件、归档或包坐标。

载荷针对 Windows x64、macOS arm64/x64 与 Linux x64 独立发布。版本化清单根据 Release 中不可变的字节重新生成，并由仅允许 master 的 GitHub 工作流进行证明。GitHub 与 CNB 镜像同名、相同内容的文件。安装包继续携带 Node、pnpm、小型 `@deepseek-ai/dsh-host-workspace-runtime` adapter 与 Office Skill 资源，但不包含 Python 解释器、wheel 或可选运行时归档。

Office 与 PTC 拥有独立 Profile 受管块，只共享已经校验的 Python 载荷。Office 挂载 adapter，由它使用应用选择的绝对路径发布 `load_workspace_dependencies` 与 Office Skill。PTC 直接挂载实验性 CPython 运行时并指定解释器。Windows 不开放 PTC；支持的平台也必须先明确确认风险。

启用和停用进入现有 Desktop Profile 启动事务。在普通客户端与事件分发正常就绪、候选 Profile 提交之前，manager 会保留等待状态。候选启动失败时保留原 Profile 和已经校验的缓存。只有最后一个引用消失后才清理载荷；清理失败会继续保持等待，不能静默重新启用一个已经无人引用的载荷。NAS 只展示不可用状态，因为本决策不扩展远程安装协议。

## 考虑过的替代方案

**继续内置 Python。** 拒绝，因为它会永久增加每个平台安装包的体积，也不给用户独立启用的选择。

**通过 `PluginInstallRequest` 安装 Python。** 拒绝，因为运行时归档拥有不同的校验、共享缓存、续传与清理语义。把它伪装成插件会扩大渲染层权限并模糊所有权。

**在 Electron 偏好中保存一个启用开关。** 拒绝，因为切换 `DSH_HOME` 会让能力状态泄漏到相互独立的 Profile，并使安全卸载无法实现。

**Profile 文件首次激活时立即提交状态。** 拒绝，因为候选 Profile 在渲染层就绪前仍可能失败并回滚。运行时状态必须与 Profile 事务使用同一个经过证明的就绪边界。

## 结果

桌面安装包减少了 Python 载荷体积，但首个启用 Office 或 PTC 的用户必须下载与版本匹配的归档。桌面升级可把旧载荷标记为需要更新，而不会在新载荷通过校验前销毁它。发布完成条件现在包含四份可选归档、签名清单与 CNB 镜像刷新。原生 Office smoke 以及 macOS/Linux PTC smoke 仍属于发布平台职责；聚焦单元测试、真实组合测试、闭包门禁和打包策略测试不能替代它们。
