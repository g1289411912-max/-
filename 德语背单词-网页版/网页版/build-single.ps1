# 构建「单文件版」：把词表 / 详解 / 语法笔记（+ 可选离线发音包）全部内嵌进一个 HTML 文件
# 用法：双击「构建单文件版.bat」，生成 单文件版\index.html
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$tpl  = Join-Path $root 'index.html'
$data = Join-Path $root 'data'
$outDir = Join-Path $root '单文件版'
$audioFile = Join-Path $root 'audio.json'

if (-not (Test-Path $tpl))  { Write-Host '找不到模板 index.html' -ForegroundColor Red; exit 1 }
if (-not (Test-Path $data)) { Write-Host '找不到 data 文件夹' -ForegroundColor Red; exit 1 }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Read-Cat([string]$name) {
  $dir = Join-Path $data $name
  if (-not (Test-Path $dir)) { return $null }
  $files = @(Get-ChildItem $dir -File | Where-Object { $_.Extension -in '.md', '.markdown', '.txt' } | Sort-Object Name)
  if ($files.Count -eq 0) { return $null }
  $parts = @()
  foreach ($f in $files) {
    $t = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $t = $t -replace '^\uFEFF', ''
    $parts += ('# ===== ' + $f.Name + ' =====' + "`n" + $t)
  }
  return ($parts -join "`n")
}

# 字符串 → JSON 字符串（用 ConvertTo-Json 转义，可靠处理换行/引号）
function To-JsonString($s) {
  if ($null -eq $s) { return 'null' }
  return ($s | ConvertTo-Json -Compress)
}

$words   = Read-Cat 'words'
$details = Read-Cat 'details'
$grammar = Read-Cat 'grammar'
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'

# 离线发音包（可选）：运行过「生成语音包.bat」就会有 audio.json
$audioRaw = 'null'
$audioCount = 0
$audioKB = 0
if (Test-Path $audioFile) {
  $raw = [System.IO.File]::ReadAllText($audioFile, [System.Text.Encoding]::UTF8).Trim()
  if ($raw.StartsWith('{')) {
    $audioRaw = $raw
    $audioKB = [math]::Round((Get-Item $audioFile).Length / 1KB)
    $audioCount = ([regex]::Matches($raw, 'data:audio/mpeg;base64,')).Count
  }
}

$nl = [Environment]::NewLine
$json = '{' + $nl +
  '  "stamp": '   + (To-JsonString $stamp)   + ',' + $nl +
  '  "words": '   + (To-JsonString $words)   + ',' + $nl +
  '  "details": ' + (To-JsonString $details) + ',' + $nl +
  '  "grammar": ' + (To-JsonString $grammar) + ',' + $nl +
  '  "audio": '   + $audioRaw + $nl +
  '}'
$json = $json.Replace('</', '<\/')

$html = [System.IO.File]::ReadAllText($tpl, [System.Text.Encoding]::UTF8)
$pattern = '(?s)<script id="embeddedData" type="application/json">.*?</script>'
$m = [regex]::Match($html, $pattern)
if (-not $m.Success) { Write-Host '模板里找不到 embeddedData 占位，请确认用的是本文件夹里的 index.html' -ForegroundColor Red; exit 1 }
$replacement = '<script id="embeddedData" type="application/json">' + $json + '</script>'
$html = $html.Substring(0, $m.Index) + $replacement + $html.Substring($m.Index + $m.Length)

$outFile = Join-Path $outDir 'index.html'
[System.IO.File]::WriteAllText($outFile, $html, (New-Object System.Text.UTF8Encoding($false)))

$kb = [math]::Round((Get-Item $outFile).Length / 1KB)
$wLines = 0
if ($words) { $wLines = ([regex]::Matches($words, "`n")).Count }
$dLines = 0
if ($details) { $dLines = ([regex]::Matches($details, "`n")).Count }
$gLines = 0
if ($grammar) { $gLines = ([regex]::Matches($grammar, "`n")).Count }

Write-Host '单文件版已生成 ✓' -ForegroundColor Green
Write-Host ('  路径 : ' + $outFile)
Write-Host ('  大小 : ' + $kb + ' KB')
Write-Host ('  版本 : ' + $stamp)
Write-Host ('  词表 ' + $wLines + ' 行 / 详解 ' + $dLines + ' 行 / 语法笔记 ' + $gLines + ' 行（已内嵌）')
if ($audioCount -gt 0) {
  Write-Host ('  离线发音包 : ✓ ' + $audioCount + ' 个单词（audio.json ' + $audioKB + ' KB）') -ForegroundColor Green
} else {
  Write-Host '  离线发音包 : ✗ 未内嵌（想要离线发音，先双击「生成语音包.bat」）' -ForegroundColor Yellow
}
Write-Host ''
Write-Host '下一步：把 单文件版\index.html 上传到 GitHub 仓库【根目录】，手机刷新即可。' -ForegroundColor Cyan
