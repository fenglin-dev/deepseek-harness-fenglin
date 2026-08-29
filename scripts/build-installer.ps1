# 构建自解压安装包脚本
# 用法：.\scripts\build-installer.ps1 -ProgramTar "program.tar.gz" -FixTar "fix.tar.gz" -Output "DeepSeek-Harness-Setup.exe"

param(
    [Parameter(Mandatory=$true)]
    [string]$ProgramTar,

    [Parameter(Mandatory=$true)]
    [string]$FixTar,

    [string]$Output = "DeepSeek-Harness-Setup.exe",

    [string]$Icon = ""
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  构建 DeepSeek Harness 自解压安装包" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir

# 检查输入文件
if (-not (Test-Path $ProgramTar)) {
    Write-Host "错误：程序包不存在：$ProgramTar" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $FixTar)) {
    Write-Host "错误：修复包不存在：$FixTar" -ForegroundColor Red
    exit 1
}

# 检查 gzip 魔数
$progBytes = [System.IO.File]::ReadAllBytes($ProgramTar)
if ($progBytes[0] -ne 0x1F -or $progBytes[1] -ne 0x8B) {
    Write-Host "错误：程序包不是有效的 gzip 格式" -ForegroundColor Red
    exit 1
}
$fixBytes = [System.IO.File]::ReadAllBytes($FixTar)
if ($fixBytes[0] -ne 0x1F -or $fixBytes[1] -ne 0x8B) {
    Write-Host "错误：修复包不是有效的 gzip 格式" -ForegroundColor Red
    exit 1
}

Write-Host "程序包：$ProgramTar ($([math]::Round($progBytes.Length/1MB, 2)) MB)" -ForegroundColor Green
Write-Host "修复包：$FixTar ($([math]::Round($fixBytes.Length/1KB, 1)) KB)" -ForegroundColor Green
Write-Host ""

# 编译安装程序
Write-Host "[1/3] 编译安装程序..." -ForegroundColor Yellow

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    Write-Host "错误：未找到 csc.exe，请安装 .NET Framework 4.x" -ForegroundColor Red
    exit 1
}

$installerCs = Join-Path $repoDir "installer\Installer.cs"
if (-not (Test-Path $installerCs)) {
    Write-Host "错误：未找到 Installer.cs" -ForegroundColor Red
    exit 1
}

$installerExe = Join-Path $env:TEMP "dsh_installer.exe"
if (Test-Path $installerExe) { Remove-Item $installerExe -Force }

$cscArgs = @("/target:winexe", "/out:$installerExe", $installerCs)
if ($Icon -and (Test-Path $Icon)) {
    $cscArgs += "/win32icon:$Icon"
    Write-Host "  使用图标：$Icon" -ForegroundColor Cyan
}

& $csc @cscArgs 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误：编译安装程序失败" -ForegroundColor Red
    & $csc @cscArgs 2>&1
    exit 1
}

Write-Host "  编译成功：$([math]::Round((Get-Item $installerExe).Length/1KB, 1)) KB" -ForegroundColor Green
Write-Host ""

# 合并数据
Write-Host "[2/3] 合并数据..." -ForegroundColor Yellow

if (Test-Path $Output) { Remove-Item $Output -Force }
Copy-Item $installerExe $Output

$fs = [System.IO.File]::Open($Output, [System.IO.FileMode]::Append)
$fs.Write($progBytes, 0, $progBytes.Length)
$fs.Write([System.BitConverter]::GetBytes([int64]$progBytes.Length), 0, 8)
$fs.Write($fixBytes, 0, $fixBytes.Length)
$fs.Write([System.BitConverter]::GetBytes([int64]$fixBytes.Length), 0, 8)
$fs.Flush()
$fs.Close()

Write-Host "  合并完成：$([math]::Round((Get-Item $Output).Length/1MB, 2)) MB" -ForegroundColor Green
Write-Host ""

# 验证
Write-Host "[3/3] 验证安装包..." -ForegroundColor Yellow

$bytes = [System.IO.File]::ReadAllBytes($Output)
$fs2 = [System.IO.File]::OpenRead($Output)
$br = New-Object System.IO.BinaryReader($fs2)

$fs2.Seek(-8, [System.IO.SeekOrigin]::End) | Out-Null
$fixSize = $br.ReadInt64()
$fs2.Seek(-8 - $fixSize - 8, [System.IO.SeekOrigin]::End) | Out-Null
$programSize = $br.ReadInt64()
$dataStart = $bytes.Length - 8 - $fixSize - 8 - $programSize

$fs2.Seek($dataStart, [System.IO.SeekOrigin]::Begin) | Out-Null
$pData = $br.ReadBytes([int]$programSize)
$fs2.Seek(8, [System.IO.SeekOrigin]::Current) | Out-Null
$fData = $br.ReadBytes([int]$fixSize)

$br.Close()
$fs2.Close()

$valid = $true
if ($pData[0] -ne 0x1F -or $pData[1] -ne 0x8B) {
    Write-Host "  错误：program.tar.gz gzip 魔数错误" -ForegroundColor Red
    $valid = $false
} else {
    Write-Host "  program.tar.gz gzip 魔数正确" -ForegroundColor Green
}

if ($fData[0] -ne 0x1F -or $fData[1] -ne 0x8B) {
    Write-Host "  错误：fix.tar.gz gzip 魔数错误" -ForegroundColor Red
    $valid = $false
} else {
    Write-Host "  fix.tar.gz gzip 魔数正确" -ForegroundColor Green
}

$expectedSize = $dataStart + $programSize + 8 + $fixSize + 8
if ($expectedSize -ne $bytes.Length) {
    Write-Host "  错误：数据大小不匹配（预期 $expectedSize，实际 $($bytes.Length)）" -ForegroundColor Red
    $valid = $false
} else {
    Write-Host "  数据大小匹配" -ForegroundColor Green
}

# 清理临时文件
Remove-Item $installerExe -Force -ErrorAction SilentlyContinue

Write-Host ""
if ($valid) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  构建成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "输出文件：$Output" -ForegroundColor Cyan
    Write-Host "文件大小：$([math]::Round($bytes.Length/1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "数据格式：" -ForegroundColor Cyan
    Write-Host "  [installer.exe] ($dataStart 字节)" -ForegroundColor White
    Write-Host "  [program.tar.gz] ($programSize 字节)" -ForegroundColor White
    Write-Host "  [8 字节 programSize]" -ForegroundColor White
    Write-Host "  [fix.tar.gz] ($fixSize 字节)" -ForegroundColor White
    Write-Host "  [8 字节 fixSize]" -ForegroundColor White
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  构建失败！" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
