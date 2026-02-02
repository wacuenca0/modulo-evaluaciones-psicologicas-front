import type { PersonalMilitarDTO } from './personal-militar.models';

export interface FichaPsicologicaHistorialDTO {
  id?: number;
  fechaEvaluacion?: string;
  estado?: string;
  condicion?: string;
  psicologo?: string;
  tipoEvaluacion?: string;
  numeroEvaluacion?: string;
  personalMilitarId?: number | null;
  personalMilitar?: PersonalMilitarDTO | null;
  seccionObservacion?: FichaObservacionClinicaDTO;
  seccionPsicoanamnesis?: FichaPsicoanamnesisDTO;
  seccionCondicionClinica?: FichaCondicionClinicaDTO;
  seccionPrenatal?: FichaPsicoanamnesisPrenatalDTO;
  seccionNatal?: FichaPsicoanamnesisNatalDTO;
  seccionInfancia?: FichaPsicoanamnesisInfanciaDTO;
  /** Diagnósticos CIE-10 asignados a la ficha (nuevo, array) */
  diagnosticosCie10?: DiagnosticoCie10DTO[];
  diagnosticoCie10Id?: number | null;
  diagnosticoCie10Codigo?: string | null;
  diagnosticoCie10Nombre?: string | null;
  diagnosticoCie10Descripcion?: string | null;
  diagnosticoCie10CategoriaPadre?: string | null;
  diagnosticoCie10Nivel?: number | null;
  planFrecuencia?: string | null;
  planTipoSesion?: string | null;
  planDetalle?: string | null;
  ultimaFechaSeguimiento?: string | null;
  proximoSeguimiento?: string | null;
  transferenciaFecha?: string | null;
  transferenciaUnidad?: string | null;
  transferenciaObservacion?: string | null;
  creadoPorId?: number | null;
  creadoPorNombre?: string | null;
  creadoPorUsername?: string | null;
  actualizadoPorId?: number | null;
  actualizadoPorNombre?: string | null;
  actualizadoPorUsername?: string | null;
  updatedAt?: string | null;
}

/** Diagnóstico CIE-10 para uso en arrays (multi-diagnóstico) */
export interface DiagnosticoCie10DTO {
  id?: number | null;
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  categoriaPadre?: string | null;
  nivel?: number | null;
}

export interface FichaPsicologicaCreacionInicialDTO {
  personalMilitarId: number;
  tipoEvaluacion: string;
  estado: string;
  fechaEvaluacion?: string;
}

export interface FichaObservacionClinicaDTO {
  observacionClinica?: string;
  motivoConsulta?: string;
  enfermedadActual?: string | null;
  historiaPasadaEnfermedad?: FichaHistoriaPasadaEnfermedadDTO | null;
}

export interface FichaObservacionClinicaPayload {
  observacionClinica: string;
  motivoConsulta: string;
  enfermedadActual?: string | null;
  historiaPasadaEnfermedad?: FichaHistoriaPasadaEnfermedadPayload;
}

export interface FichaHistoriaPasadaEnfermedadDTO {
  descripcion?: string | null;
  tomaMedicacion?: boolean | null;
  tipoMedicacion?: string | null;
  hospitalizacionRehabilitacion?: FichaHospitalizacionRehabilitacionDTO | null;
}

export interface FichaHistoriaPasadaEnfermedadPayload {
  descripcion?: string | null;
  tomaMedicacion?: boolean | null;
  tipoMedicacion?: string | null;
  hospitalizacionRehabilitacion?: FichaHospitalizacionRehabilitacionPayload;
}

export interface FichaHospitalizacionRehabilitacionDTO {
  requiere?: boolean | null;
  tipo?: string | null;
  duracion?: string | null;
}

export interface FichaHospitalizacionRehabilitacionPayload {
  requiere?: boolean | null;
  tipo?: string | null;
  duracion?: string | null;
}

export interface FichaPsicoanamnesisDTO {
  prenatal?: FichaPsicoanamnesisPrenatalDTO;
  natal?: FichaPsicoanamnesisNatalDTO;
  infancia?: FichaPsicoanamnesisInfanciaDTO;
}

