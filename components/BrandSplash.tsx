import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FindecoLogo } from '@/components/FindecoLogo'
import { colors } from '@/lib/theme'

interface BrandSplashProps {
  message?: string
}

export function BrandSplash({ message = 'Cargando...' }: BrandSplashProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <FindecoLogo width={300} height={112} />
      <Text style={styles.appName}>Cobros móvil</Text>
      <ActivityIndicator size="large" color={colors.brandBlue} style={styles.loader} />
      <Text style={styles.message}>{message}</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  appName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 32,
  },
  loader: {
    marginBottom: 12,
  },
  message: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: colors.textMuted,
  },
})
