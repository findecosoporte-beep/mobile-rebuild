# Genera APK Android conectada a Railway (API en .env)
# En Windows, Gradle falla dentro de Documents/OneDrive: copia a C:\findeco-build

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildRoot = "C:\findeco-build"

Write-Host ">> Copiando código fuente a $BuildRoot (sin node_modules) ..."
if (Test-Path "$BuildRoot\android\gradlew.bat") {
  Push-Location "$BuildRoot\android"
  .\gradlew.bat --stop 2>$null | Out-Null
  Pop-Location
}
if (-not (Test-Path $BuildRoot)) {
  New-Item -ItemType Directory -Path $BuildRoot | Out-Null
}
robocopy $ProjectRoot $BuildRoot /E /XD node_modules android .expo dist /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "robocopy falló (código $LASTEXITCODE)"
}

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

Push-Location $BuildRoot
Write-Host ">> Instalando dependencias en $BuildRoot ..."
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
  throw "npm install falló (código $LASTEXITCODE)"
}

if (Test-Path "android") {
  Remove-Item -Recurse -Force "android"
}
Write-Host ">> Generando proyecto Android (prebuild) ..."
npx expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) {
  throw "expo prebuild falló (código $LASTEXITCODE)"
}

$GradleProps = Join-Path $BuildRoot "android\gradle.properties"
if (Test-Path $GradleProps) {
  $gradle = Get-Content $GradleProps -Raw
  $gradle = $gradle -replace 'org\.gradle\.jvmargs=.*', 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError'
  $gradle = $gradle -replace 'reactNativeArchitectures=.*', 'reactNativeArchitectures=arm64-v8a,armeabi-v7a'
  if ($gradle -notmatch 'android\.enableLint') {
    $gradle += "`nandroid.enableLint=false`n"
  }
  if ($gradle -match 'edgeToEdgeEnabled=true') {
    $gradle = $gradle -replace 'edgeToEdgeEnabled=true', 'edgeToEdgeEnabled=false'
  }
  Set-Content -Path $GradleProps -Value $gradle -NoNewline
}

Write-Host ">> Compilando APK release (~10 min) ..."
Push-Location "$BuildRoot\android"
.\gradlew.bat assembleRelease -g "C:\Users\HP\gradle-findeco"
if ($LASTEXITCODE -ne 0) {
  throw "Gradle falló (código $LASTEXITCODE)"
}
Pop-Location

$ApkSource = "$BuildRoot\android\app\build\outputs\apk\release\app-release.apk"
$ApkDest = Join-Path $ProjectRoot "FINDECO-Cobros.apk"
$MobileDest = Join-Path (Split-Path $ProjectRoot -Parent) "mobile\FINDECO-Cobros-releaseV1.apk"

Copy-Item $ApkSource $ApkDest -Force
Copy-Item $ApkSource $MobileDest -Force

Write-Host ">> Listo:"
Write-Host "   $ApkDest"
Write-Host "   $MobileDest"
