$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dist = Join-Path $root "dist"

New-Item -ItemType Directory -Path $dist -Force | Out-Null
Get-ChildItem -LiteralPath $dist -Force | Remove-Item -Recurse -Force

$publicFiles = @(".nojekyll", "404.html", "calc.html", "index.html", "learn.html", "norms.html", "projects.html", "workspace.html", "robots.txt", "sitemap.xml")
foreach ($file in $publicFiles) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination $dist -Force
}

Copy-Item -LiteralPath (Join-Path $root "assets") -Destination $dist -Recurse -Force
