import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { api, apiErrorMessage } from '@/lib/api'
import { Screen } from '@/components/Screen'
import { useAuth } from '@/lib/auth'
import { formatMoney } from '@/lib/format'
import { colors, shadows } from '@/lib/theme'
import { useScreenPolling } from '@/lib/useScreenPolling'
import type { Cartera, ReporteIntegracionFila, ReporteIntegracionResponse } from '@/lib/types'

const REFRESCO_MS = 30000

export default function HojaCobrosScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const [carteras, setCarteras] = useState<Cartera[]>([])
  const [carteraId, setCarteraId] = useState<number | null>(null)
  const [filas, setFilas] = useState<ReporteIntegracionFila[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cargarCarteras = useCallback(async () => {
    const asignadas = profile?.carteras ?? []
    if (asignadas.length > 0) {
      setCarteras(asignadas.map((c) => ({ id_cartera: c.id_cartera, nombre: c.nombre, dia_cobro: c.dia_cobro })))
      setCarteraId((prev) => prev ?? asignadas[0]?.id_cartera ?? null)
      return
    }
    const { data } = await api.get<{ results: Cartera[] }>('/carteras/?page_size=100')
    const lista = data.results ?? []
    setCarteras(lista)
    setCarteraId((prev) => prev ?? lista[0]?.id_cartera ?? null)
  }, [profile?.carteras])

  const cargarHoja = useCallback(async (silent = false) => {
    if (carteraId == null) {
      setFilas([])
      return
    }
    if (!silent) setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        id_cartera: String(carteraId),
        estado: 'activo,pendiente_aprobacion,mora',
        all: '1',
      })
      const { data } = await api.get<ReporteIntegracionResponse>(
        `/prestamos/reporte-integracion/?${params.toString()}`,
      )
      setFilas(data.filas ?? [])
    } catch (e) {
      setError(apiErrorMessage(e, 'No se pudo cargar la hoja de cobros.'))
      setFilas([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [carteraId])

  const refrescar = useCallback(
    async (silent = false) => {
      await cargarCarteras()
      await cargarHoja(silent)
    },
    [cargarCarteras, cargarHoja],
  )

  useScreenPolling(() => void refrescar(true), REFRESCO_MS)

  useEffect(() => {
    if (carteraId != null) void cargarHoja(false)
  }, [carteraId, cargarHoja])

  return (
    <Screen edges={['left', 'right']} style={styles.screen}>
      <View style={styles.sectionHeader}>
        <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.sectionTitle}>Cartera de cobro</Text>
      </View>
      <View style={styles.chipsRow}>
        {carteras.map((c) => {
          const active = c.id_cartera === carteraId
          return (
            <Pressable
              key={c.id_cartera}
              onPress={() => setCarteraId(c.id_cartera)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Ionicons
                name="folder-outline"
                size={14}
                color={active ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.nombre}</Text>
            </Pressable>
          )
        })}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {loading && filas.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primaryDark} />
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(item) => String(item.id_prestamo)}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refrescar(false)} tintColor={colors.primaryDark} />
          }
          contentContainerStyle={filas.length === 0 ? styles.emptyList : [styles.list, { paddingBottom: 24 }]}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {carteraId == null ? 'Seleccione una cartera.' : 'No hay préstamos en esta cartera.'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/pago/[id]',
                  params: {
                    id: String(item.id_prestamo),
                    numero: item.numero_prestamo,
                    cliente: item.nombre_cliente,
                    cuota: item.cuota_siguiente_monto ?? item.cuota,
                    cuotaNumero: String(item.cuota_siguiente_numero ?? 1),
                    saldo: item.saldo_actual,
                    telefono: item.telefono ?? '',
                    direccionResidencia: item.direccion_residencia ?? '',
                    direccionNegocio: item.direccion_negocio ?? '',
                    referencia: item.referencia ?? '',
                    referenciaParentesco: item.referencia_parentesco ?? '',
                    referenciaTelefono: item.referencia_telefono ?? '',
                  },
                })
              }
            >
              <View style={styles.rowTop}>
                <View style={styles.indexBadge}>
                  <Text style={styles.rowIndex}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.clientName}>{item.nombre_cliente}</Text>
                  </View>
                  <Text style={styles.loanNum}>{item.numero_prestamo}</Text>
                  {item.telefono?.trim() ? (
                    <View style={styles.phoneRow}>
                      <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.phoneText}>{item.telefono.trim()}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cuotaBlock}>
                  <Text style={styles.cuotaLabel}>Cuota</Text>
                  <Text style={styles.cuotaMonto}>{formatMoney(item.cuota_siguiente_monto ?? item.cuota)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              {item.cuotas_atrasadas ? (
                <View style={styles.atrasoBox}>
                  <Ionicons name="warning-outline" size={14} color={colors.danger} />
                  <Text style={styles.atraso}>
                    {item.cuotas_atrasadas} cuota(s) atrasada(s): {item.cuotas_atrasadas_numeros}
                  </Text>
                </View>
              ) : null}
              <View style={styles.saldoRow}>
                <Ionicons name="cash-outline" size={14} color={colors.textMuted} />
                <Text style={styles.saldoLabel}>Saldo: {formatMoney(item.saldo_actual)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { fontFamily: 'PlusJakartaSans_600SemiBold', color: colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIndex: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: colors.primaryDark,
    fontSize: 13,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clientName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.text },
  loanNum: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2, marginLeft: 18 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginLeft: 18 },
  phoneText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.textSecondary },
  cuotaBlock: { alignItems: 'flex-end' },
  cuotaLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' },
  cuotaMonto: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.primaryDark },
  atrasoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  atraso: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.danger,
  },
  saldoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  saldoLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
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
