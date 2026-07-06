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
import { Screen } from '@/components/Screen'
import type { Cliente, Paginated } from '@/lib/types'
import { colors, shadows } from '@/lib/theme'

export default function BuscarClienteScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultados, setResultados] = useState<Cliente[]>([])

  async function buscar() {
    const q = query.trim()
    if (q.length < 2) {
      setError('Ingresa el DNI o nombre del cliente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ search: q, page_size: '30' })
      const { data } = await api.get<Paginated<Cliente>>(`/clientes/?${params.toString()}`)
      setResultados(data.results ?? [])
      if (!data.results?.length) setError('No se encontraron clientes.')
    } catch (e) {
      setError(apiErrorMessage(e, 'Error al buscar cliente.'))
      setResultados([])
    } finally {
      setLoading(false)
    }
  }

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
          onChangeText={setQuery}
          onSubmitEditing={() => void buscar()}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Pressable style={styles.button} onPress={() => void buscar()}>
        <Ionicons name="search" size={18} color="#fff" />
        <Text style={styles.buttonText}>Buscar</Text>
      </Pressable>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={colors.primaryDark} style={{ marginTop: 16 }} /> : null}

      <FlatList
        data={resultados}
        keyExtractor={(item) => String(item.id_cliente)}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          !loading && !error && query.length >= 2 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>Sin resultados</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/(tabs)',
                params: { buscar: item.nombre },
              })
            }
          >
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
})
