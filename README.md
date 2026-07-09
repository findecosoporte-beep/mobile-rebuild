# FINDECO Cobros (móvil)

App **Expo / React Native** reconstruida a partir de la APK `FINDECO-Cobros-release.apk` (el código fuente original no estaba en el repositorio).

**Documentación para usuarios y soporte:** ver [GUIA_Y_SOPORTE.md](./GUIA_Y_SOPORTE.md) (funcionamiento, flujos, problemas frecuentes y despliegue OTA/APK).

## Pantallas

- **Login** — JWT (`/token/`, `/me/`)
- **Hoja de cobros** — carteras + `/prestamos/reporte-integracion/` (**refresco automático cada 30 s** + pull-to-refresh)
- **Buscar cliente** — `/clientes/?search=`
- **Historial** — `/pagos/historial-cobros/?modo=dia` (**refresco automático cada 30 s**)
- **Registrar cobro** — `POST /pagos/` + compartir factura PDF

## Configuración

Copie `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://web-production-93580.up.railway.app/api/v1
```

## Desarrollo

```bash
cd mobile-rebuild
npm install
npm start
```

## Generar APK conectada a la API

URL embebida en build: `https://web-production-93580.up.railway.app/api/v1`

### Script local (Windows, recomendado)

```powershell
cd mobile-rebuild
.\scripts\build-apk.ps1
```

Salida: `FINDECO-Cobros.apk` y copia en `mobile/FINDECO-Cobros-release.apk`.

### EAS (nube, requiere cuenta Expo)

```bash
npx eas login
npx eas build -p android --profile preview
```

Perfil `preview` en `eas.json` genera **APK** con la variable `EXPO_PUBLIC_API_BASE_URL`.

## Actualizaciones sin reinstalar APK (OTA)

**Una sola vez:**

```bash
npx eas login
npx eas init          # vincula proyecto y corrige projectId en app.json
.\scripts\build-apk.ps1   # nueva APK con expo-updates activo
```

**Cada cambio de pantallas / lógica JS:**

```powershell
.\scripts\publish-update.ps1 -Message "Descripción del cambio"
```

La app instalada busca la actualización al **abrir** o al **volver al primer plano** y se reinicia sola si hay novedad.

> Cambios nativos (nueva librería, permisos) sí requieren compilar otra APK.

## Datos en tiempo casi real

Si creas un préstamo en el **frontend web**, la **Hoja de cobros** en el móvil lo muestra en ~30 s (misma API Railway), sin reinstalar.

## Nota

Si tiene el repositorio original de la app, compártalo para recuperar detalles de UI y lógica de negocio que no están en el bundle Hermes de la APK.
