# 집게표 전시 시연판용 로컬 웹 서버(PowerShell 판). jipgepyo-server.exe 를 못 쓸 때 START.bat 이 이 파일을 실행합니다.
# zip 의 site 폴더를 http://localhost:8723/IN-VIBE-camp/ 로 열고 기본 브라우저를 띄웁니다. 이 PC 에서만 접속됩니다.
# Windows 10/11 기본 PowerShell 5.1 로 돌며, 따로 설치할 것이 없습니다. 창을 닫으면 꺼집니다.
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\site'))
$base = '/IN-VIBE-camp/'
$index = Join-Path $root 'IN-VIBE-camp\index.html'
if (-not (Test-Path -LiteralPath $index -PathType Leaf)) {
  Write-Host "[오류] site 폴더를 찾지 못했어요: $root"
  Write-Host "zip 을 먼저 '압축 풀기' 한 뒤, 풀린 폴더 안의 START.bat 을 실행해 주세요."
  exit 2
}

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'; '.map' = 'application/json'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'; '.svg' = 'image/svg+xml'
  '.ico' = 'image/x-icon'; '.webp' = 'image/webp'; '.ttf' = 'font/ttf'; '.otf' = 'font/otf'; '.woff' = 'font/woff'
  '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8'; '.wasm' = 'application/wasm'
}

function Test-Ours([int]$port) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri "http://localhost:$port/__jipgepyo"
    return ($r.Content -eq 'jipgepyo')
  } catch { return $false }
}

$listener = $null
$url = $null
foreach ($port in 8723..8732) {
  $l = New-Object System.Net.HttpListener
  $l.Prefixes.Add("http://localhost:$port/")
  try {
    $l.Start()
    $listener = $l
    $url = "http://localhost:$port$base"
    break
  } catch {
    try { $l.Close() } catch {}
    # 이미 집게표 서버가 떠 있으면 그 주소를 다시 엽니다(같은 주소여야 이 PC 에 쌓인 기록이 이어짐).
    if (Test-Ours $port) {
      $url = "http://localhost:$port$base"
      Write-Host "이미 실행 중이에요. 브라우저를 다시 엽니다: $url"
      Start-Process $url
      exit 0
    }
  }
}
if (-not $listener) {
  Write-Host '[오류] 8723~8732 포트를 모두 쓸 수 없어요.'
  exit 1
}

Write-Host "집게표 시연판이 켜졌어요: $url"
Write-Host '이 창을 닫으면 꺼집니다. 브라우저가 안 열리면 위 주소를 직접 입력하세요.'
Start-Process $url

function Send-Bytes($res, [byte[]]$bytes, [string]$type) {
  $res.ContentType = $type
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($path -eq '/__jipgepyo') {
      Send-Bytes $res ([System.Text.Encoding]::ASCII.GetBytes('jipgepyo')) 'text/plain'
    } elseif ($path -eq '/' -or $path -eq '/IN-VIBE-camp') {
      $res.Redirect($base)
    } else {
      $rel = $path.TrimStart('/').Replace('/', '\')
      $file = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      if (-not $file.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
      } else {
        if (Test-Path -LiteralPath $file -PathType Container) {
          if (-not $path.EndsWith('/')) { $res.Redirect($path + '/'); $file = $null }
          else { $file = Join-Path $file 'index.html' }
        }
        if ($file -and -not (Test-Path -LiteralPath $file -PathType Leaf)) {
          # 앱 안 주소로 바로 들어오거나 새로고침하면 앱 첫 화면(index.html)을 돌려줍니다.
          if ([System.IO.Path]::GetExtension($file) -eq '' -and $path.StartsWith($base)) { $file = $index }
          else { $res.StatusCode = 404; $file = $null }
        }
        if ($file) {
          $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
          $type = $types[$ext]
          if (-not $type) { $type = 'application/octet-stream' }
          if ($ext -eq '.html' -or $file.EndsWith('sw.js')) { $res.Headers.Add('Cache-Control', 'no-cache') }
          Send-Bytes $res ([System.IO.File]::ReadAllBytes($file)) $type
        }
      }
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.OutputStream.Close() } catch {}
  }
}
