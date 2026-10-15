# 一键提交并推送到 GitHub（推送成功后 GitHub Pages 会自动更新，手机上点「☁️ 同步数据」即可）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# 先自动刷新数据索引
& (Join-Path $root 'update-index.ps1')
Write-Host ''

if (-not (Test-Path (Join-Path $root '.git'))) {
  Write-Host '首次使用：正在初始化 Git 仓库…' -ForegroundColor Yellow
  git init | Out-Null
  git branch -M main
  Write-Host ''
  Write-Host '请输入你的 GitHub 仓库地址（形如 https://github.com/用户名/仓库名.git）：'
  $url = Read-Host '仓库地址'
  if ([string]::IsNullOrWhiteSpace($url)) { Write-Host '未填写仓库地址，已取消。' -ForegroundColor Red; exit 1 }
  git remote add origin $url
}

git add -A
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
git commit -m "更新数据 $stamp" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host '(没有新改动需要提交)' }
Write-Host '正在推送…' -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host ''
  Write-Host '推送成功 ✓  等 30 秒左右 GitHub Pages 会更新，然后在手机上打开网址点「☁️ 同步数据」。' -ForegroundColor Green
} else {
  Write-Host ''
  Write-Host '推送失败。常见原因：未登录 GitHub / 仓库地址不对 / 网络问题。' -ForegroundColor Red
  Write-Host '也可以在 GitHub 网页上把改动的文件直接拖进去覆盖（见 部署说明.md）。'
}
Write-Host ''
pause
