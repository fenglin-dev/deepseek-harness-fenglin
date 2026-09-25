$ErrorActionPreference = 'Continue'
Set-Location 'D:\10140\deepseek-harness-v2-wt-clean'

Write-Host '=== offline install ==='
& $env:MIMO_NODE 'node_modules/pnpm/bin/pnpm.mjs' install --offline --prefer-offline --config.confirmModulesPurge=false
Write-Host "install exit=$LASTEXITCODE"

Write-Host '=== third-party notices ==='
& $env:MIMO_NODE 'scripts/gen-third-party-notices.ts'
Write-Host "notices exit=$LASTEXITCODE"

# restore merge parents if MERGE_HEAD is gone
$head = (git rev-parse HEAD).Trim()
$rc2 = (git rev-parse dsh-v0.1.7-rc.2).Trim()
Write-Host "HEAD=$head RC2=$rc2"

git add -A
$tree = (git write-tree).Trim()
Write-Host "tree=$tree"

$msg = "merge: official dsh-v0.1.7-rc.2 into fenglin desktop`n`nKeep fenglin overlays, packaging, and session V3 compat. Core/UI take official rc.2."
$msgPath = 'D:\10140\deepseek-harness-v2-wt-clean\ci-merge-msg.txt'
Set-Content -Path $msgPath -Value $msg -Encoding utf8

$new = (git commit-tree $tree -p $head -p $rc2 -F $msgPath).Trim()
Write-Host "merge commit=$new"
git update-ref HEAD $new
git log --oneline -3
git cat-file -p HEAD | Select-Object -First 6

git push origin HEAD:fenglin/v3.1.1-upstream-rc1
Write-Host "push exit=$LASTEXITCODE"
