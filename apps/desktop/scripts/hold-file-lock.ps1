[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [Parameter(Mandatory = $true)]
  [string]$ReadyPath,

  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 120)]
  [int]$Seconds
)

$ErrorActionPreference = 'Stop'
$deadline = [DateTime]::UtcNow.AddSeconds(30)
$stream = $null
while ($stream -eq $null) {
  try {
    $stream = [System.IO.File]::Open(
      $Path,
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read,
      [System.IO.FileShare]::None
    )
  } catch [System.IO.IOException] {
    if ([DateTime]::UtcNow -ge $deadline) { throw }
    Start-Sleep -Milliseconds 500
  }
}
try {
  [System.IO.File]::WriteAllText($ReadyPath, 'ready')
  Start-Sleep -Seconds $Seconds
} finally {
  $stream.Dispose()
}
