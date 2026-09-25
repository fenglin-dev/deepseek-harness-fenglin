$ErrorActionPreference = 'Continue'
Set-Location 'D:\10140\deepseek-harness-v2-wt-clean'

# remove tmp artifacts that block git
Get-ChildItem -Filter 'tmp-*' -File | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Filter '*.log' -File | Where-Object { $_.Name -like 'tmp-*' } | Remove-Item -Force -ErrorAction SilentlyContinue

git reset
git add -A -- ':!tmp-*' ':!*.log'
git status -sb | Select-Object -First 5

git -c core.editor=true commit -m "merge: official dsh-v0.1.7-rc.2 into fenglin desktop"
Write-Host "commit exit=$LASTEXITCODE"
git log --oneline -3

git push origin HEAD:fenglin/v3.1.1-upstream-rc1
Write-Host "push exit=$LASTEXITCODE"

# dispatch with ASCII JSON, no BOM
$token = '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'
$headers = @{
  Authorization = "Bearer $token"
  Accept = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}
$json = '{"ref":"fenglin/v3.1.1-upstream-rc1","inputs":{"target":"windows-x64","refresh_plugins":"false"}}'
$bytes = [System.Text.Encoding]::ASCII.GetBytes($json)
[System.IO.File]::WriteAllBytes('D:\10140\deepseek-harness-v2-wt-clean\ci-dispatch.json', $bytes)
Invoke-RestMethod -Method Post -Uri 'https://api.github.com/repos/fenglin-dev/deepseek-harness-fenglin/actions/workflows/desktop-packages.yml/dispatches' -Headers $headers -InFile 'D:\10140\deepseek-harness-v2-wt-clean\ci-dispatch.json' -ContentType 'application/json'
Start-Sleep -Seconds 5
(Invoke-RestMethod -Uri 'https://api.github.com/repos/fenglin-dev/deepseek-harness-fenglin/actions/runs?per_page=3' -Headers $headers).workflow_runs | Select-Object id,status,head_sha,html_url | ConvertTo-Json -Depth 3
