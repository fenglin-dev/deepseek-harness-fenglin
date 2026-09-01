# Agent Note: 重试 Windows 上 pnpm 的瞬时目录替换失败

Status: implemented

[English](2026-08-30-windows-pnpm-rename-contention.md) | 中文

## Problem

pnpm 在 Windows 上以原子方式替换依赖目录时，插件安装或更新可能失败。杀毒软件和文件索引服务可能短暂持有 pnpm 生成的 `node_modules/*_tmp_<pid>_<sequence>` 源目录句柄；即使 Profile、包来源和用户权限都有效，`rename` 仍会返回 `ERR_PNPM_EPERM`。插件市场和其他调用方都会遇到同一故障，因为它们最终都把修改操作交给 `dsh plugin`。

## Decision

CLI 包管理器执行器只识别同时满足以下条件的诊断：平台为 Windows、包含 `ERR_PNPM_EPERM`、操作为 `rename`、路径位于 `node_modules`，并且带有 pnpm 生成的 `_tmp_<pid>_<sequence>` 后缀。执行器会在等待 500 ms、1.5 s 和 3 s 后，按原参数重试 pnpm。重试成功时，诊断中会保留一条有长度限制的恢复记录；用完重试次数时，则保留 pnpm 最后一次输出，并记录目标目录始终被占用。

普通 `EPERM` 操作、非 Windows 故障、不带 pnpm 临时目录标识的 rename 失败、构建许可错误、网络错误和取消操作都不会进入该恢复流程。

## Verification

CLI 单元测试固定了平台与诊断条件、完整重试时间表、重试耗尽、无关权限错误、包含 Unicode 字符和空格的 Windows 路径，以及一个首次失败、再次执行成功的真实 pnpm 入口子进程。现有的打包入口测试继续验证参数保持不变。

## Alternatives considered

**重试所有 pnpm 故障。**没有采用，因为永久性的权限、包、策略、完整性和配置错误不会因重试恢复，只会让失败变慢、信息更不清晰。

**让每个插件市场或客户端界面自行重试。**没有采用，因为所有受支持的界面最终都把安装交给 CLI；在 CLI 中恢复可以同时覆盖新旧市场版本、客户端直接操作和命令行使用，并避免重复维护分类逻辑。

**每次修改插件前停止活动 Harness。**没有采用，因为普通 JavaScript 插件支持实时安装，停止进程也会关闭发起请求的市场界面，而且本次报告中的纯 JavaScript 依赖故障可能只是瞬时占用。超过有界重试次数后，持久占用仍会明确报告。

## Consequences

Windows 文件系统的瞬时竞争最多会增加 5 秒等待，然后安装成功或返回最终失败。严格的分类条件不会掩盖真实的访问控制问题，同时所有通过 CLI 安装和更新插件的路径都会获得相同恢复能力。如果原生模块或其他进程持续持有句柄，用户仍需先停用插件或停止占用进程，再重新尝试。
