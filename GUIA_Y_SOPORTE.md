# FINDECO Cobros — Guía de la app móvil y soporte

Documento para el equipo de FINDECO: cómo funciona la aplicación móvil de cobros, qué puede hacer el cobrador en campo y cómo resolver incidencias frecuentes.

---

## 1. ¿Qué es esta app?

**FINDECO Cobros** es la app Android para cobradores. Permite:

- Ver la **hoja de cobros** del día por cartera
- **Buscar clientes** por DNI o nombre
- **Registrar pagos** de cuotas
- Ver el **historial de cobros del día**
- Compartir la **factura PDF** después de un cobro

La app **no guarda datos de negocio en el teléfono** de forma permanente: todo se consulta y registra contra el mismo backend que usa el sistema web (API en Railway).

| Dato | Valor |
|------|--------|
| Nombre en el teléfono | FINDECO Cobros |
| Paquete Android | `com.findeco.mobile` |
| Proyecto Expo | `@findeco990/findeco-mobile` |
| Código fuente | Carpeta `mobile-rebuild/` del monorepo |
| API producción | `https://web-production-93580.up.railway.app/api/v1` |

---

## 2. Requisitos para usar la app

### Cobrador (usuario final)

- Teléfono Android con la APK instalada
- Conexión a internet (datos móviles o Wi‑Fi)
- Usuario y contraseña creados en el sistema web (mismo login que el panel)
- El usuario debe tener **cartera(s) asignada(s)** en el backend para ver su hoja de cobros

### Equipo técnico / soporte

- Cuenta Expo (`findeco990`) para publicar actualizaciones OTA
- Node.js 18+ y Android SDK (solo si se compila APK nueva)
- Acceso al backend Railway y al panel web para verificar datos

---

## 3. Cómo funciona (visión general)

```
┌─────────────┐     HTTPS + JWT      ┌──────────────────┐
│  App móvil  │ ◄──────────────────► │  API FINDECO     │
│  (Expo RN)  │                      │  (Railway)       │
└─────────────┘                      └────────┬─────────┘
       │                                    │
       │ OTA (solo JS/UI)                   │ Misma base de datos
       ▼                                    ▼
┌─────────────┐                      ┌──────────────────┐
│ Expo Updates│                      │  Frontend web    │
│  canal prod │                      │  (panel admin)   │
└─────────────┘                      └──────────────────┘
```

1. El cobrador inicia sesión → la app guarda el token de forma segura (`expo-secure-store`).
2. Cada pantalla llama endpoints REST del backend.
3. La **Hoja** y el **Historial** se refrescan solos cada **30 segundos** y también con “jalar para actualizar”.
4. Al abrir la app (o volver del segundo plano), puede descargarse una **actualización OTA** sin reinstalar la APK.

---

## 4. Pantallas y flujos de uso

### 4.1 Inicio de sesión

- **Ruta:** pantalla inicial si no hay sesión
- **API:** `POST /token/`, luego `GET /me/`
- El perfil (`/me/`) trae nombre del operador y **carteras asignadas**

**Soporte:** si el login falla, verificar usuario/contraseña en el web. Si entra pero no ve carteras, revisar en el backend que el usuario tenga carteras vinculadas.

---

### 4.2 Hoja de cobros (pestaña “Hoja”)

- Lista préstamos **activos, en mora o pendientes de aprobación** de la cartera seleccionada
- **API:** `GET /prestamos/reporte-integracion/?id_cartera=…&estado=activo,pendiente_aprobacion,mora&all=1`
- Muestra: cliente, número de préstamo, teléfono, cuota sugerida, saldo, alertas de cuotas atrasadas
- **Tocar una fila** → abre **Registrar cobro**

**Refresco:** automático cada 30 s + pull-to-refresh.

**Soporte:** si un préstamo nuevo no aparece, esperar ~30 s o refrescar manualmente. Si nunca aparece, verificar en el web que el préstamo esté en esa cartera y en estado visible.

---

### 4.3 Buscar cliente (pestaña “Buscar”)

- Busca por **DNI** o **nombre** (mínimo 2 caracteres)
- **API búsqueda:** primero `GET /clientes/?dni=…` si parece identidad; si no, `GET /clientes/?search=…`
- Al elegir un cliente:
  - Carga préstamos activos: `GET /prestamos/reporte-integracion/?id_cliente=…`
  - **Un préstamo** → va directo a registrar cobro
  - **Varios préstamos** → muestra lista para elegir cuál cobrar
  - **Ninguno** → mensaje “no tiene préstamos activos para cobrar”

**Soporte:** búsqueda por DNI debe escribirse como en el sistema (con o sin guiones). Si el cliente existe pero no cobra, revisar que tenga préstamo en estado activo/mora.

