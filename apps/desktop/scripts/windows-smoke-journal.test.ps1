$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'windows-smoke-journal.ps1')

function Assert-True([bool] $Condition, [string] $Message) {
  if (-not $Condition) { throw $Message }
}

$root = Join-Path $env:RUNNER_TEMP "windows-smoke-journal-test-$PID"
$journal = Join-Path $root 'smoke-status.json'
Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue

Initialize-SmokeJournal -Path $journal
Start-SmokePhase -Name 'install'
Start-Sleep -Milliseconds 5
Start-SmokePhase -Name 'first-start'
Complete-SmokeJournal -Outcome 'passed'
$passed = Get-Content -LiteralPath $journal -Raw | ConvertFrom-Json
Assert-True ($passed.schema -eq 'open-dsh/windows-package-smoke/v1') 'Journal schema is invalid.'
Assert-True ($passed.status -eq 'passed') 'Passed journal did not settle.'
Assert-True ($passed.phases.Count -eq 2) 'Journal did not retain both phases.'
Assert-True ($passed.phases[0].outcome -eq 'passed' -and $passed.phases[1].outcome -eq 'passed') 'Journal phases did not pass.'
Assert-True ($passed.phases[0].durationMs -ge 0) 'Journal duration is invalid.'

Initialize-SmokeJournal -Path $journal
Start-SmokePhase -Name 'upgrade'
Complete-SmokeJournal -Outcome 'failed'
$failed = Get-Content -LiteralPath $journal -Raw | ConvertFrom-Json
Assert-True ($failed.status -eq 'failed') 'Failed journal did not settle.'
Assert-True ($failed.phases[0].errorKind -eq 'upgrade-failed') 'Failed journal exposed the wrong error category.'
Assert-True (-not ((Get-Content -LiteralPath $journal -Raw) -match 'secret|Exception|stack')) 'Journal contains unsafe failure details.'

$blockedParent = Join-Path $root 'occupied'
Set-Content -LiteralPath $blockedParent -Value 'file' -Encoding utf8
Initialize-SmokeJournal -Path (Join-Path $blockedParent 'journal.json')
Start-SmokePhase -Name 'install'
Complete-SmokeJournal -Outcome 'failed'

Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Windows smoke journal behavior passed.'
