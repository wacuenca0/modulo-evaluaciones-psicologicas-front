export interface PsicologoDTO {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  apellidosNombres: string;
  username: string;
  email?: string | null;
  telefono?: string | null;
  celular?: string | null;
  grado?: string | null;
  especialidad?: string | null;
  unidadMilitar?: string | null;
  activo: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreatePsicologoPayload {
  cedula: string;
  nombres: string;
  apellidos: string;
  username: string;
  email?: string | null;
  telefono?: string | null;
  celular?: string | null;
  grado?: string | null;
  especialidad?: string | null;
  unidadMilitar?: string | null;
  activo?: boolean;
}

export interface UpdatePsicologoPayload extends Partial<CreatePsicologoPayload> {
  activo?: boolean;
}
