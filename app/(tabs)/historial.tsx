import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { api, apiErrorMessage } from '@/lib/api'
import {
  bluetoothImpresoraSoportado,
  getImpresoraGuardada,
  imprimirFacturaBluetooth,
} from '@/lib/bluetoothPrinter'
import { Screen } from '@/components/Screen'
import { formatMoney, todayIsoDate } from '@/lib/format'
import { colors, shadows } from '@/lib/theme'
import { useScreenPolling } from '@/lib/useScreenPolling'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

const REFRESCO_MS = 30000

type ModoHistorial = 'dia' | 'mes'

interface HistorialFila {
  id_pago: number
  fecha_pago: string
  hora_pago?: string
  nombre_cliente: string
  numero_prestamo: string
  total: string
  documento: string
  numero_factura?: string | null
  registrado_por_nombre?: string
}

interface HistorialResponse {
  filas: HistorialFila[]
  resumen: { registros: number; total_cobrado: string }
  fecha_inicio?: string
  fecha_fin?: string
}

function mesActual(): { mes: string; anio: string } {
  const now = new Date()
  return {
    mes: String(now.getMonth() + 1),
    anio: String(now.getFullYear()),
  }
}

function etiquetaFactura(item: HistorialFila): string {
  const folio = (item.numero_factura || '').trim()
  if (folio) return folio
  return `F${item.id_pago}`
}

