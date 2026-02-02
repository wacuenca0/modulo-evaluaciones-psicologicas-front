
export interface PersonalMilitarDTO {
  id?: number;
  cedula?: string;
  apellidosNombres?: string;
  apellidos?: string;
  nombres?: string;
  sexo?: string;
  tipoPersona?: string;
  esMilitar?: boolean;
  fechaNacimiento?: string;
  edad?: number;
  etnia?: string;
  estadoCivil?: string;
  numeroHijos?: number;
  nroHijos?: number;
  ocupacion?: string;
  servicioActivo?: boolean;
  servicioPasivo?: boolean;
  situacion?: string;
  seguro?: string;
  grado?: string;
  unidadMilitar?: string;
  unidad?: string;
  especialidad?: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  barrioSector?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalMilitarPayload {
  cedula: string;
  apellidosNombres: string;
  sexo: string;
  tipoPersona: string;
  esMilitar: boolean;
  fechaNacimiento: string | null;
  edad: number | null;
  etnia?: string | null;
  estadoCivil?: string | null;
  nroHijos: number;
  ocupacion?: string | null;
  servicioActivo: boolean;
  servicioPasivo: boolean;
  seguro?: string | null;
  grado?: string | null;
  unidadMilitar?: string | null;
  especialidad?: string | null;
  provincia?: string | null;
  canton?: string | null;
  parroquia?: string | null;
  barrioSector?: string | null;
  telefono?: string | null;
  celular?: string | null;
  email?: string | null;
  activo: boolean;
}

export type Sexo = 'Masculino' | 'Femenino';