---

### 4.4 Registrar cobro

- Se abre como modal desde la Hoja o desde Buscar
- Muestra datos del cliente (teléfono, dirección, referencia si el backend los envía)
- **Cuota sugerida** precargada en “Monto recibido”
- **API:** `POST /pagos/` con capital, interés, documento `Cuota N`, etc.
- Tras guardar: opción de **Ver factura** (PDF vía `GET /pagos/{id}/factura-pdf/`) y compartir por WhatsApp u otra app

**Importante para soporte:** el monto y el botón **Confirmar cobro** están **fijos en la parte inferior** de la pantalla; la información del cliente arriba hace scroll si es larga.

---

### 4.5 Historial (pestaña “Historial”)

- Cobros **del día actual** del usuario/sesión
- **API:** `GET /pagos/historial-cobros/?modo=dia&fecha=AAAA-MM-DD`
- Muestra total cobrado hoy y detalle por registro
- Refresco cada 30 s

---

### 4.6 Cerrar sesión

- Botón **Salir** en la barra superior de las pestañas
- Borra tokens locales; no invalida el refresh en servidor (comportamiento estándar JWT)

---

## 5. Autenticación y seguridad

| Aspecto | Comportamiento |
|---------|----------------|
| Tokens | Access + refresh en almacenamiento seguro del dispositivo |
| Expiración | Si el access vence, la app intenta `POST /token/refresh/` automáticamente |
| Sin sesión | Redirige a login |
| Timeout API | 30 segundos por petición |

**Soporte:** errores 401 repetidos → pedir que cierre sesión y vuelva a entrar. Si persiste, revisar que el usuario siga activo en el backend.

---

## 6. Actualizaciones: OTA vs nueva APK

### Actualización OTA (sin reinstalar)

- Cambios de **pantallas, textos, lógica JavaScript**
- La app comprueba al **abrir** y al **volver al primer plano**
- Si hay update en canal `production`, descarga y **reinicia sola**

**Publicar OTA (equipo técnico):**

```powershell
cd mobile-rebuild
.\scripts\publish-update.ps1 -Message "Descripción del cambio"
```

O manualmente:

```bash
npx eas update --channel production --environment production --message "Descripción"
```

Dashboard de updates:  
https://expo.dev/accounts/findeco990/projects/findeco-mobile/updates

**Instrucciones al cobrador para recibir OTA:**

1. Cerrar la app por completo (quitar de recientes)
2. Abrir de nuevo y esperar 5–10 segundos en la pantalla de carga
3. Si no actualiza, minimizar y volver a abrir

### Nueva APK (reinstalar)

Hace falta cuando hay cambios **nativos**: permisos, librerías nuevas, `app.json` de Android, etc.

```powershell
cd mobile-rebuild
.\scripts\build-apk.ps1
```

Salida habitual:

- `mobile-rebuild/FINDECO-Cobros.apk`
- `mobile/FINDECO-Cobros-releaseV1.apk` (copia para distribución)

En Windows el script compila en `C:\findeco-build` porque Gradle suele fallar dentro de `Documents/OneDrive`.

---

## 7. Guía de soporte — problemas frecuentes

### “No puedo iniciar sesión”

| Causa probable | Qué hacer |
|----------------|-----------|
| Usuario o clave incorrectos | Probar login en el web |
| Sin internet | Verificar datos/Wi‑Fi |
| API caída | Probar URL en navegador o con el equipo técnico |
| Usuario sin permisos | Revisar rol y estado en backend |

---

### “La hoja de cobros está vacía”

| Causa probable | Qué hacer |
|----------------|-----------|
| Cartera incorrecta | Cambiar chip de cartera arriba |
| Usuario sin carteras | Asignar carteras en el web |
| Préstamos en otro estado | Solo se listan activo / mora / pendiente_aprobación |
| Retraso de datos | Esperar 30 s o jalar para refrescar |

---

### “Busqué un cliente y no pasa nada / no lo encuentra”

| Causa probable | Qué hacer |
|----------------|-----------|
| Menos de 2 caracteres | Escribir más del nombre o DNI completo |
| DNI mal escrito | Copiar DNI exacto del expediente |
| Cliente sin préstamo activo | Normal: la app avisa que no hay qué cobrar |
| App desactualizada | Cerrar y abrir para recibir OTA reciente |

---

### “No veo el monto o el botón Confirmar cobro”

| Causa probable | Qué hacer |
|----------------|-----------|
| App sin OTA reciente | Cerrar app y reabrir (update de layout) |
| Teclado tapando campo | El monto está abajo; bajar teclado o rotar pantalla |
| Pantalla muy pequeña | Hacer scroll arriba; monto y botón quedan fijos abajo |

---

### “Error al registrar el cobro”

