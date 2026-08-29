# 修改记录

## v1.0.0 (2026-08-29)

### 新增功能

- 鲸鱼女孩图标替换（exe、快捷方式、托盘、窗口）
- 自解压安装包（C# / .NET Framework 4.x）
- 一键应用补丁脚本（PowerShell）
- 构建安装包脚本（PowerShell）

### Bug 修复

#### 1. 顶部窗口遮挡界面

- **文件：** `resources/app.asar`
- **问题：** 程序顶部标题栏遮挡下方 DeepSeek UI 内容
- **修复：** 修改窗口配置，调整标题栏位置

#### 2. 插件市场安装 URL tarball 插件失败

- **文件：** `dshmarket/lib/dsh-cli.js`
- **错误：** `ERR_PNPM_MISSING_TARBALL_INTEGRITY`
- **根本原因：**
  - pnpm 11+ 要求 URL tarball 的 lockfile 条目必须包含 `integrity` 字段
  - GitHub codeload tarball 不提供 integrity
  - 原代码 `if (pluginArgs === 'add')` 条件错误（`pluginArgs` 是数组不是字符串），导致 URL tarball 下载逻辑永远不执行
- **修复：**
  1. 修正条件判断：`if (pluginArgs === 'add')` → `if (pluginArgs[0] === 'add')`
  2. 安装 URL tarball 时先下载到本地，再用 `file:` 协议安装
  3. 安装前自动备份并移除 `pnpm-lock.yaml`，让 pnpm 重新生成

#### 3. 卸载插件后不提示刷新页面

- **文件：** `dshmarket/lib/routes.js`、`dshmarket/client/client.js`
- **问题：** 启用/关闭插件会提示刷新，但卸载后不提示，导致插件已卸载但因缓存仍在界面运行
- **修复：** 在卸载路由中添加刷新提示逻辑，与启用/关闭保持一致

### 技术改进

- 自解压安装包数据格式：`[installer.exe][program.tar.gz][8B programSize][fix.tar.gz][8B fixSize]`
- 安装程序自动检测 dshmarket 目录并应用修复
- 补丁应用脚本自动备份原文件
- 构建脚本自动验证 gzip 魔数和数据大小

### 已知限制

- 部分昼夜更替主题不支持（兼容性问题，非本修复范围）
- exe 图标替换需要 Resource Hacker（脚本会提示手动操作）
- dshmarket 目录不存在时需先运行一次程序
- 安装包仅支持 Windows

### 致谢

- 原项目：[flaqai/open-deepseek-harness-desktop](https://github.com/flaqai/open-deepseek-harness-desktop)
- 插件市场：[dsh-market/dsh-market](https://github.com/dsh-market/dsh-market)
- 图标来源：deepseek-whale-girl-icon
