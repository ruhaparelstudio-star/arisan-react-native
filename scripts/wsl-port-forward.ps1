# Jalankan di Windows PowerShell sebagai Administrator
# Forward port 8081 dari Windows host -> WSL2 supaya HP bisa scan QR Expo Go

$wsl_ip = (wsl -- hostname -I).Trim().Split(' ')[0]
Write-Host "WSL2 IP: $wsl_ip"

# Hapus rule lama (kalau ada)
netsh interface portproxy delete v4tov4 listenport=8081 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=19000 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=19001 listenaddress=0.0.0.0 2>$null

# Tambah port forward
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=$wsl_ip
netsh interface portproxy add v4tov4 listenport=19000 listenaddress=0.0.0.0 connectport=19000 connectaddress=$wsl_ip
netsh interface portproxy add v4tov4 listenport=19001 listenaddress=0.0.0.0 connectport=19001 connectaddress=$wsl_ip

# Buka firewall
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081 -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "Expo Dev 19000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 19000 -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "Expo Dev 19001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 19001 -ErrorAction SilentlyContinue | Out-Null

Write-Host "`nPort forwarding sudah aktif:" -ForegroundColor Green
netsh interface portproxy show all

Write-Host "`nIP Windows yang dipakai HP untuk scan QR:" -ForegroundColor Cyan
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^(127|169|172\.[2-3]\d)\." -and $_.PrefixOrigin -ne "WellKnown" }).IPAddress
