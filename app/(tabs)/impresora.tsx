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
  nombreSugiere3nStarPpt35,
  perfilImpresora,
  probarImpresora,
  type ImpresoraBluetooth,
} from '@/lib/bluetoothPrinter'
import { useScreenPolling } from '@/lib/useScreenPolling'
import { colors, shadows } from '@/lib/theme'

export default function ImpresoraScreen() {
  const [loading, setLoading] = useState(false)
  const [impresoras, setImpresoras] = useState<ImpresoraBluetooth[]>([])
  const [seleccionada, setSeleccionada] = useState<ImpresoraBluetooth | null>(null)
  const [error, setError] = useState('')

  const cargarEstado = useCallback(async () => {
    const actual = await getImpresoraGuardada()
    setSeleccionada(actual)
  }, [])

  useScreenPolling(() => void cargarEstado(), 15000)

  async function escanear() {
    if (!bluetoothImpresoraSoportado()) {
      Alert.alert(
        'Impresora',
        'La impresión Bluetooth está disponible solo en Android. En iOS use Compartir PDF.',
      )
      return
    }
    setLoading(true)
    setError('')
    try {
      await cargarEstado()
      const lista = await escanearImpresoras()
      setImpresoras(lista)
      if (!lista.length) {
        setError(
          'No se encontró la 3nStar PPT35BT. Emparéjela en Ajustes → Bluetooth y vuelva a buscar.',
        )
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e || '')
      if (/startDiscovery|SCAN_FAILED|permissions and location|Ubicaci/i.test(raw)) {
        setError(
          'Active la Ubicación (GPS) del teléfono y vuelva a pulsar Buscar. La impresora debe estar emparejada en Ajustes → Bluetooth.',
        )
      } else {
        setError(raw || 'No se pudo escanear Bluetooth.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function seleccionar(item: ImpresoraBluetooth) {
    await guardarImpresora(item)
    setSeleccionada(item)
    const esModelo = nombreSugiere3nStarPpt35(item.name)
    Alert.alert(
      esModelo ? '3nStar PPT35BT' : 'Impresora',
      esModelo
        ? `Se usará «${item.name}» (ESC/POS 80 mm) al imprimir facturas.`
        : `Se guardó «${item.name}». Confirme que sea la 3nStar PPT35BT.`,
    )
  }

  async function quitar() {
    await limpiarImpresoraGuardada()
    setSeleccionada(null)
  }

  async function probar() {
    if (!seleccionada) {
      Alert.alert('Impresora', 'Seleccione la 3nStar PPT35BT primero.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await probarImpresora()
      Alert.alert(
        'Prueba de conexión',
        'Si el papel sale en blanco pero el motor suena: voltee el rollo térmico (solo una cara imprime). Si salió texto, al cobrar pulse Imprimir.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo probar la impresora.')
    } finally {
      setLoading(false)
    }
  }

  const perfil = perfilImpresora()

  return (
    <Screen edges={['bottom', 'left', 'right']} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Impresora Bluetooth</Text>
        <Text style={styles.hint}>
          Configurada para <Text style={styles.hintBold}>3nStar PPT35BT</Text> — ticket{' '}
          {perfil.paperWidthMm} mm. Al cobrar se imprime la{' '}
          <Text style={styles.hintBold}>misma factura del servidor</Text> (factura-png). Empareje en
          Ajustes → Bluetooth, deje la <Text style={styles.hintBold}>Ubicación (GPS) encendida</Text>{' '}
          y pulse Buscar.
        </Text>
        {Platform.OS !== 'android' ? (
          <Text style={styles.warn}>En este dispositivo use «Compartir PDF» tras el cobro.</Text>
        ) : null}

        <View style={styles.modeloBox}>
          <Ionicons name="print" size={22} color={colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeloTitle}>3nStar PPT35BT</Text>
            <Text style={styles.modeloSub}>
              {perfil.etiqueta} · {perfil.widthPx} px
            </Text>
          </View>
        </View>

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
        {seleccionada ? (
          <Pressable
            style={[styles.button, styles.testBtn]}
            onPress={() => void probar()}
            disabled={loading}
          >
            <Ionicons name="flask-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.testText}>Probar conexión</Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        data={impresoras}
        keyExtractor={(item) => item.address}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              Pulse Buscar para listar la 3nStar PPT35BT emparejada o cercana.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const activa = seleccionada?.address === item.address
          const esModelo = nombreSugiere3nStarPpt35(item.name)
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
                {esModelo ? <Text style={styles.badge}>PPT35BT</Text> : null}
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
  hintBold: { fontFamily: 'PlusJakartaSans_700Bold', color: colors.text },
  warn: {
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: colors.danger,
  },
  modeloBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  modeloTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.primaryDark,
  },
  modeloSub: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
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
  testBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryLight,
  },
  testText: { color: colors.primaryDark, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
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
  itemAddress: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.primaryDark,
  },
})
