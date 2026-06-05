# tools/preview-production.ps1
# Build, start production server and open browser (Windows PowerShell)

pnpm build
Start-Process -NoNewWindow -FilePath node -ArgumentList 'dist/index.js'

$port = $env:PORT -ne $null ? $env:PORT : 3000
$url = "http://localhost:$port/"
Write-Host "Waiting for $url ..."
$timeout = 30
$elapsed = 0
while ($elapsed -lt $timeout) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { break }
  } catch { }
  Start-Sleep -Seconds 1
  $elapsed += 1
}
Start-Process $url
