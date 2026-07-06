import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { colors } from '@/lib/theme'

export type AppIconName = ComponentProps<typeof Ionicons>['name']

interface AppIconProps {
  name: AppIconName
  size?: number
  color?: string
}

export function AppIcon({ name, size = 20, color = colors.text }: AppIconProps) {
  return <Ionicons name={name} size={size} color={color} />
}
