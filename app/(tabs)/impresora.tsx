import { Ionicons } from '@expo/vector-icons'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Screen } from '@/components/Screen'
import {
  bluetoothImpresoraSoportado,
  escanearImpresoras,
  getImpresoraGuardada,
  guardarImpresora,
  limpiarImpresoraGuardada,
  type ImpresoraBluetooth,
} from '@/lib/bluetoothPrinter'
import { useScreenPolling } from '@/lib/useScreenPolling'
import { colors, shadows } from '@/lib/theme'

export default function ImpresoraScreen() {
  const [loading, setLoading] = useState(false)
  const [impresoras, setImpresoras] = useState<ImpresoraBluetooth[]>([])
  const [seleccionada, setSeleccionada] = useState<ImpresoraBluetooth | null>(null)
  const [error, setError] = useState('')

  const cargarSeleccionada = useCallback(async () => {
    const actual = await getImpresoraGuardada()
    setSeleccionada(actual)
  }, [])

  useScreenPolling(() => void cargarSeleccionada(), 15000)

  async function escanear() {
    if (!bluetoothImpresoraSoportado()) {
      Alert.alert(
        'Impresora',
        'La impresión Bluetooth Classic está disponible solo en Android. En iOS use Compartir PDF.',
      )
      return
    }
    setLoading(true)
    setError('')
    try {
      await cargarSeleccionada()
      const lista = await escanearImpresoras()
      setImpresoras(lista)
      if (!lista.length) {
        setError('No se encontraron impresoras. Empareje la térmica en Ajustes de Bluetooth y vuelva a buscar.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo escanear Bluetooth.')
    } finally {
      setLoading(false)
    }
  }

  async function seleccionar(item: ImpresoraBluetooth) {
    await guardarImpresora(item)
    setSeleccionada(item)
    Alert.alert('Impresora', `Se usará «${item.name}» al imprimir facturas.`)
  }

  async function quitar() {
    await limpiarImpresoraGuardada()
    setSeleccionada(null)
  }

  return (
    <Screen edges={['bottom', 'left', 'right']} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Impresora Bluetooth</Text>
        <Text style={styles.hint}>
          La factura se convierte a imagen (PNG) en el servidor y se envía por ESC/POS a la térmica
          58 mm.
        </Text>
        {Platform.OS !== 'android' ? (
          <Text style={styles.warn}>En este dispositivo use «Compartir PDF» tras el cobro.</Text>
        ) : null}
        <Text style={styles.selectedLabel}>Seleccionada</Text>
        <Text style={styles.selectedValue}>
          {seleccionada ? `${seleccionada.name}\n${seleccionada.address}` : 'Ninguna'}
        </Text>
        <View style={styles.row}>
          <Pressable style={[styles.button, styles.primary]} onPress={() => void escanear()} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="bluetooth" size={18} color="#fff" />
                <Text style={styles.buttonText}>Buscar</Text>
              </>
            )}
          </Pressable>
          {seleccionada ? (
            <Pressable style={[styles.button, styles.secondary]} onPress={() => void quitar()}>
              <Text style={styles.secondaryText}>Quitar</Text>
            </Pressable>
          ) : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        data={impresoras}
        keyExtractor={(item) => item.address}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>Pulse Buscar para listar impresoras emparejadas o cercanas.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const activa = seleccionada?.address === item.address
          return (
            <Pressable
              style={[styles.item, activa && styles.itemActive]}
              onPress={() => void seleccionar(item)}
            >
              <Ionicons
                name={activa ? 'print' : 'print-outline'}
                size={22}
                color={activa ? colors.primaryDark : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemAddress}>{item.address}</Text>
              </View>
              {activa ? <Ionicons name="checkmark-circle" size={22} color={colors.primaryDark} /> : null}
            </Pressable>
          )
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.text },
  hint: {
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  warn: {
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: colors.danger,
  },
  selectedLabel: {
    marginTop: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  selectedValue: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primary: { backgroundColor: colors.primaryDark, flex: 1 },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  secondaryText: { color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  error: { marginTop: 10, color: colors.danger, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemActive: { borderColor: colors.primaryDark, backgroundColor: colors.primaryLight },
  itemName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.text },
  itemAddress: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 },
})
