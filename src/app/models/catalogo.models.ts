export interface CatalogoCIE10DTO {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaPadre?: string | null;
  nivel?: number | null;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCatalogoCIE10Payload {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaPadre?: string | null;
  nivel: number;
  activo?: boolean;
}

export interface UpdateCatalogoCIE10Payload {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  categoriaPadre?: string | null;
  nivel?: number;
  activo?: boolean;
}
