# Mugiwara Dashboard - Install/Uninstall Auto-Start
# Usage:
#   .\install-autostart.ps1           → Install (copies VBS to Windows Startup)
#   .\install-autostart.ps1 -Remove   → Uninstall (removes from Startup)

param(
    [switch]$Remove
)

$startupFolder = [Environment]::GetFolderPath('Startup')
$linkName = "MugiwaraDashboard.vbs"
$destination = Join-Path $startupFolder $linkName
$source = Join-Path $PSScriptRoot "start-dashboard.vbs"

if ($Remove) {
    if (Test-Path $destination) {
        Remove-Item $destination -Force
        Write-Host "[OK] Mugiwara Dashboard removed from Windows Startup." -ForegroundColor Green
    } else {
        Write-Host "[INFO] Not installed — nothing to remove." -ForegroundColor Yellow
    }
    return
}

# Install
if (-not (Test-Path $source)) {
    Write-Host "[ERROR] start-dashboard.vbs not found at: $source" -ForegroundColor Red
    return
}

Copy-Item $source $destination -Force
Write-Host "[OK] Mugiwara Dashboard installed in Windows Startup." -ForegroundColor Green
Write-Host "     Location: $destination" -ForegroundColor DarkGray
Write-Host "     The dashboard will start silently at next login and open http://127.0.0.1:8000" -ForegroundColor DarkGray
Write-Host ""
Write-Host "     To remove: .\install-autostart.ps1 -Remove" -ForegroundColor DarkGray
