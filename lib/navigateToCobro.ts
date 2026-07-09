import type { ReporteIntegracionFila } from '@/lib/types'

type AppRouter = {
  push: (href: {
    pathname: '/pago/[id]'
    params: Record<string, string>
  }) => void
}

/** Abre la pantalla de registrar cobro para una fila del reporte de integración. */
export function navigateToCobro(router: AppRouter, item: ReporteIntegracionFila) {
  router.push({
    pathname: '/pago/[id]',
    params: {
      id: String(item.id_prestamo),
      numero: item.numero_prestamo,
      cliente: item.nombre_cliente,
      cuota: item.cuota_siguiente_monto ?? item.cuota,
      cuotaNumero: String(item.cuota_siguiente_numero ?? 1),
      saldo: item.saldo_actual,
      telefono: item.telefono ?? '',
      direccionResidencia: item.direccion_residencia ?? '',
      direccionNegocio: item.direccion_negocio ?? '',
      referencia: item.referencia ?? '',
      referenciaParentesco: item.referencia_parentesco ?? '',
      referenciaTelefono: item.referencia_telefono ?? '',
    },
  })
}
