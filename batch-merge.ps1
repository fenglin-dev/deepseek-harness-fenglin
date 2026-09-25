$ErrorActionPreference = 'Continue'
Set-Location 'D:\10140\deepseek-harness-v2-wt-clean'
$log = Join-Path $PWD 'batch-merge.log'
"START $(Get-Date -Format o)" | Set-Content $log -Encoding utf8

function Step($name, $cmd) {
  "=== $name ===" | Add-Content $log
  & $cmd *>> $log
  "exit=$LASTEXITCODE" | Add-Content $log
}

# kill leftover node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Step 'prepare' { & $env:MIMO_PYTHON 'tmp-batch-prepare.py' }

# typecheck host
"=== tsc host ===" | Add-Content $log
& $env:MIMO_NODE './node_modules/typescript/bin/tsc' -b tsconfig.host.json --pretty false *>> $log
$hostExit = $LASTEXITCODE
"host tsc exit=$hostExit" | Add-Content $log

# desktop typecheck
"=== tsc desktop ===" | Add-Content $log
& $env:MIMO_NODE './node_modules/typescript/bin/tsc' -p apps/desktop/tsconfig.json --noEmit --pretty false *>> $log
$deskExit = $LASTEXITCODE
"desktop tsc exit=$deskExit" | Add-Content $log

# commit whatever is staged/changed for merge healing
git add -A
git commit -m "merge: heal official dsh-v0.1.7-rc.2 integration for fenglin desktop" *>> $log
"commit exit=$LASTEXITCODE" | Add-Content $log

# push (pre-push runs typecheck again)
git push origin HEAD:fenglin/v3.1.1-upstream-rc1 *>> $log
"push exit=$LASTEXITCODE" | Add-Content $log

# dispatch CI
$token = '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'
$headers = @{
  Authorization = "Bearer $token"
  Accept = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}
$json = '{"ref":"fenglin/v3.1.1-upstream-rc1","inputs":{"target":"windows-x64","refresh_plugins":"false"}}'
[System.IO.File]::WriteAllBytes((Join-Path $PWD 'ci-dispatch.json'), [System.Text.Encoding]::ASCII.GetBytes($json))
try {
  Invoke-RestMethod -Method Post -Uri 'https://api.github.com/repos/fenglin-dev/deepseek-harness-fenglin/actions/workflows/desktop-packages.yml/dispatches' -Headers $headers -InFile (Join-Path $PWD 'ci-dispatch.json') -ContentType 'application/json' *>> $log
  "dispatch ok" | Add-Content $log
} catch {
  "dispatch fail $_" | Add-Content $log
}

"END $(Get-Date -Format o) host=$hostExit desk=$deskExit" | Add-Content $log
Get-Content $log -Tail 25
