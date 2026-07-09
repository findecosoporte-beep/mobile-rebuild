import { Ionicons } from '@expo/vector-icons'

import { useRouter } from 'expo-router'

import { useState } from 'react'

import {

  ActivityIndicator,

  FlatList,

  Pressable,

  StyleSheet,

  Text,

  TextInput,

  View,

} from 'react-native'



import { api, apiErrorMessage } from '@/lib/api'

import { buscarClientes } from '@/lib/buscarClientes'

import { navigateToCobro } from '@/lib/navigateToCobro'

import { Screen, useTabListPadding } from '@/components/Screen'

import { formatMoney } from '@/lib/format'

import type { Cliente, ReporteIntegracionFila, ReporteIntegracionResponse } from '@/lib/types'

import { colors, shadows } from '@/lib/theme'



export default function BuscarClienteScreen() {

  const router = useRouter()

  const listPaddingBottom = useTabListPadding()

  const [query, setQuery] = useState('')

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')

  const [resultados, setResultados] = useState<Cliente[]>([])

  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)

  const [prestamosCliente, setPrestamosCliente] = useState<ReporteIntegracionFila[]>([])



  function limpiarPrestamos() {

    setClienteSeleccionado(null)

    setPrestamosCliente([])

  }



  async function buscar() {

    const q = query.trim()

    if (q.length < 2) {

      setError('Ingresa al menos 2 caracteres del DNI o nombre del cliente.')

      return

    }

    setLoading(true)

    setError('')

    limpiarPrestamos()

    try {

      const lista = await buscarClientes(q)

      setResultados(lista)

      if (!lista.length) setError('No se encontraron clientes.')

    } catch (e) {

      setError(apiErrorMessage(e, 'Error al buscar cliente.'))

      setResultados([])

    } finally {

      setLoading(false)

    }

  }



  async function seleccionarCliente(cliente: Cliente) {

    setLoading(true)

    setError('')

    limpiarPrestamos()

    try {

      const params = new URLSearchParams({

        id_cliente: String(cliente.id_cliente),

        estado: 'activo,pendiente_aprobacion,mora',

        all: '1',

      })

      const { data } = await api.get<ReporteIntegracionResponse>(

        `/prestamos/reporte-integracion/?${params.toString()}`,

      )

      const filas = data.filas ?? []

      if (!filas.length) {

        setError(`${cliente.nombre} no tiene préstamos activos para cobrar.`)

        return

      }

      if (filas.length === 1) {

        navigateToCobro(router, filas[0]!)

        return

      }

      setClienteSeleccionado(cliente)

      setPrestamosCliente(filas)

    } catch (e) {

      setError(apiErrorMessage(e, 'No se pudieron cargar los préstamos del cliente.'))

    } finally {

      setLoading(false)

    }

  }



  function limpiarBusqueda() {

    setQuery('')

    setError('')

    setResultados([])

    limpiarPrestamos()

  }



  const mostrandoPrestamos = clienteSeleccionado != null && prestamosCliente.length > 0



  return (

    <Screen edges={['left', 'right']} style={styles.screen}>

      <Text style={styles.hint}>Ingresa el DNI o nombre del cliente.</Text>



      <View style={styles.searchRow}>

        <Ionicons name="search-outline" size={20} color={colors.textMuted} />

        <TextInput

          placeholder="Buscar por DNI o nombre..."

          placeholderTextColor={colors.textMuted}

          style={styles.input}

          value={query}

          onChangeText={(text) => {

            setQuery(text)

            if (error) setError('')

          }}

          onSubmitEditing={() => void buscar()}

          returnKeyType="search"

        />

        {query.length > 0 ? (

          <Pressable onPress={limpiarBusqueda} hitSlop={8}>

            <Ionicons name="close-circle" size={20} color={colors.textMuted} />

          </Pressable>

        ) : null}

      </View>



      <Pressable style={styles.button} onPress={() => void buscar()} disabled={loading}>

        {loading && !mostrandoPrestamos ? (

          <ActivityIndicator color="#fff" />

        ) : (

          <>

            <Ionicons name="search" size={18} color="#fff" />

            <Text style={styles.buttonText}>Buscar</Text>

          </>

        )}

      </Pressable>



      {error ? (

        <View style={styles.errorBox}>

          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />

          <Text style={styles.error}>{error}</Text>

        </View>

      ) : null}



      {mostrandoPrestamos ? (

        <View style={styles.prestamosSection}>

          <View style={styles.prestamosHeader}>

            <Text style={styles.prestamosTitle}>Préstamos de {clienteSeleccionado?.nombre}</Text>

            <Pressable onPress={limpiarPrestamos} hitSlop={8}>

              <Text style={styles.prestamosVolver}>Volver</Text>

            </Pressable>

          </View>

          <FlatList

            data={prestamosCliente}

            keyExtractor={(item) => String(item.id_prestamo)}

            contentContainerStyle={{ paddingBottom: listPaddingBottom }}

            renderItem={({ item }) => (

              <Pressable style={styles.prestamoRow} onPress={() => navigateToCobro(router, item)}>

                <View style={{ flex: 1 }}>

                  <Text style={styles.prestamoNum}>{item.numero_prestamo}</Text>

                  <Text style={styles.prestamoMeta}>

                    Cuota: {formatMoney(item.cuota_siguiente_monto ?? item.cuota)} · Saldo:{' '}

                    {formatMoney(item.saldo_actual)}

                  </Text>

                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />

              </Pressable>

            )}

          />

        </View>

      ) : (

        <FlatList

          data={resultados}

          keyExtractor={(item) => String(item.id_cliente)}

          contentContainerStyle={{ paddingTop: 12, paddingBottom: listPaddingBottom }}

          ListEmptyComponent={

            !loading && !error && query.trim().length >= 2 ? (

              <View style={styles.emptyState}>

                <Ionicons name="people-outline" size={40} color={colors.textMuted} />

                <Text style={styles.emptyText}>Sin resultados</Text>

              </View>

            ) : null

          }

          renderItem={({ item }) => (

            <Pressable style={styles.row} onPress={() => void seleccionarCliente(item)} disabled={loading}>

              <View style={styles.avatar}>

                <Ionicons name="person" size={20} color={colors.primaryDark} />

              </View>

              <View style={{ flex: 1 }}>

                <Text style={styles.name}>{item.nombre}</Text>

                <View style={styles.dniRow}>

                  <Ionicons name="card-outline" size={12} color={colors.textMuted} />

                  <Text style={styles.dni}>{item.dni}</Text>

                </View>

                {item.telefono?.trim() ? (

                  <View style={styles.dniRow}>

                    <Ionicons name="call-outline" size={12} color={colors.textMuted} />

                    <Text style={styles.meta}>{item.telefono.trim()}</Text>

                  </View>

                ) : null}

                {item.direccion_residencia?.trim() ? (

                  <View style={styles.dniRow}>

                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />

                    <Text style={styles.meta} numberOfLines={1}>

                      {item.direccion_residencia.trim()}

                    </Text>

                  </View>

                ) : null}

              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />

            </Pressable>

          )}

        />

      )}



      {loading && mostrandoPrestamos ? (

        <ActivityIndicator color={colors.primaryDark} style={styles.loadingOverlay} />

      ) : null}

    </Screen>

  )

}



