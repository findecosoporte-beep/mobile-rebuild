import { Image, type ImageSourcePropType } from 'react-native'

const findecoLogo = require('@/assets/images/findeco-logo.png') as ImageSourcePropType

interface FindecoLogoProps {
  width?: number
  height?: number
}

export function FindecoLogo({ width = 300, height = 112 }: FindecoLogoProps) {
  return (
    <Image
      source={findecoLogo}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="FINDECO"
    />
  )
}
