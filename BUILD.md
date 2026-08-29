# 构建说明

本文档说明如何从原版 DeepSeek Harness 构建修复版，并打包成自解压安装包。

## 前置要求

- Windows 10 / 11（x64）
- .NET Framework 4.x（用于编译安装程序）
- PowerShell 5.1+
- tar.exe（Windows 10 1803+ 自带）
- Resource Hacker（可选，用于替换 exe 图标）
- 原版 DeepSeek Harness 安装包或已安装的程序

## 构建步骤

### 1. 获取原版程序

从 [flaqai/open-deepseek-harness-desktop](https://github.com/flaqai/open-deepseek-harness-desktop) 下载最新版本并安装，或直接使用已安装的程序。

默认安装目录：`C:\Program Files\DeepSeek Harness` 或 `D:\DeepSeek Harness`

### 2. 应用补丁

运行一键应用脚本：

```powershell
.\scripts\apply-patches.ps1 -InstallDir "D:\DeepSeek Harness"
```

脚本会自动：
1. 备份原文件
2. 替换 `resources/app.asar`（顶部窗口修复）
3. 替换 dshmarket 修复文件
4. 替换 exe 图标（需要 Resource Hacker）

### 3. 手动应用补丁（可选）

如果脚本无法正常工作，可以手动应用：

```powershell
$installDir = "D:\DeepSeek Harness"

# 替换 app.asar
Copy-Item "patches\app.asar" "$installDir\resources\app.asar" -Force

# 替换图标
Copy-Item "patches\icon.ico" "$installDir\DeepSeekHarness-WhaleGirl.ico" -Force

# 替换 dshmarket 修复文件
$dshmarketDir = "$env:APPDATA\open-deepseek-harness-desktop\dsh-home\profiles\web\node_modules\dshmarket"
Copy-Item "patches\dshmarket\lib\dsh-cli.js" "$dshmarketDir\lib\dsh-cli.js" -Force
Copy-Item "patches\dshmarket\lib\routes.js" "$dshmarketDir\lib\routes.js" -Force
Copy-Item "patches\dshmarket\client\client.js" "$dshmarketDir\client\client.js" -Force
```

### 4. 替换 exe 图标（需要 Resource Hacker）

使用 Resource Hacker 替换 `DeepSeek Harness.exe` 的图标组：

1. 打开 Resource Hacker
2. 打开 `DeepSeek Harness.exe`
3. 右键 Icon Group → Replace Icon
4. 选择 `patches/icon.ico`
5. 保存

或使用命令行：

```powershell
ResourceHacker.exe -open "DeepSeek Harness.exe" -save "DeepSeek Harness.exe" -action addoverwrite -res "patches\icon.ico" -mask ICONGROUP,1,
```

### 5. 打包程序文件

将修复后的程序目录打包成 tar.gz：

```powershell
cd "D:\DeepSeek Harness"
tar -czf "D:\program.tar.gz" .
```

### 6. 打包 dshmarket 修复文件

```powershell
cd "patches\dshmarket"
tar -czf "D:\fix.tar.gz" .
```

### 7. 编译安装程序

使用 C# 编译器编译 `installer/Installer.cs`：

```powershell
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /target:winexe /out:installer.exe /win32icon:patches\icon.ico installer\Installer.cs
```

### 8. 合并数据生成自解压安装包

将程序包和修复包附加到 installer.exe 末尾：

```powershell
.\scripts\build-installer.ps1 -ProgramTar "D:\program.tar.gz" -FixTar "D:\fix.tar.gz" -Output "DeepSeek-Harness-Setup.exe"
```

或手动合并：

```powershell
$installerExe = "installer.exe"
$programTar = "program.tar.gz"
$fixTar = "fix.tar.gz"
$output = "DeepSeek-Harness-Setup.exe"

Copy-Item $installerExe $output
$programData = [System.IO.File]::ReadAllBytes($programTar)
$fixData = [System.IO.File]::ReadAllBytes($fixTar)

$fs = [System.IO.File]::Open($output, [System.IO.FileMode]::Append)
$fs.Write($programData, 0, $programData.Length)
$fs.Write([System.BitConverter]::GetBytes([int64]$programData.Length), 0, 8)
$fs.Write($fixData, 0, $fixData.Length)
$fs.Write([System.BitConverter]::GetBytes([int64]$fixData.Length), 0, 8)
$fs.Flush()
$fs.Close()
```

### 9. 验证安装包

```powershell
# 检查文件大小
(Get-Item "DeepSeek-Harness-Setup.exe").Length

# 测试安装（在虚拟机或测试环境中）
.\DeepSeek-Harness-Setup.exe
```

## 自解压安装包数据格式

```
[installer.exe (140 KB)]
[program.tar.gz (226 MB)]
[8 字节 programSize (Int64, 小端)]
[fix.tar.gz (160 KB)]
[8 字节 fixSize (Int64, 小端)]
```

安装程序运行时：
1. 从文件末尾读取 8 字节得到 fixSize
2. 定位到 -8 - fixSize - 8，读取 8 字节得到 programSize
3. 定位到 -8 - fixSize - 8 - programSize，读取 programSize 字节得到 program.tar.gz
4. 跳过 8 字节 programSize，读取 fixSize 字节得到 fix.tar.gz
5. 解压 program.tar.gz 到安装目录
6. 解压 fix.tar.gz 并应用 dshmarket 修复
7. 创建桌面快捷方式

## 常见问题

### Q: 编译安装程序失败？

A: 确保安装了 .NET Framework 4.x，csc.exe 路径正确：
`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`

### Q: tar 命令不存在？

A: Windows 10 1803+ 自带 tar.exe。如果没有，可以安装 7-Zip 或 Git for Windows。

### Q: 安装包运行时报错？

A: 检查数据格式是否正确，使用验证脚本检查 gzip 魔数：
```powershell
$bytes = [System.IO.File]::ReadAllBytes("DeepSeek-Harness-Setup.exe")
# program.tar.gz 应该以 31 139 开头（gzip 魔数）
# fix.tar.gz 应该以 31 139 开头
```