const styles = StyleSheet.create({

  screen: { flex: 1, padding: 16 },

  hint: { fontFamily: 'PlusJakartaSans_500Medium', color: colors.textSecondary, marginBottom: 10, fontSize: 14 },

  searchRow: {

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

    paddingVertical: 12,

    fontFamily: 'PlusJakartaSans_400Regular',

    fontSize: 15,

    color: colors.text,

  },

  button: {

    marginTop: 12,

    backgroundColor: colors.primaryDark,

    borderRadius: 10,

    paddingVertical: 12,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,

    minHeight: 44,

  },

  buttonText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },

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

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 32 },

  emptyText: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_500Medium' },

  row: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

    backgroundColor: colors.surface,

    borderRadius: 12,

    padding: 12,

    marginBottom: 8,

    borderWidth: 1,

    borderColor: colors.border,

    ...shadows.card,

  },

  avatar: {

    width: 40,

    height: 40,

    borderRadius: 20,

    backgroundColor: colors.primaryLight,

    alignItems: 'center',

    justifyContent: 'center',

  },

  name: { fontFamily: 'PlusJakartaSans_700Bold', color: colors.text, fontSize: 15 },

  dniRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },

  dni: { fontFamily: 'PlusJakartaSans_400Regular', color: colors.textMuted, fontSize: 13 },

  meta: { fontFamily: 'PlusJakartaSans_400Regular', color: colors.textSecondary, fontSize: 12, flex: 1 },

  prestamosSection: { flex: 1, marginTop: 12 },

  prestamosHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 10,

    gap: 8,

  },

  prestamosTitle: {

    flex: 1,

    fontFamily: 'PlusJakartaSans_700Bold',

    fontSize: 14,

    color: colors.text,

  },

  prestamosVolver: {

    fontFamily: 'PlusJakartaSans_600SemiBold',

    fontSize: 13,

    color: colors.primaryDark,

  },

  prestamoRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

    backgroundColor: colors.surface,

    borderRadius: 12,

    padding: 14,

    marginBottom: 8,

    borderWidth: 1,

    borderColor: colors.border,

    ...shadows.card,

  },

  prestamoNum: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.text },

  prestamoMeta: {

    fontFamily: 'PlusJakartaSans_400Regular',

    fontSize: 12,

    color: colors.textSecondary,

    marginTop: 4,

  },

  loadingOverlay: { marginTop: 12 },

})


