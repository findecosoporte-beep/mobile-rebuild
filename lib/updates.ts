import * as Updates from 'expo-updates'
import { AppState, type AppStateStatus } from 'react-native'

let checking = false

export type OtaCheckResult = 'idle' | 'checking' | 'downloading' | 'reloading' | 'ready' | 'unavailable'

/** Busca actualización OTA. Si hay una nueva, descarga y reinicia la app. */
export async function checkAndApplyOtaUpdate(
  onStatus?: (status: OtaCheckResult) => void,
): Promise<void> {
  if (__DEV__) {
    onStatus?.('ready')
    return
  }

  if (!Updates.isEnabled) {
    onStatus?.('unavailable')
    return
  }

  if (checking) return
  checking = true

  try {
    onStatus?.('checking')
    const result = await Updates.checkForUpdateAsync()
    if (!result.isAvailable) {
      onStatus?.('ready')
      return
    }
    onStatus?.('downloading')
    await Updates.fetchUpdateAsync()
    onStatus?.('reloading')
    await Updates.reloadAsync()
  } catch {
    onStatus?.('ready')
  } finally {
    checking = false
  }
}

export function listenOtaOnForeground(): () => void {
  const handler = (state: AppStateStatus) => {
    if (state === 'active') void checkAndApplyOtaUpdate()
  }
  const sub = AppState.addEventListener('change', handler)
  return () => sub.remove()
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
