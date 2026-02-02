import type { FichaCondicionFinal } from './fichas-psicologicas.models';

export interface FichaDocumentoDTO {
  id?: number | null;
  fichaPsicologicaId?: number | null;
  nombre?: string | null;
  descripcion?: string | null;
  extension?: string | null;
  tamanioBytes?: number | null;
  urlDescarga?: string | null;
  creadoPorNombre?: string | null;
  creadoPorUsername?: string | null;
  creadoEn?: string | null;
  condicionAlMomento?: FichaCondicionFinal | null;
}

export interface FichaDocumentoUploadPayload {
  archivo: File;
  descripcion?: string | null;
}

export interface FichaDocumentoDeleteResponse {
  eliminado: boolean;
}
