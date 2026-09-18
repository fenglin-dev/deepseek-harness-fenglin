$ErrorActionPreference = 'Stop'

$destination = Join-Path $PSScriptRoot '../../../.artifacts/windows-smoke-diagnostics'
New-Item -ItemType Directory -Path $destination -Force | Out-Null

$sources = @(
  @{ Path = (Join-Path $env:RUNNER_TEMP 'DeepSeek Harness AppData'); Name = 'app-data' },
  @{ Path = (Join-Path $env:RUNNER_TEMP 'DeepSeek Harness Native Smoke AppData'); Name = 'native-smoke-app-data' },
  @{ Path = (Join-Path $env:RUNNER_TEMP 'DeepSeek Harness Home'); Name = 'dsh-home' }
)
foreach ($source in $sources) {
  if (Test-Path -LiteralPath $source.Path) {
    Copy-Item -LiteralPath $source.Path -Destination (Join-Path $destination $source.Name) -Recurse -Force
  }
}

$processGuard = Join-Path $env:TEMP 'DeepSeek-Harness-process-guard.log'
if (Test-Path -LiteralPath $processGuard) {
  Copy-Item -LiteralPath $processGuard -Destination (Join-Path $destination 'process-guard.log') -Force
}

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match 'DeepSeek|electron|node|Un_' } |
  Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine |
  ConvertTo-Json -Depth 3 |
  Set-Content -LiteralPath (Join-Path $destination 'processes.json') -Encoding utf8

Write-Host "Collected Windows smoke diagnostics at $destination"
