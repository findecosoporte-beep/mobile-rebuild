import { StyleSheet, View, type ViewProps } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors } from '@/lib/theme'

type Edge = 'top' | 'bottom' | 'left' | 'right'

interface ScreenProps extends ViewProps {
  children: React.ReactNode
  /** Safe area edges. En tabs omitir "bottom" (lo cubre la barra de tabs). */
  edges?: Edge[]
}

export function Screen({ children, edges = ['top', 'left', 'right'], style, ...props }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]} {...props}>
      {children}
    </SafeAreaView>
  )
}

/** Padding inferior extra para listas dentro de tabs (barra tabs + gestos del sistema). */
export function useTabListPadding(extra = 16): number {
  const insets = useSafeAreaInsets()
  return Math.max(insets.bottom, 8) + 72 + extra
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
})
