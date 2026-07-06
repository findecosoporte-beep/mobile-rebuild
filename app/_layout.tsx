import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import 'react-native-reanimated'

import { BrandSplash } from '@/components/BrandSplash'
import { AuthProvider, useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'
import { checkAndApplyOtaUpdate, listenOtaOnForeground, sleep, type OtaCheckResult } from '@/lib/updates'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

const MIN_SPLASH_MS = 2500

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const onLogin = segments[0] === 'login'
    if (!isAuthenticated && !onLogin) {
      router.replace('/login')
    } else if (isAuthenticated && onLogin) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated, loading, router, segments])

  return children
}

function splashMessageFor(status: OtaCheckResult, authLoading: boolean): string {
  if (status === 'checking') return 'Buscando actualización...'
  if (status === 'downloading') return 'Descargando actualización...'
  if (status === 'reloading') return 'Aplicando cambios...'
  if (authLoading) return 'Verificando sesión...'
  return 'Iniciando FINDECO Cobros...'
}

function AppShell() {
  const { loading: authLoading } = useAuth()
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  })
  const [appReady, setAppReady] = useState(false)
  const [otaStatus, setOtaStatus] = useState<OtaCheckResult>('idle')

  useEffect(() => {
    if (!fontsLoaded) return

    let active = true

    ;(async () => {
      const startedAt = Date.now()

      await checkAndApplyOtaUpdate((status) => {
        if (active) setOtaStatus(status)
      })

      while (active && authLoading) {
        await sleep(100)
      }

      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_SPLASH_MS) {
        await sleep(MIN_SPLASH_MS - elapsed)
      }

      if (active) {
        setAppReady(true)
        await SplashScreen.hideAsync()
      }
    })()

    return () => {
      active = false
    }
  }, [fontsLoaded, authLoading])

  useEffect(() => {
    return listenOtaOnForeground()
  }, [])

  if (!fontsLoaded || !appReady) {
    return <BrandSplash message={splashMessageFor(otaStatus, authLoading)} />
  }

  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="pago/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Registrar cobro',
            headerStyle: { backgroundColor: colors.surface },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 17,
              color: colors.text,
            },
          }}
        />
      </Stack>
    </AuthGate>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