export interface FichaPsicoanamnesisPrenatalDTO {
  condicionesBiologicasPadres?: string | null;
  condicionesPsicologicasPadres?: string | null;
  observacionPrenatal?: string | null;
}

export interface FichaPsicoanamnesisNatalDTO {
  partoNormal?: boolean | null;
  terminoParto?: string | null;
  complicacionesParto?: string | null;
  observacionNatal?: string | null;
}

export interface FichaPsicoanamnesisInfanciaDTO {
  gradoSociabilidad?: string | null;
  relacionPadresHermanos?: string | null;
  discapacidadIntelectual?: boolean | null;
  gradoDiscapacidad?: string | null;
  trastornos?: string | null;
  tratamientosPsicologicosPsiquiatricos?: boolean | null;
  observacionInfancia?: string | null;
}

export interface FichaPsicoanamnesisPayload {
  prenatal?: FichaPsicoanamnesisPrenatalPayload;
  natal?: FichaPsicoanamnesisNatalPayload;
  infancia?: FichaPsicoanamnesisInfanciaPayload;
}

export interface FichaPsicoanamnesisPrenatalPayload {
  condicionesBiologicasPadres?: string | null;
  condicionesPsicologicasPadres?: string | null;
  observacionPrenatal?: string | null;
}

export interface FichaPsicoanamnesisNatalPayload {
  partoNormal?: boolean | null;
  terminoParto?: string | null;
  complicacionesParto?: string | null;
  observacionNatal?: string | null;
}

export interface FichaPsicoanamnesisInfanciaPayload {
  gradoSociabilidad?: string | null;
  relacionPadresHermanos?: string | null;
  discapacidadIntelectual?: boolean | null;
  gradoDiscapacidad?: string | null;
  trastornos?: string | null;
  tratamientosPsicologicosPsiquiatricos?: boolean | null;
  observacionInfancia?: string | null;
}

export interface FichaCondicionClinicaDTO {
  condicion?: string | null;
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
  ultimaFechaSeguimiento?: string | null;
  transferenciaFecha?: string | null;
  transferenciaUnidad?: string | null;
  transferenciaObservacion?: string | null;
}

export interface FichaCondicionClinicaPayload {
  condicion: FichaCondicionFinal | string;
  diagnosticoCie10Id?: number | null;
  diagnosticoCie10Codigo?: string | null;
  diagnosticoCie10Nombre?: string | null;
  diagnosticoCie10Descripcion?: string | null;
  diagnosticoCie10CategoriaPadre?: string | null;
  diagnosticoCie10Nivel?: number | null;
  planFrecuencia?: FichaPlanFrecuencia | null;
  planTipoSesion?: FichaPlanTipoSesion | null;
  planDetalle?: string | null;
  proximoSeguimiento?: string | null;
  transferenciaUnidad?: string | null;
  transferenciaObservacion?: string | null;
}

export const FICHA_TIPOS_EVALUACION_CANONICOS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Valoracion porte armas', label: 'Valoración porte armas' },
  { value: 'Evaluacion anual', label: 'Evaluación anual' },
  { value: 'Ingreso', label: 'Ingreso' },
  { value: 'Reintegro', label: 'Reintegro' },
  { value: 'Evaluacion especial', label: 'Evaluación especial' },
  { value: 'Otro', label: 'Otros' }
];

export const FICHA_CONDICIONES_CANONICAS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'APTO', label: 'Apto' },
  { value: 'NO_APTO', label: 'No apto' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
  { value: 'DERIVACION', label: 'Derivacion' }
];

export const FICHA_ESTADOS_CANONICOS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ABIERTA', label: 'Abierta' },
  { value: 'CERRADA', label: 'Cerrada' },
  { value: 'EN_PROCESO', label: 'En proceso' }
];

