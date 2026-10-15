# 自动扫描 data/ 下的词表、详解、语法笔记，生成 data/index.json
# 用法：双击「更新索引.bat」，或在 PowerShell 里运行本脚本
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$data = Join-Path $root 'data'

function Get-Cat([string]$name) {
  $dir = Join-Path $data $name
  if (-not (Test-Path $dir)) { return @() }
  return @(Get-ChildItem $dir -File |
    Where-Object { $_.Extension -in '.md', '.markdown', '.txt' } |
    Sort-Object Name |
    ForEach-Object { "$name/$($_.Name)" })
}

# 自己拼 JSON（不用 ConvertTo-Json：它会把"只有一个元素的数组"退化成字符串，导致同步失败）
function To-JsonArray($items) {
  $arr = @($items)
  if ($arr.Count -eq 0) { return '[]' }
  $parts = @()
  foreach ($it in $arr) {
    $esc = $it.Replace('\', '\\').Replace('"', '\"')
    $parts += ('"' + $esc + '"')
  }
  return '[' + ($parts -join ', ') + ']'
}

$words = Get-Cat 'words'
$details = Get-Cat 'details'
$grammar = Get-Cat 'grammar'

$nl = [Environment]::NewLine
$json = '{' + $nl +
  '  "words": ' + (To-JsonArray $words) + ',' + $nl +
  '  "details": ' + (To-JsonArray $details) + ',' + $nl +
  '  "grammar": ' + (To-JsonArray $grammar) + $nl +
  '}' + $nl

$out = Join-Path $data 'index.json'
[System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host '已生成 data/index.json：' -ForegroundColor Green
Write-Host ("  词表     : " + $(if ($words.Count) { $words -join ', ' } else { '(空)' }))
Write-Host ("  详解     : " + $(if ($details.Count) { $details -join ', ' } else { '(空)' }))
Write-Host ("  语法笔记 : " + $(if ($grammar.Count) { $grammar -join ', ' } else { '(空)' }))
Write-Host ''
Write-Host '提示：新增/删除文件后重新运行本脚本，然后上传到 GitHub（运行「上传到GitHub.bat」）。'
