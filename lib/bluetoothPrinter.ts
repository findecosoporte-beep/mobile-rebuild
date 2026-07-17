import * as SecureStore from 'expo-secure-store'
import { PermissionsAndroid, Platform } from 'react-native'

import { api } from '@/lib/api'

const PRINTER_ADDRESS_KEY = 'findeco_bt_printer_address'
const PRINTER_NAME_KEY = 'findeco_bt_printer_name'

export interface ImpresoraBluetooth {
  address: string
  name: string
}

type ThermalModule = {
  default: {
    scan: () => Promise<{ paired?: Array<{ address?: string; name?: string }>; found?: Array<{ address?: string; name?: string }> }>
    connect: (address: string, options?: { timeout?: number }) => Promise<void>
    disconnect: (address?: string) => Promise<void>
    print: (address: string, nodes: unknown[], options?: unknown) => Promise<unknown>
  }
  image: (source: { base64: string; width?: number }) => unknown
  feed: (lines: number) => unknown
  cut: (options?: { partial?: boolean }) => unknown
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
  return { address, name: name || address }
}

export async function guardarImpresora(printer: ImpresoraBluetooth): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(PRINTER_ADDRESS_KEY, printer.address),
    SecureStore.setItemAsync(PRINTER_NAME_KEY, printer.name || printer.address),
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
    const address = String(device.address || '').trim()
    if (!address) continue
    mapa.set(address, {
      address,
      name: String(device.name || address).trim() || address,
    })
  }
  return Array.from(mapa.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'))
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

export async function descargarFacturaPngBase64(idPago: number): Promise<{
  base64: string
  width: number
}> {
  const response = await api.get<ArrayBuffer>(`/pagos/${idPago}/factura-png/`, {
    responseType: 'arraybuffer',
  })
  return {
    base64: arrayBufferToBase64(response.data),
    width: 384,
  }
}

export async function imprimirFacturaBluetooth(idPago: number): Promise<void> {
  if (!bluetoothImpresoraSoportado()) {
    throw new Error('La impresión Bluetooth térmica está disponible solo en Android.')
  }
  await asegurarPermisosBluetooth()
  const printer = await getImpresoraGuardada()
  if (!printer?.address) {
    throw new Error('Seleccione una impresora Bluetooth en la pestaña Impresora.')
  }

  const Thermal = getThermalModule()
  const { base64, width } = await descargarFacturaPngBase64(idPago)

  try {
    await Thermal.default.connect(printer.address, { timeout: 12000 })
    await Thermal.default.print(printer.address, [
      Thermal.image({ base64, width }),
      Thermal.feed(3),
      Thermal.cut(),
    ])
  } finally {
    try {
      await Thermal.default.disconnect(printer.address)
    } catch {
      // Ignorar fallo al desconectar; la impresión pudo completar.
    }
  }
}
