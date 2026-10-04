param(
    [ValidateRange(1, 65535)]
    [int]$Port = 5173,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodeExecutable = $nodeCommand.Source
} else {
    $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $bundledNode -PathType Leaf) {
        $nodeExecutable = $bundledNode
    } else {
        Write-Host 'Node.js was not found. Install Node.js 18 or newer from https://nodejs.org/en/download and run start.cmd again.' -ForegroundColor Yellow
        exit 1
    }
}

$nodeVersion = & $nodeExecutable --version
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(\d+)\.') {
    Write-Host 'Unable to run Node.js. Reinstall it from https://nodejs.org/en/download.' -ForegroundColor Yellow
    exit 1
}
if ([int]$Matches[1] -lt 18) {
    Write-Host 'Node.js 18 or newer is required. Update it from https://nodejs.org/en/download.' -ForegroundColor Yellow
    exit 1
}

$serverFile = Join-Path $PSScriptRoot 'server.mjs'
$serverArguments = @($serverFile, '--host', '127.0.0.1', '--port', $Port.ToString())
if (-not $NoBrowser) { $serverArguments += '--open' }
& $nodeExecutable @serverArguments
exit $LASTEXITCODE
