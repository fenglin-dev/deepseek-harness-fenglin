$script:SmokeJournalPath = $null
$script:SmokeJournal = $null

function Write-SmokeJournal {
  if ($null -eq $script:SmokeJournal -or [string]::IsNullOrWhiteSpace($script:SmokeJournalPath)) { return }
  $temporary = "$($script:SmokeJournalPath).$PID.tmp"
  try {
    New-Item -ItemType Directory -Path (Split-Path -Parent $script:SmokeJournalPath) -Force -ErrorAction Stop | Out-Null
    $script:SmokeJournal | ConvertTo-Json -Depth 5 |
      Set-Content -LiteralPath $temporary -Encoding utf8 -ErrorAction Stop
    Move-Item -LiteralPath $temporary -Destination $script:SmokeJournalPath -Force -ErrorAction Stop
  } catch {
    Write-Warning "Windows smoke journal could not be persisted; Package Qualification is unchanged."
  } finally {
    Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
  }
}

function Complete-CurrentSmokePhase([string] $Outcome, [string] $ErrorKind = '') {
  if ($null -eq $script:SmokeJournal -or $script:SmokeJournal.phases.Count -eq 0) { return }
  $phase = $script:SmokeJournal.phases[$script:SmokeJournal.phases.Count - 1]
  if ($phase.outcome -ne 'running') { return }
  $completed = [DateTimeOffset]::UtcNow
  $phase.outcome = $Outcome
  $phase.completedAt = $completed.ToString('o')
  $phase.durationMs = [Math]::Max(0, [Math]::Round(($completed - [DateTimeOffset]::Parse($phase.startedAt)).TotalMilliseconds))
  if (-not [string]::IsNullOrWhiteSpace($ErrorKind)) { $phase.errorKind = $ErrorKind }
}

function Initialize-SmokeJournal([string] $Path) {
  $script:SmokeJournalPath = $Path
  $script:SmokeJournal = [ordered]@{
    schema = 'open-dsh/windows-package-smoke/v1'
    status = 'running'
    startedAt = [DateTimeOffset]::UtcNow.ToString('o')
    completedAt = $null
    currentPhase = $null
    phases = [System.Collections.ArrayList]::new()
  }
  Write-SmokeJournal
}

function Start-SmokePhase([string] $Name) {
  if ($null -eq $script:SmokeJournal) { return }
  Complete-CurrentSmokePhase -Outcome 'passed'
  $phase = [ordered]@{
    name = $Name
    outcome = 'running'
    startedAt = [DateTimeOffset]::UtcNow.ToString('o')
    completedAt = $null
    durationMs = $null
  }
  [void] $script:SmokeJournal.phases.Add($phase)
  $script:SmokeJournal.currentPhase = $Name
  Write-SmokeJournal
}

function Complete-SmokeJournal([ValidateSet('passed', 'failed')] [string] $Outcome) {
  if ($null -eq $script:SmokeJournal) { return }
  $errorKind = if ($Outcome -eq 'failed' -and -not [string]::IsNullOrWhiteSpace($script:SmokeJournal.currentPhase)) {
    "$($script:SmokeJournal.currentPhase)-failed"
  } else { '' }
  Complete-CurrentSmokePhase -Outcome $Outcome -ErrorKind $errorKind
  $script:SmokeJournal.status = $Outcome
  $script:SmokeJournal.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
  Write-SmokeJournal
}
