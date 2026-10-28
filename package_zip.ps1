$src = "C:\Users\DELL\OneDrive\Desktop\aquabook"
$tempDir = Join-Path $env:TEMP ("aquabook_pkg_" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

cmd /c "robocopy `"$src`" `"$tempDir`" /E /XD node_modules .git /XF .keep *.zip"

$desktopZip = "C:\Users\DELL\OneDrive\Desktop\aquabook-fixed.zip"
$downloadsZip = "C:\Users\DELL\Downloads\aquabook-fixed.zip"
$adeelDocZip = "C:\Users\DELL\OneDrive\Desktop\adeel doc\aquabook-fixed.zip"

if (Test-Path $desktopZip) { Remove-Item $desktopZip -Force }
if (Test-Path $downloadsZip) { Remove-Item $downloadsZip -Force }

Compress-Archive -Path "$tempDir\*" -DestinationPath $desktopZip -Force
if (Test-Path "C:\Users\DELL\Downloads") { Copy-Item $desktopZip -Destination $downloadsZip -Force }
if (Test-Path "C:\Users\DELL\OneDrive\Desktop\adeel doc") { Copy-Item $desktopZip -Destination $adeelDocZip -Force }

Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Output "Zip packages created successfully:"
Get-Item $desktopZip | Select-Object FullName, Length, LastWriteTime
if (Test-Path $adeelDocZip) { Get-Item $adeelDocZip | Select-Object FullName, Length, LastWriteTime }
