import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '@/lib/auth'
import { colors } from '@/lib/theme'

const TAB_BAR_HEIGHT = 56

function TabIcon({ name, color, size }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />
}

export default function TabLayout() {
  const { logout, profile } = useAuth()
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, 8)

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: bottomInset,
          height: TAB_BAR_HEIGHT + bottomInset,
        },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 11,
          marginBottom: 2,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 17,
          color: colors.text,
        },
        headerRight: () => (
          <Pressable
            onPress={() => void logout()}
            style={{ marginRight: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>
              Salir
            </Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: profile?.nombre_operativo ? `Hola, ${profile.nombre_operativo.split(' ')[0]}` : 'Hoja de cobros',
          tabBarLabel: 'Hoja',
          tabBarIcon: ({ color, size }) => <TabIcon name="clipboard-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar cliente',
          tabBarLabel: 'Buscar',
          tabBarIcon: ({ color, size }) => <TabIcon name="search-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial de facturas',
          tabBarLabel: 'Facturas',
          tabBarIcon: ({ color, size }) => <TabIcon name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="impresora"
        options={{
          title: 'Impresora Bluetooth',
          tabBarLabel: 'Impresora',
          tabBarIcon: ({ color, size }) => <TabIcon name="print-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
