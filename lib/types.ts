export interface Paginated<T> {
  count: number
  page?: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CarteraAsignada {
  id_cartera: number
  nombre: string
  dia_cobro: string
}

export interface MeProfile {
  username: string
  email: string
  vinculado: boolean
  rol: string | null
  nombre_operativo: string | null
  id_usuario?: number | null
  carteras?: CarteraAsignada[]
}

export interface Cartera {
  id_cartera: number
  nombre: string
  dia_cobro: string
}

export interface Cliente {
  id_cliente: number
  nombre: string
  dni: string
  telefono: string | null
  direccion_residencia?: string | null
  direccion_negocio?: string | null
  referencia?: string | null
  referencia_parentesco?: string | null
  referencia_telefono?: string | null
}

export interface ReporteIntegracionFila {
  id_prestamo: number
  id_cliente?: number
  numero_prestamo: string
  nombre_cliente: string
  saldo_actual: string
  cuota: string
  cuota_siguiente_numero?: number | null
  cuota_siguiente_monto?: string | null
  cuota_siguiente_capital?: string | null
  cuota_siguiente_interes?: string | null
  cuota_siguiente_monto_programado?: string | null
  cuota_siguiente_abonado?: string | null
  cuota_anterior_numero?: number | null
  cuota_anterior_abonado?: string | null
  total_abono_anterior_mas_cuota?: string | null
  cuotas_atrasadas?: number
  cuotas_atrasadas_numeros?: string
  estado: string
  cobrado_hoy?: boolean
  monto_cobrado_hoy?: string
  telefono?: string
  direccion_residencia?: string
  direccion_negocio?: string
  referencia?: string
  referencia_parentesco?: string
  referencia_telefono?: string
}

export interface ReporteIntegracionResponse {
  fecha_reporte: string
  generado_en?: string
  filas: ReporteIntegracionFila[]
  count?: number
}

export interface HistorialCobroRow {
  id_pago: number
  fecha_pago: string
  nombre_cliente: string
  numero_prestamo: string
  monto_total: string
  documento: string
}

export interface HistorialCobrosResponse {
  filas: HistorialCobroRow[]
  total_monto: string
  total_registros: number
}

export interface PagoCreateResponse {
  id_pago: number
  distribucion?: Array<{ cuota?: number; total: string }>
}
