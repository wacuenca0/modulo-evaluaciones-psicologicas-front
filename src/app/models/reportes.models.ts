// src/app/models/reportes.models.ts
export interface ReporteAtencionPsicologoDTO {
    psicologoId: number;
    psicologoNombre: string;
    psicologoUsername: string;
    psicologoUnidadMilitar: string;
    totalFichasAtendidas: number;
    fichasActivas: number;
    fichasObservacion: number;
    totalSeguimientos: number;
    personasAtendidas: number;
    ultimaAtencion: string;
    // Campos de filtro
    filtroDiagnosticoId?: number;
    filtroDiagnosticoCodigo?: string;
    filtroDiagnosticoTexto?: string;
    filtroCedula?: string;
    filtroUnidadMilitar?: string;
    filtroFechaDesde?: string;
    filtroFechaHasta?: string;
}

export interface ReporteAtencionesTotales {
    fichas: number;
    activas: number;
    observacion: number;
    seguimientos: number;
    personas: number;
}

// ========== INTERFACES PARA ATENCIONES ========== 
export interface ReporteAtencionesFilters {
    psicologoId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    diagnosticoId?: number;
    cedula?: string;
    unidadMilitar?: string;
}

export interface ReporteAtencionesAppliedFilters {
    psicologoId: number | null;
    fechaDesde: string | null;
    fechaHasta: string | null;
    diagnosticoId: number | null;
    cedula: string | null;
    unidadMilitar: string | null;
}

export interface ReporteAtencionesResponse {
    resultados: ReporteAtencionPsicologoDTO[];
    totales: ReporteAtencionesTotales;
    filtros: ReporteAtencionesAppliedFilters;
}

// ========== INTERFACES PARA SEGUIMIENTO ========== 
export interface ReporteSeguimientoTransferenciaDTO {
    personalMilitarId: number;
    personalMilitarNombre: string;
    personalMilitarCedula: string;
    fichaId: number;
    numeroEvaluacion: string;
    condicionClinica: string;
    psicologoId: number;
    psicologoNombre: string;
    psicologoUnidadMilitar: string;
    totalSeguimientos: number;
    ultimoSeguimiento: string;
    fechaEvaluacion: string;
    unidadDestino?: string;
    observacionTransferencia?: string;
    fechaTransferencia?: string;
    proximoSeguimiento?: string;
    
    filtroCedula?: string;
    filtroUnidadMilitar?: string;
    filtroFechaDesde?: string;
    filtroFechaHasta?: string;
    condicionClinicaCanonical?: string;
}

export interface ReporteSeguimientoFilters {
    psicologoId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    cedula?: string;
    unidadMilitar?: string;
}

export interface ReporteSeguimientoAppliedFilters {
    psicologoId: number | null;
    fechaDesde: string | null;
    fechaHasta: string | null;
    cedula: string | null;
    unidadMilitar: string | null;
}

export interface ReporteSeguimientoResponse {
    resultados: ReporteSeguimientoTransferenciaDTO[];
    filtros: ReporteSeguimientoAppliedFilters;
}

// ========== INTERFACES PARA PERSONAL DIAGNÓSTICO ========== 
export interface ReportePersonalDiagnosticoDTO {
    personalId: number;
    personalCedula: string;
    personalNombre: string;
    personalTipoPersona: string;
    personalEsMilitar: boolean;
    personalGrado?: string;
    personalUnidadMilitar?: string;
    
    fichaId: number;
    numeroEvaluacion: string;
    fechaEvaluacion: string;
    
    diagnosticoCodigo?: string;
    diagnosticoNombre?: string;
    diagnosticoCategoriaPadre?: string;
    diagnosticoNivel?: number;
    diagnosticoDescripcion?: string;
    
    psicologoId?: number;
    psicologoNombre?: string;
    psicologoUnidadMilitar?: string;
    
    estadoFicha?: string;
    personalNombreCompleto?: string;
    
    filtroFechaDesde?: string;
    filtroFechaHasta?: string;
    filtroDiagnosticoId?: number;
    filtroDiagnosticoCodigo?: string;
    filtroDiagnosticoTexto?: string;
    filtroCedula?: string;
    filtroGrado?: string;
    filtroUnidadMilitar?: string;
}

export interface ReportePersonalDiagnosticosFilters {
    fechaDesde?: string;
    fechaHasta?: string;
    diagnosticoId?: number;
    cedula?: string;
    grado?: string;
    unidadMilitar?: string;
}

export interface ReportePersonalDiagnosticosAppliedFilters {
    fechaDesde: string | null;
    fechaHasta: string | null;
    diagnosticoId: number | null;
    cedula: string | null;
    grado: string | null;
    unidadMilitar: string | null;
}

export interface ReportePersonalDiagnosticosResponse {
    resultados: ReportePersonalDiagnosticoDTO[];
    filtros: ReportePersonalDiagnosticosAppliedFilters;
}

// ========== INTERFACES PARA HISTORIAL DE FICHAS ========== 
export interface ReporteHistorialSeguimientoDTO {
    seguimientoId: number;
    fecha: string;
    descripcion: string;
    registradoPor?: string;
    psicologoNombre?: string;
}

export interface ReporteHistorialFichaDTO {
    origen: 'ACTUAL' | 'HISTORICO';
    personalMilitarId: number;
    personalMilitarCedula: string;
    personalMilitarNombre: string;
    
    fichaId?: number;
    fichaHistoricaId?: number;
    numeroFicha: string;
    fechaEvaluacion: string;
    estadoFicha?: string;
    condicionClinica?: string;
    
