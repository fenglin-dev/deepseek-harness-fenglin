# DeepSeek Harness 修复版 - 一键应用补丁脚本
# 用法：以管理员身份运行 PowerShell，执行 .\scripts\apply-patches.ps1 -InstallDir "D:\DeepSeek Harness"

param(
    [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DeepSeek Harness 修复版 - 应用补丁" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 确定脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir

# 自动检测安装目录
if (-not $InstallDir) {
    $possibleDirs = @(
        "D:\DeepSeek Harness",
        "C:\Program Files\DeepSeek Harness",
        "C:\Program Files (x86)\DeepSeek Harness"
    )
    foreach ($dir in $possibleDirs) {
        if (Test-Path "$dir\DeepSeek Harness.exe") {
            $InstallDir = $dir
            break
        }
    }
    if (-not $InstallDir) {
        Write-Host "未找到 DeepSeek Harness 安装目录，请手动指定：" -ForegroundColor Yellow
        Write-Host "  .\scripts\apply-patches.ps1 -InstallDir `"C:\path\to\DeepSeek Harness`"" -ForegroundColor White
        Read-Host "按回车键退出"
        exit 1
    }
}

Write-Host "安装目录：$InstallDir" -ForegroundColor Cyan
Write-Host ""

# 检查安装目录
if (-not (Test-Path "$InstallDir\DeepSeek Harness.exe")) {
    Write-Host "错误：安装目录中未找到 DeepSeek Harness.exe" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}

# 检查补丁文件
Write-Host "[1/5] 检查补丁文件..." -ForegroundColor Yellow

$patchFiles = @(
    @{ Path = "patches\app.asar"; Desc = "顶部窗口遮挡修复" },
    @{ Path = "patches\icon.ico"; Desc = "鲸鱼女孩图标" },
    @{ Path = "patches\dshmarket\lib\dsh-cli.js"; Desc = "URL tarball 安装修复" },
    @{ Path = "patches\dshmarket\lib\routes.js"; Desc = "卸载刷新提示修复" },
    @{ Path = "patches\dshmarket\client\client.js"; Desc = "前端刷新提示修复" }
)

foreach ($f in $patchFiles) {
    $path = Join-Path $repoDir $f.Path
    if (-not (Test-Path $path)) {
        Write-Host "错误：补丁文件不存在：$($f.Path)" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "  找到：$($f.Path) ($($f.Desc))" -ForegroundColor Green
}

Write-Host ""

# 备份原文件
Write-Host "[2/5] 备份原文件..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $InstallDir "backup_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# 备份 app.asar
if (Test-Path "$InstallDir\resources\app.asar") {
    Copy-Item "$InstallDir\resources\app.asar" "$backupDir\app.asar" -Force
    Write-Host "  已备份：app.asar" -ForegroundColor Green
}

# 备份 dshmarket
$dshmarketDir = Join-Path $env:APPDATA "open-deepseek-harness-desktop\dsh-home\profiles\web\node_modules\dshmarket"
if (Test-Path $dshmarketDir) {
    $dshBackupDir = Join-Path $backupDir "dshmarket"
    Copy-Item $dshmarketDir $dshBackupDir -Recurse -Force
    Write-Host "  已备份：dshmarket" -ForegroundColor Green
}

Write-Host "备份目录：$backupDir" -ForegroundColor Cyan
Write-Host ""

# 应用 app.asar 修复
Write-Host "[3/5] 应用顶部窗口遮挡修复..." -ForegroundColor Yellow

Copy-Item (Join-Path $repoDir "patches\app.asar") "$InstallDir\resources\app.asar" -Force
Write-Host "  已替换：resources\app.asar" -ForegroundColor Green

# 复制图标
Copy-Item (Join-Path $repoDir "patches\icon.ico") "$InstallDir\DeepSeekHarness-WhaleGirl.ico" -Force
Write-Host "  已复制：DeepSeekHarness-WhaleGirl.ico" -ForegroundColor Green
Write-Host ""

# 应用 dshmarket 修复
Write-Host "[4/5] 应用插件市场修复..." -ForegroundColor Yellow

if (Test-Path $dshmarketDir) {
    Copy-Item (Join-Path $repoDir "patches\dshmarket\lib\dsh-cli.js") "$dshmarketDir\lib\dsh-cli.js" -Force
    Write-Host "  已替换：lib\dsh-cli.js" -ForegroundColor Green

    Copy-Item (Join-Path $repoDir "patches\dshmarket\lib\routes.js") "$dshmarketDir\lib\routes.js" -Force
    Write-Host "  已替换：lib\routes.js" -ForegroundColor Green

    Copy-Item (Join-Path $repoDir "patches\dshmarket\client\client.js") "$dshmarketDir\client\client.js" -Force
    Write-Host "  已替换：client\client.js" -ForegroundColor Green
} else {
    Write-Host "  警告：dshmarket 目录不存在，跳过插件市场修复" -ForegroundColor Yellow
    Write-Host "  请先运行一次 DeepSeek Harness，然后重新运行此脚本" -ForegroundColor Yellow
}

Write-Host ""

# 图标替换提示
Write-Host "[5/5] exe 图标替换..." -ForegroundColor Yellow

Write-Host "  注意：exe 图标替换需要 Resource Hacker" -ForegroundColor Yellow
Write-Host "  请手动使用 Resource Hacker 替换 DeepSeek Harness.exe 的图标：" -ForegroundColor White
Write-Host "    1. 打开 Resource Hacker" -ForegroundColor White
Write-Host "    2. 打开 $InstallDir\DeepSeek Harness.exe" -ForegroundColor White
Write-Host "    3. 右键 Icon Group -> Replace Icon" -ForegroundColor White
Write-Host "    4. 选择 $repoDir\patches\icon.ico" -ForegroundColor White
Write-Host "    5. 保存" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  补丁应用完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "已应用的修复：" -ForegroundColor Cyan
Write-Host "  1. 顶部窗口遮挡修复（app.asar）" -ForegroundColor White
Write-Host "  2. 鲸鱼女孩图标（icon.ico，exe 图标需手动替换）" -ForegroundColor White
Write-Host "  3. 插件市场 URL tarball 安装修复（dsh-cli.js）" -ForegroundColor White
Write-Host "  4. pnpm-lock.yaml 自动清理（dsh-cli.js）" -ForegroundColor White
Write-Host "  5. 卸载插件刷新提示修复（routes.js + client.js）" -ForegroundColor White
Write-Host ""
Write-Host "请重启 DeepSeek Harness 使修复生效。" -ForegroundColor Yellow
Write-Host ""
Write-Host "原文件备份位置：$backupDir" -ForegroundColor Cyan
Write-Host ""
Read-Host "按回车键退出"
