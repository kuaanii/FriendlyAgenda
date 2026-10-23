$ErrorActionPreference = 'Stop'
$plan = $planJson | ConvertFrom-Json
$swapped = $false
function FileDigest([string]$file) {
  $stream = [IO.File]::OpenRead($file)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose(); $stream.Dispose() }
}
try {
  if ((FileDigest $plan.packageFile) -ne $plan.digest) { throw 'updateIntegrityError' }
  $parent = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($plan.target))
  if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($plan.staged)) -ne $parent -or [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($plan.backup)) -ne $parent) { throw 'updateIntegrityError' }
  $deadline = [DateTime]::UtcNow.AddSeconds(90)
  while (Get-Process -Id $plan.pid -ErrorAction SilentlyContinue) {
    if ([DateTime]::UtcNow -gt $deadline) { throw 'updateInstallError' }
    Start-Sleep -Milliseconds 200
  }
  Copy-Item -LiteralPath $plan.packageFile -Destination $plan.staged
  if ((FileDigest $plan.staged) -ne $plan.digest) { throw 'updateIntegrityError' }
  while ($true) {
    try { Move-Item -LiteralPath $plan.target -Destination $plan.backup; break }
    catch { if ([DateTime]::UtcNow -gt $deadline) { throw }; Start-Sleep -Milliseconds 200 }
  }
  try { Move-Item -LiteralPath $plan.staged -Destination $plan.target; $swapped = $true }
  catch { Move-Item -LiteralPath $plan.backup -Destination $plan.target; throw }
  Start-Process -FilePath $plan.target -WorkingDirectory $parent -WindowStyle Hidden
} catch {
  if ($swapped -and (Test-Path -LiteralPath $plan.backup)) {
    Move-Item -LiteralPath $plan.target -Destination $plan.staged
    Move-Item -LiteralPath $plan.backup -Destination $plan.target
  }
  if (-not (Get-Process -Id $plan.pid -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath $plan.target)) { Start-Process -FilePath $plan.target -WorkingDirectory $parent -WindowStyle Hidden }
  @{ status='error'; version=$plan.version; error='updateInstallError'; detail=$_.Exception.Message } | ConvertTo-Json | Set-Content -LiteralPath $plan.receipt -Encoding UTF8
  exit 1
}
