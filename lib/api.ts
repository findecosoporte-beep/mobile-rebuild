import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'findeco_access'
const REFRESH_KEY = 'findeco_refresh'

const extraApiUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined

const baseURL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  extraApiUrl ||
  'https://web-production-93580.up.railway.app/api/v1'
).replace(/\/$/, '')

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

function isAuthUrl(url?: string): boolean {
  if (!url) return false
  return url.includes('/token/') || url.includes('/token/refresh')
}

export async function getStoredTokens() {
  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ])
  return { access, refresh }
}

export async function setStoredTokens(access: string, refresh: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, access),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ])
}

export async function clearStoredTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ])
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isAuthUrl(config.url)) return config
  const { access } = await getStoredTokens()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = await getStoredTokens()
  if (!refresh) return null
  const { data } = await axios.post<{ access: string }>(`${baseURL}/token/refresh/`, {
    refresh,
  })
  await SecureStore.setItemAsync(ACCESS_KEY, data.access)
  return data.access
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthUrl(original.url)
    ) {
      return Promise.reject(error)
    }
    original._retry = true
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null
    })
    const access = await refreshPromise
    if (!access) {
      await clearStoredTokens()
      return Promise.reject(error)
    }
    original.headers.Authorization = `Bearer ${access}`
    return api(original)
  },
)

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string } | undefined
    return data?.detail || data?.message || error.message || fallback
  }
  return fallback
}