export default function HistorialScreen() {
  const [modo, setModo] = useState<ModoHistorial>('dia')
  const [filas, setFilas] = useState<HistorialFila[]>([])
  const [total, setTotal] = useState('0')
  const [loading, setLoading] = useState(false)
  const [imprimiendoId, setImprimiendoId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const cargar = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setError('')
      try {
        const params =
          modo === 'dia'
            ? `modo=dia&fecha=${todayIsoDate()}`
            : (() => {
                const { mes, anio } = mesActual()
                return `modo=mes&mes=${mes}&anio=${anio}`
              })()
        const { data } = await api.get<HistorialResponse>(`/pagos/historial-cobros/?${params}`)
        setFilas(data.filas ?? [])
        setTotal(data.resumen?.total_cobrado ?? '0')
      } catch (e) {
        setError(apiErrorMessage(e, 'No se pudo cargar el historial de facturas.'))
        setFilas([])
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [modo],
  )

  useScreenPolling(() => void cargar(true), REFRESCO_MS)

  useEffect(() => {
    void cargar(false)
  }, [cargar])

  async function compartirPdf(idPago: number) {
    try {
      const response = await api.get<ArrayBuffer>(`/pagos/${idPago}/factura-pdf/`, {
        responseType: 'arraybuffer',
        params: { ticket: '80' },
      })
      const bytes = new Uint8Array(response.data)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      const base64 = globalThis.btoa(binary)
      const path = `${FileSystem.cacheDirectory}factura-${idPago}.pdf`
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/pdf',
          dialogTitle: 'Factura FINDECO',
        })
      } else {
        Alert.alert('Factura', 'No se puede compartir PDF en este dispositivo.')
      }
    } catch (e) {
      Alert.alert('Factura', apiErrorMessage(e, 'No se pudo descargar el PDF.'))
    }
  }

  async function reimprimir(item: HistorialFila) {
    if (!bluetoothImpresoraSoportado()) {
      Alert.alert('Impresión', 'Bluetooth solo en Android. Use Compartir PDF.', [
        { text: 'Compartir PDF', onPress: () => void compartirPdf(item.id_pago) },
        { text: 'Cerrar', style: 'cancel' },
      ])
      return
    }
    const impresora = await getImpresoraGuardada()
    if (!impresora?.address) {
      Alert.alert(
        'Impresora',
        'Seleccione la impresora en la pestaña Impresora antes de reimprimir.',
      )
      return
    }

    setImprimiendoId(item.id_pago)
    try {
      await imprimirFacturaBluetooth(item.id_pago)
      Alert.alert('Impresión', `Factura ${etiquetaFactura(item)} enviada a la impresora.`)
    } catch (e) {
      Alert.alert(
        'Impresión',
        e instanceof Error ? e.message : 'No se pudo reimprimir. Puede compartir el PDF.',
        [
          { text: 'Compartir PDF', onPress: () => void compartirPdf(item.id_pago) },
          { text: 'Cerrar', style: 'cancel' },
        ],
      )
    } finally {
      setImprimiendoId(null)
    }
  }

  function confirmarReimprimir(item: HistorialFila) {
    Alert.alert(
      'Reimprimir factura',
      `${etiquetaFactura(item)}\n${item.nombre_cliente}\n${formatMoney(item.total)}\n\n¿Enviar a la impresora Bluetooth?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Imprimir', onPress: () => void reimprimir(item) },
        { text: 'PDF', onPress: () => void compartirPdf(item.id_pago) },
      ],
    )
  }

  const periodoLabel = modo === 'dia' ? 'hoy' : 'este mes'

  return (
    <Screen edges={['left', 'right']} style={styles.screen}>
      <View style={styles.chips}>
        <Pressable
          style={[styles.chip, modo === 'dia' && styles.chipActive]}
          onPress={() => setModo('dia')}
        >
          <Text style={[styles.chipText, modo === 'dia' && styles.chipTextActive]}>Hoy</Text>
        </Pressable>
        <Pressable
          style={[styles.chip, modo === 'mes' && styles.chipActive]}
          onPress={() => setModo('mes')}
        >
          <Text style={[styles.chipText, modo === 'mes' && styles.chipTextActive]}>Mes</Text>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons name="receipt" size={24} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Facturas {periodoLabel}</Text>
          <Text style={styles.summaryAmount}>{formatMoney(total)}</Text>
          <View style={styles.countRow}>
            <Ionicons name="documents-outline" size={14} color={colors.textMuted} />
            <Text style={styles.summaryCount}>{filas.length} factura(s)</Text>
          </View>
        </View>
      </View>

      <Text style={styles.hint}>
        Toque una factura para reimprimirla (misma del servidor) o compartir PDF.
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {loading && filas.length === 0 ? (
        <ActivityIndicator color={colors.primaryDark} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(item) => String(item.id_pago)}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void cargar(false)}
              tintColor={colors.primaryDark}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Text style={styles.empty}>Sin facturas {periodoLabel}.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const busy = imprimiendoId === item.id_pago
            return (
              <Pressable
                style={styles.row}
                onPress={() => confirmarReimprimir(item)}
                disabled={imprimiendoId != null}
              >
                <View style={styles.rowIcon}>
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Ionicons name="print-outline" size={22} color={colors.primaryDark} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.client}>{item.nombre_cliente}</Text>
                  <Text style={styles.folio}>{etiquetaFactura(item)}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="document-text-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.meta}>
                      {item.numero_prestamo}
                      {item.documento ? ` · ${item.documento}` : ''}
                      {item.hora_pago ? ` · ${item.hora_pago}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.rightCol}>
                  <Text style={styles.monto}>{formatMoney(item.total)}</Text>
                  <Text style={styles.reimprimir}>Reimprimir</Text>
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: { color: '#fff' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 26,
    color: colors.text,
    marginTop: 2,
  },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  summaryCount: { fontFamily: 'PlusJakartaSans_500Medium', color: colors.textMuted, fontSize: 13 },
  hint: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  rowIcon: { width: 28, alignItems: 'center' },
  client: { fontFamily: 'PlusJakartaSans_700Bold', color: colors.text, fontSize: 15 },
  folio: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.primaryDark,
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.textMuted, flex: 1 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  monto: { fontFamily: 'PlusJakartaSans_700Bold', color: colors.success, fontSize: 15 },
  reimprimir: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.primaryDark,
  },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  empty: { textAlign: 'center', color: colors.textMuted, fontFamily: 'PlusJakartaSans_500Medium' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  error: { flex: 1, color: colors.danger, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 },
})
