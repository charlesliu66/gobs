# 以管理员身份运行：为 Next.js 开发端口 3000 添加入站规则（局域网设备可访问）
# 右键 PowerShell -> 以管理员身份运行，然后：
#   Set-Location "d:\AI\SJ\web\scripts"
#   .\windows-firewall-dev3000.ps1

$ruleName = "Next.js dev TCP 3000 (SJ)"
$existing = netsh advfirewall firewall show rule name=$ruleName 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "规则已存在: $ruleName"
  exit 0
}

netsh advfirewall firewall add rule name=$ruleName dir=in action=allow protocol=TCP localport=3000 profile=private,domain
if ($LASTEXITCODE -ne 0) {
  Write-Error "需要管理员权限。请右键 PowerShell 选择「以管理员身份运行」后重试。"
  exit 1
}
Write-Host "已添加防火墙规则: $ruleName"
