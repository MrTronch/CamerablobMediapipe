$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'No se encontro Node.js. Instala Node.js LTS desde nodejs.org y vuelve a abrir INICIAR_WEB.bat.' }
# server.mjs opens the browser only after it has successfully bound its port.
& $nodePath (Join-Path $PSScriptRoot 'server.mjs') --open
exit $LASTEXITCODE
