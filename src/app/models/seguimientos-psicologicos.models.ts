







// Archivo eliminado. Definiciones duplicadas removidas.
import type { FichaCondicionFinal, FichaPlanFrecuencia, FichaPlanTipoSesion } from './fichas-psicologicas.models';

export type SeguimientoModalMode = 'primer' | 'periodico';

export interface SeguimientoDiagnosticoSnapshot {
  id?: number | null;
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  categoriaPadre?: string | null;
  nivel?: number | null;
}

export interface SeguimientoPlanSnapshot {
  frecuencia?: FichaPlanFrecuencia | null;
  tipoSesion?: FichaPlanTipoSesion | null;
  detalle?: string | null;
  proximoSeguimiento?: string | null;
}

export interface SeguimientoPsicologicoPayload {
  fichaPsicologicaId: number;
  condicion: FichaCondicionFinal;
  observaciones: string;
  diagnosticoCie10Id?: number | null;
  planFrecuencia?: FichaPlanFrecuencia | null;
  planTipoSesion?: FichaPlanTipoSesion | null;
  planDetalle?: string | null;
  proximoSeguimiento?: string | null;
  transferenciaUnidad?: string | null;
  transferenciaObservacion?: string | null;
}

export interface SeguimientoPsicologicoDTO {
  id?: number;
  fichaPsicologicaId?: number | null;
  condicion?: string | null;
  fechaSeguimiento?: string | null;
  observaciones?: string | null;
  diagnosticoCie10Id?: number | null;
  diagnosticoCie10Codigo?: string | null;
  diagnosticoCie10Nombre?: string | null;
  diagnosticoCie10Descripcion?: string | null;
  diagnosticoCie10CategoriaPadre?: string | null;
  diagnosticoCie10Nivel?: number | null;
  planFrecuencia?: string | null;
  planTipoSesion?: string | null;
  planDetalle?: string | null;
  proximoSeguimiento?: string | null;
  transferenciaUnidad?: string | null;
  transferenciaObservacion?: string | null;
  creadoPorNombre?: string | null;
  creadoPorUsername?: string | null;
  fechaRegistro?: string | null;
  updatedAt?: string | null;
}

export interface SeguimientoPsicologicoListParams {
  fichaPsicologicaId: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SeguimientoPsicologicoListResponse {
  items: SeguimientoPsicologicoDTO[];
  total: number;
}

export interface SeguimientoModalResult {
  condicion: FichaCondicionFinal;
  observaciones: string;
  diagnostico?: SeguimientoDiagnosticoSnapshot | null;
  planFrecuencia?: FichaPlanFrecuencia | null;
  planTipoSesion?: FichaPlanTipoSesion | null;
  planDetalle?: string | null;
  proximoSeguimiento?: string | null;
  transferenciaUnidad?: string | null;
  transferenciaObservacion?: string | null;
}
