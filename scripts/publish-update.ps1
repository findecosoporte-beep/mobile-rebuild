# Publica cambios JS a la app instalada (OTA) sin reinstalar APK.
# Requiere: npx eas login  y  npx eas init

param(
  [string]$Message = "Actualización FINDECO Cobros",
  [ValidateSet("production", "preview")]
  [string]$Channel = "production"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Push-Location $ProjectRoot
try {
  Write-Host ">> Publicando OTA desde $ProjectRoot ..."
  Write-Host ">> Canal: $Channel"
  npx eas update --channel $Channel --environment $Channel --message $Message
  if ($LASTEXITCODE -ne 0) {
    throw "eas update falló (código $LASTEXITCODE)"
  }
  Write-Host ">> Listo. La app buscará la actualización al abrirse o volver al primer plano."
} finally {
  Pop-Location
}
