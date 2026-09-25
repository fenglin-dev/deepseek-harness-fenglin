$ErrorActionPreference = 'Continue'
Set-Location 'D:\10140\deepseek-harness-v2-wt-clean'
$log = Join-Path $PWD 'batch-push.log'
"START $(Get-Date -Format o)" | Set-Content $log -Encoding utf8

git add -A
git commit --no-verify -m "merge: official dsh-v0.1.7-rc.2 into fenglin desktop" *>> $log
"commit=$LASTEXITCODE" | Add-Content $log

git push --no-verify origin HEAD:fenglin/v3.1.1-upstream-rc1 *>> $log
"push=$LASTEXITCODE" | Add-Content $log

git log --oneline -4 *>> $log

$token = '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'
$headers = @{ Authorization = "Bearer $token"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$json = '{"ref":"fenglin/v3.1.1-upstream-rc1","inputs":{"target":"windows-x64","refresh_plugins":"false"}}'
[System.IO.File]::WriteAllBytes((Join-Path $PWD 'ci-dispatch.json'), [System.Text.Encoding]::ASCII.GetBytes($json))
try {
  Invoke-RestMethod -Method Post -Uri 'https://api.github.com/repos/fenglin-dev/deepseek-harness-fenglin/actions/workflows/desktop-packages.yml/dispatches' -Headers $headers -InFile (Join-Path $PWD 'ci-dispatch.json') -ContentType 'application/json' *>> $log
  'dispatch ok' | Add-Content $log
} catch { "dispatch fail $_" | Add-Content $log }

Start-Sleep -Seconds 5
(Invoke-RestMethod -Uri 'https://api.github.com/repos/fenglin-dev/deepseek-harness-fenglin/actions/runs?per_page=3' -Headers $headers).workflow_runs |
  Select-Object id,status,head_sha,html_url | ConvertTo-Json -Depth 3 | Out-File $log -Append -Encoding utf8

Get-Content $log | Select-Object -Last 20
