import { Ionicons } from '@expo/vector-icons'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors } from '@/lib/theme'

export interface ClienteInfoData {
  telefono?: string
  direccionResidencia?: string
  direccionNegocio?: string
  referencia?: string
  referenciaParentesco?: string
  referenciaTelefono?: string
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  onPress?: () => void
}) {
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {onPress ? <Ionicons name="call-outline" size={18} color={colors.primaryDark} /> : null}
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    )
  }

  return content
}

function llamar(numero: string) {
  const limpio = numero.replace(/\s+/g, '')
  if (limpio) void Linking.openURL(`tel:${limpio}`)
}

export function ClienteInfoCard({
  telefono,
  direccionResidencia,
  direccionNegocio,
  referencia,
  referenciaParentesco,
  referenciaTelefono,
}: ClienteInfoData) {
  const direccion =
    direccionResidencia?.trim() ||
    direccionNegocio?.trim() ||
    ''
  const direccionExtra =
    direccionResidencia?.trim() &&
    direccionNegocio?.trim() &&
    direccionResidencia.trim() !== direccionNegocio.trim()
      ? direccionNegocio.trim()
      : ''

  const refPartes: string[] = []
  if (referencia?.trim()) refPartes.push(referencia.trim())
  if (referenciaParentesco?.trim()) refPartes.push(referenciaParentesco.trim())
  const refLinea = refPartes.join(' · ')

  const tieneAlgo =
    telefono?.trim() ||
    direccion ||
    direccionExtra ||
    refLinea ||
    referenciaTelefono?.trim()

  if (!tieneAlgo) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>Sin datos de contacto del cliente.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.title}>Datos del cliente</Text>
      </View>

      {telefono?.trim() ? (
        <InfoRow
          icon="call-outline"
          label="Teléfono"
          value={telefono.trim()}
          onPress={() => llamar(telefono.trim())}
        />
      ) : null}

      {direccion ? (
        <InfoRow icon="location-outline" label="Dirección" value={direccion} />
      ) : null}

      {direccionExtra ? (
        <InfoRow icon="business-outline" label="Dirección negocio" value={direccionExtra} />
      ) : null}

      {refLinea ? (
        <InfoRow icon="people-outline" label="Referencia" value={refLinea} />
      ) : null}

      {referenciaTelefono?.trim() ? (
        <InfoRow
          icon="phone-portrait-outline"
          label="Tel. referencia"
          value={referenciaTelefono.trim()}
          onPress={() => llamar(referenciaTelefono.trim())}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowText: {
    flex: 1,
  },
  label: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
    lineHeight: 20,
  },
  empty: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
})
