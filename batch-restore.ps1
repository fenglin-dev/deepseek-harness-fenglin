$ErrorActionPreference = 'Continue'
Set-Location 'D:\10140\deepseek-harness-v2-wt-clean'
$log = Join-Path $PWD 'batch-restore.log'
"START $(Get-Date -Format o)" | Set-Content $log -Encoding utf8
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

"=== restore fenglin app-boot ===" | Add-Content $log
& $env:MIMO_PYTHON 'tmp-restore-fenglin-appboot.py' *>> $log

"=== tsc host ===" | Add-Content $log
& $env:MIMO_NODE './node_modules/typescript/bin/tsc' -b tsconfig.host.json --pretty false *>> $log
$hostExit = $LASTEXITCODE
"host=$hostExit" | Add-Content $log

"=== tsc desktop ===" | Add-Content $log
& $env:MIMO_NODE './node_modules/typescript/bin/tsc' -p apps/desktop/tsconfig.json --noEmit --pretty false *>> $log
$deskExit = $LASTEXITCODE
"desk=$deskExit" | Add-Content $log

git add -A
git commit -m "merge: keep fenglin app-boot exports with official rc.2 core" *>> $log
"commit=$LASTEXITCODE" | Add-Content $log

git push origin HEAD:fenglin/v3.1.1-upstream-rc1 *>> $log
"push=$LASTEXITCODE" | Add-Content $log

$token = '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'
$headers = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$json = '{"ref":"fenglin/v3.1.1-upstream-rc1","inputs":{"target":"windows-x64","refresh_plugins":"false"}}'
[System.IO.File]::WriteAllBytes((Join-Path $PWD 'ci-dispatch.json'), [System.Text.Encoding]::ASCII.GetBytes($json))
try {
  Invoke-RestMethod -Method Post -Uri 'https://api.github.com/repos/fenglin-dev/deepseek-harness-fenglin/actions/workflows/desktop-packages.yml/dispatches' -Headers $headers -InFile (Join-Path $PWD 'ci-dispatch.json') -ContentType 'application/json' *>> $log
  'dispatch ok' | Add-Content $log
} catch { "dispatch fail $_" | Add-Content $log }

"END host=$hostExit desk=$deskExit" | Add-Content $log
Get-Content $log | Select-Object -Last 15
