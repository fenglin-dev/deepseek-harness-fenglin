param(
    [Parameter(Mandatory = $true)][string]$NodePath,
    [Parameter(Mandatory = $true)][string]$PnpmPath,
    [ValidateSet('fixture', 'live')][string]$Mode = 'fixture',
    [ValidateRange(1, 30)][int]$Rounds = 10,
    [ValidateSet('cold', 'warm', 'both')][string]$Cache = 'both',
    [string]$SystemProxy = 'DIRECT',
    [string]$OutputDirectory = (Join-Path (Get-Location) 'proxy-ab-reports')
)
$ErrorActionPreference = 'Stop'
$resolvedNode = (Resolve-Path -LiteralPath $NodePath).Path
$resolvedPnpm = (Resolve-Path -LiteralPath $PnpmPath).Path
$benchmarkScript = Join-Path $PSScriptRoot 'benchmark.mjs'
# No ExecutionPolicy, global environment, registry, or npm configuration changes.
& $resolvedNode $benchmarkScript --node $resolvedNode --pnpm $resolvedPnpm --mode $Mode --rounds $Rounds --cache $Cache --system-proxy $SystemProxy --output $OutputDirectory
exit $LASTEXITCODE