    diagnosticoCodigo?: string;
    diagnosticoNombre?: string;
    diagnosticoCategoriaPadre?: string;
    diagnosticoNivel?: number;
    diagnosticoDescripcion?: string;
    
    psicologoId?: number;
    psicologoNombre?: string;
    psicologoUnidadMilitar?: string;
    
    seguimientosCantidad: number;
    tieneSeguimientos: boolean;
    seguimientos?: ReporteHistorialSeguimientoDTO[];
    
    filtroPersonalMilitarId?: number;
    filtroCedula?: string;
    filtroIncluirSeguimientos?: boolean;
    
    numeroEvaluacion?: string;
    totalSeguimientos?: number;
}

export interface ReporteHistorialFichasFilters {
    personalMilitarId?: number;
    cedula?: string;
    incluirSeguimientos?: boolean;
}

export interface ReporteHistorialFichasAppliedFilters {
    personalMilitarId: number | null;
    cedula: string | null;
    incluirSeguimientos: boolean;
}

export interface ReporteHistorialFichasResponse {
    resultados: ReporteHistorialFichaDTO[];
    filtros: ReporteHistorialFichasAppliedFilters;
}

// ========== INTERFACES GENÉRICAS ========== 
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface FiltroOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

export interface FiltroResumenItem {
    etiqueta: string;
    valor: string;
    icon?: string;
    tipo?: 'text' | 'date' | 'number' | 'select';
}

export interface ReportePersonalDiagnosticoDTO {
    // Datos del personal
    personalId: number;
    personalCedula: string;
    personalNombre: string;
    personalTipoPersona: string;
    personalEsMilitar: boolean;
    personalGrado?: string;
    personalUnidadMilitar?: string;
    
    // Datos de la ficha
    fichaId: number;
    numeroEvaluacion: string;
    fechaEvaluacion: string;
    
    // Datos del diagnóstico
    diagnosticoCodigo?: string;
    diagnosticoNombre?: string;
    diagnosticoCategoriaPadre?: string;
    diagnosticoNivel?: number;
    diagnosticoDescripcion?: string;
    
    // Datos del psicólogo
    psicologoId?: number;
    psicologoNombre?: string;
    psicologoUnidadMilitar?: string;
    
    // Campos adicionales para UI
    estadoFicha?: string;
    personalNombreCompleto?: string;
    
    // Filtros aplicados
    filtroFechaDesde?: string;
    filtroFechaHasta?: string;
    filtroDiagnosticoId?: number;
    filtroDiagnosticoCodigo?: string;
    filtroDiagnosticoTexto?: string;
    filtroCedula?: string;
    filtroGrado?: string;
    filtroUnidadMilitar?: string;
}

export interface ReportePersonalDiagnosticosFilters {
    fechaDesde?: string;
    fechaHasta?: string;
    diagnosticoId?: number;
    cedula?: string;
    grado?: string;
    unidadMilitar?: string;
}

export interface ReportePersonalDiagnosticosAppliedFilters {
    fechaDesde: string | null;
    fechaHasta: string | null;
    diagnosticoId: number | null;
    cedula: string | null;
    grado: string | null;
    unidadMilitar: string | null;
}

export interface ReportePersonalDiagnosticosResponse {
    resultados: ReportePersonalDiagnosticoDTO[];
    filtros: ReportePersonalDiagnosticosAppliedFilters;
}

// ========== INTERFACES PARA HISTORIAL DE FICHAS ==========

export interface ReporteHistorialSeguimientoDTO {
    seguimientoId: number;
    fecha: string;
    descripcion: string;
    registradoPor?: string;
    psicologoNombre?: string;
}

export interface ReporteHistorialFichaDTO {
    // Identificación
    origen: 'ACTUAL' | 'HISTORICO';
    personalMilitarId: number;
    personalMilitarCedula: string;
    personalMilitarNombre: string;
    
    // Datos de la ficha
    fichaId?: number;
    fichaHistoricaId?: number;
    numeroFicha: string;
    fechaEvaluacion: string;
    estadoFicha?: string;
    condicionClinica?: string;
    
    // Datos del diagnóstico
    diagnosticoCodigo?: string;
    diagnosticoNombre?: string;
    diagnosticoCategoriaPadre?: string;
    diagnosticoNivel?: number;
    diagnosticoDescripcion?: string;
    
    // Datos del psicólogo
    psicologoId?: number;
    psicologoNombre?: string;
    psicologoUnidadMilitar?: string;
    
    // Seguimientos
    seguimientosCantidad: number;
    tieneSeguimientos: boolean;
    seguimientos?: ReporteHistorialSeguimientoDTO[];
    
    // Filtros aplicados
    filtroPersonalMilitarId?: number;
    filtroCedula?: string;
    filtroIncluirSeguimientos?: boolean;
    
    // Campos para compatibilidad
    numeroEvaluacion?: string;
    totalSeguimientos?: number;
}

export interface ReporteHistorialFichasFilters {
    personalMilitarId?: number;
    cedula?: string;
    incluirSeguimientos?: boolean;
}

export interface ReporteHistorialFichasAppliedFilters {
    personalMilitarId: number | null;
    cedula: string | null;
    incluirSeguimientos: boolean;
}

export interface ReporteHistorialFichasResponse {
    resultados: ReporteHistorialFichaDTO[];
    filtros: ReporteHistorialFichasAppliedFilters;
}

// ========== INTERFACES PARA LOS SERVICIOS ==========

// Interface genérica para respuestas paginadas
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Interface para opciones de filtro
export interface FiltroOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

// Interface para resumen de filtros aplicados (para UI)
export interface FiltroResumenItem {
    etiqueta: string;
    valor: string;
    icon?: string;
    tipo?: 'text' | 'date' | 'number' | 'select';
}