| Causa probable | Qué hacer |
|----------------|-----------|
| Monto vacío o cero | Ingresar monto recibido |
| Cuota ya pagada | Verificar en web estado de cuotas |
| Sin conexión | Reintentar con internet estable |
| Validación backend | Leer mensaje de error en pantalla; revisar en panel web |

---

### “No llega la factura / no se comparte el PDF”

| Causa probable | Qué hacer |
|----------------|-----------|
| WhatsApp no instalado | Usar otra app del menú compartir |
| Permisos de archivos | Revisar permisos de Android para la app |
| Error al generar PDF | Revisar cobro en web; reintentar desde historial web |

---

### “Los datos no coinciden con el web”

- App y web usan la **misma API**; no hay base local separada
- Diferencias de segundos: esperar refresco automático (30 s)
- Si persiste: anotar número de préstamo, cliente y hora → escalar a técnico con captura

---

### “La app no se actualiza sola”

| Verificación | Acción |
|--------------|--------|
| ¿APK antigua sin expo-updates? | Instalar APK reciente de `mobile/` |
| ¿Sin internet al abrir? | Conectar y reabrir |
| ¿Canal production? | Confirmar con técnico que el OTA se publicó |
| Forzar | Cerrar app, limpiar de recientes, abrir de nuevo |

---

## 8. Estructura del proyecto (referencia técnica)

```
mobile-rebuild/
├── app/
│   ├── login.tsx              # Login
│   ├── (tabs)/
│   │   ├── index.tsx          # Hoja de cobros
│   │   ├── buscar.tsx         # Buscar cliente
│   │   └── historial.tsx      # Historial del día
│   └── pago/[id].tsx          # Registrar cobro
├── components/                # UI reutilizable (Screen, ClienteInfoCard, logo…)
├── lib/
│   ├── api.ts                 # Cliente HTTP + JWT
│   ├── auth.tsx               # Sesión
│   ├── buscarClientes.ts      # Lógica búsqueda DNI/nombre
│   ├── navigateToCobro.ts     # Navegación a pantalla de pago
│   ├── updates.ts             # OTA expo-updates
│   └── useScreenPolling.ts    # Refresco cada 30 s
├── scripts/
│   ├── build-apk.ps1          # Compilar APK en Windows
│   └── publish-update.ps1     # Publicar OTA
├── app.json                   # Config Expo (API, updates, Android)
└── eas.json                   # Perfiles de build EAS
```

---

## 9. Desarrollo local

```bash
cd mobile-rebuild
npm install
cp .env.example .env   # si existe; o crear con EXPO_PUBLIC_API_BASE_URL
npm start
```

Escanear QR con **Expo Go** o ejecutar en emulador Android.

> En modo desarrollo (`npm start`) **no se aplican actualizaciones OTA**; se prueba el código local en caliente.

Variable de entorno:

```env
EXPO_PUBLIC_API_BASE_URL=https://web-production-93580.up.railway.app/api/v1
```

---

## 10. Checklist rápido para soporte telefónico

1. ¿Tiene internet?
2. ¿Versión de app? (si hay dudas, reinstalar APK de `mobile/FINDECO-Cobros-releaseV1.apk`)
3. ¿Usuario entra en el web con las mismas credenciales?
4. ¿Ve al menos una cartera en la Hoja?
5. ¿El préstamo está activo/mora en el panel web?
6. ¿Mensaje de error exacto en pantalla?
7. Si es bug de pantalla reciente → cerrar app y reabrir para OTA
8. Si no se resuelve → anotar: usuario, cartera, cliente/DNI, préstamo, hora, captura → escalar a desarrollo

---

## 11. Relación con el sistema web

| Acción en web | Efecto en móvil |
|---------------|-----------------|
| Crear préstamo en cartera | Aparece en Hoja (~30 s) |
| Registrar cobro en web | Desaparece cuota pendiente en móvil al refrescar |
| Anular pago | Reflejado al refrescar historial/hoja |
| Cambiar cartera del usuario | Tras nuevo login o refresco de perfil |
| Datos cliente (teléfono, dirección) | Visibles en cobro si el backend los incluye en reporte-integración |

---

## 12. Contactos y enlaces útiles

| Recurso | URL / ubicación |
|---------|------------------|
| API producción | https://web-production-93580.up.railway.app/api/v1 |
| Backend (código) | Repositorio `backendfindeco2` |
| Panel web | Repositorio `frontend` |
| APK para distribuir | `mobile/FINDECO-Cobros-releaseV1.apk` |
| Updates Expo | https://expo.dev/accounts/findeco990/projects/findeco-mobile |

---

*Última actualización: julio 2026 — app Expo 57, canal OTA `production`, runtime `1.0.0`.*
