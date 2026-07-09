import { api } from '@/lib/api'
import type { Cliente, Paginated } from '@/lib/types'

function pareceDni(query: string): boolean {
  const limpio = query.replace(/\s+/g, '')
  return /^[\d-]{5,}$/.test(limpio)
}

function pareceTelefono(query: string): boolean {
  const digitos = query.replace(/\D/g, '')
  return digitos.length >= 8
}

/** Busca clientes por DNI exacto, teléfono o texto libre (nombre). */
export async function buscarClientes(query: string): Promise<Cliente[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const dniNorm = q.replace(/\s+/g, '')

  if (pareceDni(dniNorm)) {
    const { data } = await api.get<Paginated<Cliente>>(
      `/clientes/?dni=${encodeURIComponent(dniNorm)}&page_size=10`,
    )
    if (data.results?.length) return data.results
  }

  const params = new URLSearchParams({ search: q, page_size: '30' })
  const { data } = await api.get<Paginated<Cliente>>(`/clientes/?${params.toString()}`)
  let resultados = data.results ?? []

  if (pareceTelefono(q)) {
    const norm = q.replace(/\s+/g, '')
    const exacto = resultados.find((c) => (c.telefono ?? '').replace(/\s+/g, '') === norm)
    if (exacto) return [exacto]
  }

  if (pareceDni(dniNorm) && resultados.length > 1) {
    const exacto = resultados.find((c) => c.dni.replace(/\s+/g, '') === dniNorm)
    if (exacto) return [exacto]
  }

  return resultados
}
