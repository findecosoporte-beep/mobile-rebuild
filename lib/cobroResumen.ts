import type { ReporteIntegracionFila } from '@/lib/types'

export interface CobroResumenFila {
  numeroCuota: number
  numeroCuotaAnterior: number | null
  abonoAnterior: number
  montoCuotaProgramado: number
  totalAbonoMasCuota: number
  aCobrarHoy: number
  tieneAbonoAnterior: boolean
}

function num(value: string | number | null | undefined): number {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

/** Abono de la cuota anterior + cuota programada actual (referencia en hoja de cobros). */
export function resumenCobroFila(fila: ReporteIntegracionFila): CobroResumenFila {
  const numeroCuota = fila.cuota_siguiente_numero ?? 1
  const montoCuotaProgramado = num(
    fila.cuota_siguiente_monto_programado
      ?? (num(fila.cuota_siguiente_capital) + num(fila.cuota_siguiente_interes))
      || fila.cuota,
  )
  const aCobrarHoy = num(fila.cuota_siguiente_monto ?? fila.cuota)
  const numeroCuotaAnterior =
    fila.cuota_anterior_numero != null ? fila.cuota_anterior_numero : numeroCuota > 1 ? numeroCuota - 1 : null

  const abonoAnterior =
    numeroCuota > 1
      ? num(fila.cuota_anterior_abonado)
      : num(fila.cuota_siguiente_abonado)

  const totalAbonoMasCuota = num(fila.total_abono_anterior_mas_cuota) || abonoAnterior + montoCuotaProgramado

  return {
    numeroCuota,
    numeroCuotaAnterior,
    abonoAnterior,
    montoCuotaProgramado,
    totalAbonoMasCuota,
    aCobrarHoy,
    tieneAbonoAnterior: abonoAnterior > 0.009,
  }
}
