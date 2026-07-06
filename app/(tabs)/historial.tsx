import { Ionicons } from '@expo/vector-icons'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'

import { api, apiErrorMessage } from '@/lib/api'
import { Screen } from '@/components/Screen'
import { formatMoney, todayIsoDate } from '@/lib/format'
import { colors, shadows } from '@/lib/theme'
import { useScreenPolling } from '@/lib/useScreenPolling'

const REFRESCO_MS = 30000

interface HistorialFila {
  id_pago: number
  fecha_pago: string
  nombre_cliente: string
  numero_prestamo: string
  total: string
  documento: string
}

interface HistorialResponse {
  filas: HistorialFila[]
  resumen: { registros: number; total_cobrado: string }
}

export default function HistorialScreen() {
  const [filas, setFilas] = useState<HistorialFila[]>([])
  const [total, setTotal] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const fecha = todayIsoDate()
      const { data } = await api.get<HistorialResponse>(
        `/pagos/historial-cobros/?modo=dia&fecha=${fecha}`,
      )
      setFilas(data.filas ?? [])
      setTotal(data.resumen?.total_cobrado ?? '0')
    } catch (e) {
      setError(apiErrorMessage(e, 'No se pudo cargar el historial.'))
      setFilas([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useScreenPolling(() => void cargar(true), REFRESCO_MS)

  return (
    <Screen edges={['left', 'right']} style={styles.screen}>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons name="trending-up" size={24} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Cobrado hoy</Text>
          <Text style={styles.summaryAmount}>{formatMoney(total)}</Text>
          <View style={styles.countRow}>
            <Ionicons name="receipt-outline" size={14} color={colors.textMuted} />
            <Text style={styles.summaryCount}>{filas.length} registro(s)</Text>
          </View>
        </View>
      </View>

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
            <RefreshControl refreshing={loading} onRefresh={() => void cargar(false)} tintColor={colors.primaryDark} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Text style={styles.empty}>Sin cobros registrados hoy.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.client}>{item.nombre_cliente}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="document-text-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.meta}>
                    {item.numero_prestamo} · {item.documento}
                  </Text>
                </View>
              </View>
              <Text style={styles.monto}>{formatMoney(item.total)}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase' },
  summaryAmount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 26,
    color: colors.text,
    marginTop: 2,
  },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  summaryCount: { fontFamily: 'PlusJakartaSans_500Medium', color: colors.textMuted, fontSize: 13 },
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.textMuted },
  monto: { fontFamily: 'PlusJakartaSans_700Bold', color: colors.success, fontSize: 15 },
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
