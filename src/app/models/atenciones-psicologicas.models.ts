
// DTO para crear una atención
export interface AtencionPsicologicaRequestDTO {
  personalMilitarId: number | null;
  psicologoId: number | null;
  fechaAtencion: string;
  horaInicio: string;
  horaFin: string;
  tipoAtencion: string;
  tipoConsulta: string;
  motivoConsulta: string;
  anamnesis: string;
  examenMental: string;
  impresionDiagnostica: string;
  planIntervencion: string;
  recomendaciones: string;
  derivacion: string;
  diagnosticoIds: number[];
  proximaCita: string | null;
  observacionesProximaCita: string;
  estado: string;
  razonCancelacion: string;
  fichaPsicologicaId?: number | null;
}

// DTO para respuesta de atención
export interface AtencionPsicologicaResponseDTO {
  id: number;
  personalMilitarId: number;
  pacienteCedula: string;
  pacienteNombreCompleto: string;
  pacienteGrado: string;
  pacienteUnidadMilitar: string;
  psicologoId: number;
  psicologoCedula: string;
  psicologoNombreCompleto: string;
  fechaAtencion: string;
  horaInicio: string;
  horaFin: string;
  numeroSesion: number;
  tipoAtencion: string;
  tipoConsulta: string;
  motivoConsulta: string;
  anamnesis: string;
  examenMental: string;
  impresionDiagnostica: string;
  planIntervencion: string;
  recomendaciones: string;
  derivacion: string;
  diagnosticos: DiagnosticoCie10DTO[];
  proximaCita: string | null;
  observacionesProximaCita: string;
  estado: string;
  razonCancelacion: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  duracionMinutos: number;
  fichaPsicologicaId?: number | null;
}

// DTO para diagnóstico CIE-10
export interface DiagnosticoCie10DTO {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

// DTO para consultar atenciones con filtros
export interface ConsultaAtencionesDTO {
  psicologoId?: number;
  pacienteId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  tipoConsulta?: string;
  tipoAtencion?: string;
}

// Estados posibles de una atención
export enum EstadoAtencion {
  PROGRAMADA = 'PROGRAMADA',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
  NO_ASISTIO = 'NO_ASISTIO'
}

// Tipos de consulta posibles
export enum TipoConsulta {
  PRIMERA_VEZ = 'PRIMERA_VEZ',
  SEGUIMIENTO = 'SEGUIMIENTO',
  URGENCIA = 'URGENCIA',
  CONTROL = 'CONTROL'
}

// Modalidades de atención
export enum TipoAtencion {
  PRESENCIAL = 'PRESENCIAL',
  TELEFONICA = 'TELEFONICA',
  VIRTUAL = 'VIRTUAL'
}
