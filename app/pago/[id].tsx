import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { api, apiErrorMessage } from '@/lib/api'
import {
  bluetoothImpresoraSoportado,
  getImpresoraGuardada,
  imprimirFacturaBluetooth,
} from '@/lib/bluetoothPrinter'
import { ClienteInfoCard } from '@/components/ClienteInfoCard'
import { Screen } from '@/components/Screen'
import { formatMoney, todayIsoDate } from '@/lib/format'
import { colors, shadows } from '@/lib/theme'
import type { PagoCreateResponse } from '@/lib/types'

export default function PagoScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    id: string
    numero?: string
    cliente?: string
    cuota?: string
    cuotaNumero?: string
    saldo?: string
    telefono?: string
    direccionResidencia?: string
    direccionNegocio?: string
    referencia?: string
    referenciaParentesco?: string
    referenciaTelefono?: string
  }>()

  const idPrestamo = Number(params.id)
  const cuotaNumero = Number(params.cuotaNumero ?? 1)
  const cuotaSugerida = Number(params.cuota ?? 0)
  const saldoPosterior = Number(params.saldo ?? 0)

  const [montoRecibido, setMontoRecibido] = useState(String(cuotaSugerida || ''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function confirmarCobro() {
    const monto = Number(montoRecibido)
    if (!monto || monto <= 0) {
      setError('Indique el monto recibido del cliente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const capital = cuotaSugerida > 0 ? Math.min(monto, cuotaSugerida) : monto
      const interes = 0
      const payload = {
        id_prestamo: idPrestamo,
        fecha_pago: todayIsoDate(),
        documento: `Cuota ${cuotaNumero}`,
        capital: capital.toFixed(2),
        interes: interes.toFixed(2),
        mora: '0.00',
        saldo: Math.max(0, saldoPosterior - capital).toFixed(2),
        monto_recibido: monto.toFixed(2),
      }
      const { data } = await api.post<PagoCreateResponse>('/pagos/', payload)
      const idPago = data.id_pago
      const impresora = bluetoothImpresoraSoportado() ? await getImpresoraGuardada() : null

      if (impresora) {
        Alert.alert('Cobro registrado', '¿Imprimir factura por Bluetooth?', [
          {
            text: 'Imprimir',
            onPress: () => {
              void (async () => {
                try {
                  await imprimirFacturaBluetooth(idPago)
                  Alert.alert('Impresión', 'Factura enviada a la impresora.', [
                    { text: 'OK', onPress: () => router.back() },
                  ])
                } catch (printError) {
                  Alert.alert(
                    'Impresión',
                    printError instanceof Error
                      ? printError.message
                      : 'No se pudo imprimir. Puede compartir el PDF.',
                    [
                      {
                        text: 'Compartir PDF',
                        onPress: () => void compartirFactura(idPago),
                      },
                      { text: 'Cerrar', onPress: () => router.back() },
                    ],
                  )
                }
              })()
            },
          },
          {
            text: 'Compartir PDF',
            onPress: () => void compartirFactura(idPago),
          },
          { text: 'Cerrar', onPress: () => router.back() },
        ])
      } else {
        Alert.alert('Cobro registrado', 'El pago se guardó correctamente.', [
          {
            text: 'Ver factura',
            onPress: () => void compartirFactura(idPago),
          },
          { text: 'Cerrar', onPress: () => router.back() },
        ])
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'No se pudo registrar el cobro.'))
    } finally {
      setLoading(false)
    }
  }

  async function compartirFactura(idPago: number) {
    try {
      const response = await api.get<ArrayBuffer>(`/pagos/${idPago}/factura-pdf/`, {
        responseType: 'arraybuffer',
      })
      const bytes = new Uint8Array(response.data)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = globalThis.btoa(binary)
      const path = `${FileSystem.cacheDirectory}factura-${idPago}.pdf`
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: 'Factura FINDECO' })
      } else {
        Alert.alert('Factura', 'PDF generado en caché.')
      }
    } catch {
      Alert.alert('Factura', 'No se pudo abrir la factura.')
    }
  }

  return (
    <Screen edges={['bottom', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.clientCard}>
            <View style={styles.clientIcon}>
              <Ionicons name="person" size={24} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{params.cliente ?? 'Cliente'}</Text>
              <View style={styles.subtitleRow}>
                <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
                <Text style={styles.subtitle}>{params.numero ?? ''}</Text>
              </View>
            </View>
          </View>

          <ClienteInfoCard
            telefono={params.telefono}
            direccionResidencia={params.direccionResidencia}
            direccionNegocio={params.direccionNegocio}
            referencia={params.referencia}
            referenciaParentesco={params.referenciaParentesco}
            referenciaTelefono={params.referenciaTelefono}
          />

          <View style={styles.cuotaCard}>
            <View style={styles.cuotaHeader}>
              <Ionicons name="calculator-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.label}>Cuota sugerida</Text>
            </View>
            <Text style={styles.cuota}>{formatMoney(cuotaSugerida)}</Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.inputLabel}>Monto recibido</Text>
          <View style={styles.inputRow}>
            <Ionicons name="cash-outline" size={22} color={colors.textSecondary} />
            <TextInput
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={montoRecibido}
              onChangeText={setMontoRecibido}
              returnKeyType="done"
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => void confirmarCobro()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.buttonText}>Confirmar cobro</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  clientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.text },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', color: colors.textMuted, fontSize: 13 },
  cuotaCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cuotaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase' },
  cuota: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: colors.text, marginTop: 6 },
  inputLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: colors.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 8,
  },
  error: { flex: 1, color: colors.danger, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 },
  button: {
    marginTop: 12,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
})
