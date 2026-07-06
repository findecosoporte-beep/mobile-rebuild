import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'

/** Ejecuta callback al entrar a la pantalla y cada `intervalMs` mientras siga visible. */
export function useScreenPolling(callback: () => void | Promise<void>, intervalMs = 30000) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useFocusEffect(
    useCallback(() => {
      void callbackRef.current()
      const id = setInterval(() => {
        void callbackRef.current()
      }, intervalMs)
      return () => clearInterval(id)
    }, [intervalMs]),
  )
}
