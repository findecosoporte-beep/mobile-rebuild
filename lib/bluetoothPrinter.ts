import * as SecureStore from 'expo-secure-store'
import { PermissionsAndroid, Platform } from 'react-native'

import { api } from '@/lib/api'

const PRINTER_ADDRESS_KEY = 'findeco_bt_printer_address'
const PRINTER_NAME_KEY = 'findeco_bt_printer_name'

/**
 * Perfil 3nStar PPT35BT con papel 80 mm.
 * La factura impresa es exactamente GET /pagos/{id}/factura-png/?ticket=80
 * (mismo PDF del backend convertido a PNG).
 */
export const PERFIL_3NSTAR_PPT35BT = {
  ticket: '80' as const,
  widthPx: 576,
  paperWidthMm: 80,
  etiqueta: '3nStar PPT35BT (80 mm)',
}

export interface ImpresoraBluetooth {
  address: string
  name: string
  deviceType?: string
}

type TextStyle = {
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  size?: 'normal' | 'wide' | 'tall' | 'large'
}

type ThermalModule = {
  default: {
    scan: () => Promise<{
      paired?: Array<{ address?: string; name?: string; deviceType?: string }>
      found?: Array<{ address?: string; name?: string; deviceType?: string }>
    }>
    connect: (address: string, options?: { timeout?: number }) => Promise<void>
    disconnect: (address?: string) => Promise<void>
    print: (address: string, nodes: unknown[], options?: unknown) => Promise<unknown>
    printRaw: (
      address: string,
      bytes: number[],
      options?: unknown,
    ) => Promise<{ success?: boolean; error?: string }>
  }
  text: (content: string, style?: TextStyle) => unknown
  line: (options?: { character?: string }) => unknown
  image: (source: { base64: string; width?: number }) => unknown
  feed: (lines: number) => unknown
  cut: (options?: { partial?: boolean }) => unknown
  raw: (data: number[]) => unknown
}

let thermalModule: ThermalModule | null | undefined

function getThermalModule(): ThermalModule {
  if (thermalModule === null) {
    throw new Error(
      'El módulo Bluetooth no está en este build. Genere un APK con prebuild (no Expo Go).',
    )
  }
  if (thermalModule) return thermalModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    thermalModule = require('react-native-thermal-printer-driver') as ThermalModule
    return thermalModule
  } catch {
    thermalModule = null
    throw new Error(
      'El módulo Bluetooth no está en este build. Genere un APK con prebuild (no Expo Go).',
    )
  }
}

export function bluetoothImpresoraSoportado(): boolean {
  return Platform.OS === 'android'
}

export function perfilImpresora() {
  return PERFIL_3NSTAR_PPT35BT
}

/** Detecta nombres típicos de la 3nStar PPT35BT (a veces el BT muestra solo el serial). */
export function nombreSugiere3nStarPpt35(name: string): boolean {
  const n = name.toLowerCase().replace(/[\s_-]+/g, '')
  return (
    n.includes('3nstar') ||
    n.includes('ppt35') ||
    n.includes('ppt35bt') ||
    n.includes('3nstarpt') ||
    n.includes('3nstarppt') ||
    /2033pa/.test(n) ||
    /^4b\d/.test(n) ||
    /ppt\d{2}/.test(n)
  )
}

/** Normaliza dirección a Bluetooth Classic SPP (bt:) para PPT35BT. */
export function normalizarDireccionImpresora(address: string, deviceType?: string): string {
  const trimmed = String(address || '').trim()
  const mac = trimmed.replace(/^(ble|bt|phomemo|mx11|cat|lan|tcp|3nstar):/i, '')
  if (!mac) return trimmed

  const lower = trimmed.toLowerCase()
  if (lower.startsWith('ble:') || deviceType === 'ble') {
    return `ble:${mac}`
  }
  return `bt:${mac}`
}

async function asegurarPermisosBluetooth(): Promise<void> {
  if (Platform.OS !== 'android') return
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0
  if (apiLevel >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ])
    const denied = Object.entries(result).filter(([, status]) => status !== PermissionsAndroid.RESULTS.GRANTED)
    if (denied.length) {
      throw new Error('Active los permisos de Bluetooth y ubicación para buscar impresoras.')
    }
    return
  }
  const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
  if (fine !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Active el permiso de ubicación para buscar impresoras Bluetooth.')
  }
}

