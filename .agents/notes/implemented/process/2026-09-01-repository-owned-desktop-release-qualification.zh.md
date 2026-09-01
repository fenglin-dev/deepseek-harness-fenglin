# Agent Note: 仓库自有的桌面发布资格验证

Status: implemented

[English](2026-09-01-repository-owned-desktop-release-qualification.md) | 中文

## Problem

桌面安装包资格验证横跨 Git 分支、GitHub Actions 原生运行器、平台产物、校验和以及独立的发布决定。临时拼接命令可能混用不同源码提交或预置插件解析结果的产物，也可能把绿色工作流误认为本地交付物，或在没有单独授权时发布标签。

## Decision

仓库使用 [Open DSH Desktop 发布打包 Skill](../../../skills/open-dsh-desktop-release-packaging/SKILL.md) 维护资格验证流程。[`.github/workflows/desktop-packages.yml`](../../../../.github/workflows/desktop-packages.yml) 仍是原生构建和产物名称的事实来源。

Release 准备、分支推送、标签创建和 GitHub Release 发布分别需要授权。安装包资格验证保持 `publish=false`，并且不创建标签。

每组通过验收的平台产物都对应同一个最终 Git 提交。分平台运行还会携带已解析预置插件快照的摘要；源码提交或快照摘要不同的产物不能组成同一组 Release。

仓库自有辅助脚本只把成功工作流的产物下载到临时目录，逐个验证预期安装包的工作流校验和，并在宿主支持时验证 ZIP 或 DMG 结构。脚本会原子创建一个扁平的 `release/<版本号>/` 目录，其中只能包含七个安装包和 `SHA256SUMS`；任何嵌套目录、缺失文件或额外文件都会使验证失败。交付报告提供准确的本地路径，而不会把工作流产物等同于已经下载的文件。

## Alternatives considered

**在一台开发机上构建所有平台。** 跨平台构建不会执行工作流原生运行器负责的平台打包和安装后检查，因此不能替代发布资格验证。

**工作流成功后不下载产物就视为通过。** 绿色运行只能证明 CI 生成了产物，不能证明交给用户的文件已完整下载并且来自预期运行。

**默认由资格验证工作流直接发布。** 把验证与发布合并，会让打包请求隐式修改公开 Release。发布继续作为后续明确授权的独立操作。

## Consequences

Release 打包变得可重复，并会记录源码版本、工作流运行、预置插件解析结果、本地产物路径和校验结果。本地目录包含八个项目管理的文件；GitHub 会自动加入两个源码归档，所以 Release 页面显示十个 Assets。当工作流输入、Artifact 名称或 Release 文件名变化时，Skill 和辅助脚本必须同步更新；辅助脚本会有意拒绝覆盖已有目标目录。