export const PSICOANAMNESIS_GRADOS_SOCIABILIDAD: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Introvertido', label: 'Introvertido' },
  { value: 'Introvertido', label: 'Introvertida' },
  { value: 'Reservado', label: 'Reservado' },
  { value: 'Reservado', label: 'Reservada' },
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Comunicativo', label: 'Comunicativo' },
  { value: 'Comunicativo', label: 'Comunicativa' },
  { value: 'Extrovertido', label: 'Extrovertido' },
  { value: 'Extrovertido', label: 'Extrovertida' },
  { value: 'Otro', label: 'Otro' }
];

export const PSICOANAMNESIS_RELACION_FAMILIAR: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Asertiva', label: 'Asertiva' },
  { value: 'Asertiva', label: 'Asertivo' },
  { value: 'Conflictiva', label: 'Conflictiva' },
  { value: 'Distante', label: 'Distante' },
  { value: 'Sobreprotectora', label: 'Sobreprotectora' },
  { value: 'Sobreprotectora', label: 'Sobreprotector' },
  { value: 'Inexistente', label: 'Inexistente' },
  { value: 'Otro', label: 'Otro' }
];

export const PSICOANAMNESIS_GRADOS_DISCAPACIDAD: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'Ninguna', label: 'Sin discapacidad' },
  { value: 'Leve', label: 'Leve' },
  { value: 'Moderado', label: 'Moderado' },
  { value: 'Moderado', label: 'Moderada' },
  { value: 'Grave', label: 'Grave' },
  { value: 'Grave', label: 'Graves' },
  { value: 'Profundo', label: 'Profundo' },
  { value: 'Profundo', label: 'Profunda' }
];

export type FichaCondicionFinal = 'ALTA' | 'SEGUIMIENTO' | 'TRANSFERENCIA';

export const FICHA_CONDICION_CLINICA_OPCIONES: ReadonlyArray<{ value: FichaCondicionFinal; label: string; description: string }> = [
  {
    value: 'ALTA',
    label: 'No presenta psicopatologia (Alta)',
    description: 'Cierra la evaluacion sin requerir diagnostico adicional.'
  },
  {
    value: 'SEGUIMIENTO',
    label: 'Seguimiento',
    description: 'Continua bajo observacion con diagnostico CIE-10 registrado.'
  },
  {
    value: 'TRANSFERENCIA',
    label: 'Transferencia',
    description: 'Deriva el caso a otra unidad registrando el diagnostico CIE-10.'
  }
];

export interface FichaCondicionFinalPayload {
  condicion: FichaCondicionFinal;
  diagnosticoCie10Id?: number | null;
  diagnosticoCie10Codigo?: string | null;
  diagnosticoCie10Nombre?: string | null;
  diagnosticoCie10Descripcion?: string | null;
  diagnosticoCie10CategoriaPadre?: string | null;
  diagnosticoCie10Nivel?: number | null;
  planFrecuencia?: FichaPlanFrecuencia | null;
  planTipoSesion?: FichaPlanTipoSesion | null;
  planDetalle?: string | null;
  proximoSeguimiento?: string | null;
  transferenciaUnidad?: string | null;
  transferenciaObservacion?: string | null;
}

export type FichaPlanFrecuencia = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'PERSONALIZADA';

export type FichaPlanTipoSesion = 'INDIVIDUAL' | 'GRUPAL' | 'FAMILIAR' | 'PAREJA' | 'REMOTA' | 'MIXTA';

export const FICHA_PLAN_FRECUENCIAS: ReadonlyArray<{ value: FichaPlanFrecuencia; label: string }> = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'QUINCENAL', label: 'Quincenal' },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'PERSONALIZADA', label: 'Personalizada' }
];

export const FICHA_PLAN_TIPOS_SESION: ReadonlyArray<{ value: FichaPlanTipoSesion; label: string }> = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'GRUPAL', label: 'Grupal' },
  { value: 'FAMILIAR', label: 'Familiar' },
  { value: 'PAREJA', label: 'Pareja' },
  { value: 'REMOTA', label: 'Remota' },
  { value: 'MIXTA', label: 'Mixta' }
];

export const FICHA_CONDICION_FINAL_OPCIONES: ReadonlyArray<{ value: FichaCondicionFinal; label: string; description: string }> = FICHA_CONDICION_CLINICA_OPCIONES;