export async function getImpresoraGuardada(): Promise<ImpresoraBluetooth | null> {
  const [address, name] = await Promise.all([
    SecureStore.getItemAsync(PRINTER_ADDRESS_KEY),
    SecureStore.getItemAsync(PRINTER_NAME_KEY),
  ])
  if (!address) return null
  return {
    address: normalizarDireccionImpresora(address),
    name: name || address,
  }
}

export async function guardarImpresora(printer: ImpresoraBluetooth): Promise<void> {
  const address = normalizarDireccionImpresora(printer.address, printer.deviceType)
  await Promise.all([
    SecureStore.setItemAsync(PRINTER_ADDRESS_KEY, address),
    SecureStore.setItemAsync(PRINTER_NAME_KEY, printer.name || address),
  ])
}

export async function limpiarImpresoraGuardada(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PRINTER_ADDRESS_KEY),
    SecureStore.deleteItemAsync(PRINTER_NAME_KEY),
  ])
}

export async function escanearImpresoras(): Promise<ImpresoraBluetooth[]> {
  if (!bluetoothImpresoraSoportado()) {
    throw new Error('La impresión Bluetooth térmica está disponible solo en Android.')
  }
  await asegurarPermisosBluetooth()
  const Thermal = getThermalModule()
  const { paired = [], found = [] } = await Thermal.default.scan()
  const mapa = new Map<string, ImpresoraBluetooth>()
  for (const device of [...paired, ...found]) {
    const raw = String(device.address || '').trim()
    if (!raw) continue
    const name = String(device.name || raw).trim() || raw
    const deviceType = String(device.deviceType || 'unknown')
    const address = normalizarDireccionImpresora(raw, deviceType)
    mapa.set(address, { address, name, deviceType })
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const aOk = nombreSugiere3nStarPpt35(a.name) ? 0 : 1
    const bOk = nombreSugiere3nStarPpt35(b.name) ? 0 : 1
    if (aOk !== bOk) return aOk - bOk
    return a.name.localeCompare(b.name, 'es')
  })
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return globalThis.btoa(binary)
}

/** Misma factura del backend: PDF ticket → PNG térmico. */
export async function descargarFacturaPngBase64(idPago: number): Promise<{
  base64: string
  width: number
}> {
  const perfil = perfilImpresora()
  const response = await api.get<ArrayBuffer>(`/pagos/${idPago}/factura-png/`, {
    responseType: 'arraybuffer',
    params: { ticket: perfil.ticket },
  })
  return {
    base64: arrayBufferToBase64(response.data),
    width: perfil.widthPx,
  }
}

async function conImpresoraConectada(
  run: (Thermal: ThermalModule, address: string) => Promise<void>,
): Promise<void> {
  if (!bluetoothImpresoraSoportado()) {
    throw new Error('La impresión Bluetooth térmica está disponible solo en Android.')
  }
  await asegurarPermisosBluetooth()
  const printer = await getImpresoraGuardada()
  if (!printer?.address) {
    throw new Error('Seleccione la impresora 3nStar PPT35BT en la pestaña Impresora.')
  }
  const address = normalizarDireccionImpresora(printer.address, printer.deviceType)
  const Thermal = getThermalModule()

  try {
    await Thermal.default.connect(address, { timeout: 20000 })
    await run(Thermal, address)
  } finally {
    try {
      await Thermal.default.disconnect(address)
    } catch {
      // ignore
    }
  }
}

export async function probarImpresora(): Promise<void> {
  const perfil = perfilImpresora()
  await conImpresoraConectada(async (Thermal, address) => {
    await Thermal.default.print(
      address,
      [
        Thermal.text('FINDECO PPT35BT', { align: 'center', bold: true, size: 'large' }),
        Thermal.text('Prueba OK', { align: 'center' }),
        Thermal.text(`Papel ${perfil.paperWidthMm} mm`),
        Thermal.feed(4),
      ],
      { timeout: 20000, paperWidthMm: perfil.paperWidthMm },
    )
  })
}

/**
 * Imprime la factura oficial del backend (factura-png = mismo contenido que factura-pdf).
 */
export async function imprimirFacturaBluetooth(idPago: number): Promise<void> {
  const perfil = perfilImpresora()
  const { base64, width } = await descargarFacturaPngBase64(idPago)

  await conImpresoraConectada(async (Thermal, address) => {
    await Thermal.default.print(
      address,
      [Thermal.image({ base64, width }), Thermal.feed(5)],
      { timeout: 60000, paperWidthMm: perfil.paperWidthMm },
    )
  })
}
