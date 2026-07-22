param(
  [ValidateSet("zip", "7z")]
  [string]$Format = "zip",
  [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageName = "iCue_Widget_Runner_Engine"
$stageRoot = Join-Path ([IO.Path]::GetTempPath()) ("icue-runner-package-" + [guid]::NewGuid().ToString("N"))
$packageRoot = Join-Path $stageRoot $packageName
$resolvedOutputDir = (Resolve-Path $OutputDir).Path
$archivePath = Join-Path $resolvedOutputDir "$packageName.$Format"

$rootFiles = @(
  "package.json",
  "package-lock.json",
  "main.js",
  "preload.js",
  "README.md",
  "README.txt",
  "run-all.bat",
  "app-config.js",
  "index.html",
  "web-server.js",
  "levels-server.js",
  "runner-v2.js"
)

$rootDirs = @(
  "common",
  "scripts",
  "widgets"
)

try {
  New-Item -ItemType Directory -Path $packageRoot | Out-Null

  foreach ($file in $rootFiles) {
    $source = Join-Path $repoRoot $file
    if (-not (Test-Path -LiteralPath $source)) {
      throw "Required file is missing: $source"
    }
    Copy-Item -LiteralPath $source -Destination (Join-Path $packageRoot $file) -Force
  }

  foreach ($dir in $rootDirs) {
    $source = Join-Path $repoRoot $dir
    if (-not (Test-Path -LiteralPath $source)) {
      throw "Required directory is missing: $source"
    }
    Copy-Item -LiteralPath $source -Destination (Join-Path $packageRoot $dir) -Recurse -Force
  }

  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }

  if ($Format -eq "zip") {
    Compress-Archive -LiteralPath $packageRoot -DestinationPath $archivePath -CompressionLevel Optimal
  } else {
    $sevenZip = Get-Command "7z.exe" -ErrorAction SilentlyContinue
    if (-not $sevenZip) {
      $commonPaths = @(
        "$env:ProgramFiles\7-Zip\7z.exe",
        "${env:ProgramFiles(x86)}\7-Zip\7z.exe"
      )
      $sevenZipPath = $commonPaths | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
      if ($sevenZipPath) {
        $sevenZip = Get-Item -LiteralPath $sevenZipPath
      }
    }
    if (-not $sevenZip) {
      throw "7-Zip was not found. Install 7-Zip or use -Format zip."
    }

    Push-Location $stageRoot
    try {
      & $sevenZip.Source a -t7z -mx=9 $archivePath $packageName | Out-Host
      if ($LASTEXITCODE -ne 0) {
        throw "7-Zip failed with exit code $LASTEXITCODE"
      }
    } finally {
      Pop-Location
    }
  }

  $archive = Get-Item -LiteralPath $archivePath
  Write-Host "Created: $($archive.FullName)"
  Write-Host ("Size: {0:N2} MB" -f ($archive.Length / 1MB))
  Write-Host "Includes flattened runner root layout."
} finally {
  if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
}
