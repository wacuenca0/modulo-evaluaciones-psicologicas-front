// Authentication and Authorization DTO models adapted to spec v1.0 (2025-11-24)

export interface LoginRequestDTO {
  username: string;
  password: string;
}

// id es opcional globalmente para compatibilidad, pero UserListComponent requiere id siempre definido
export interface UserDTO {
  /**
   * Identificador único del usuario. Opcional para compatibilidad global,
   * pero requerido en UserListComponent y vistas de administración.
   */
  id?: number;
  username: string;
  email?: string | null;
  fullName?: string | null;
  roleId?: number;
  roleName?: string | null;
  active?: boolean;
  roles?: string[];
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface LoginResponseDTO {
  accessToken: string;
  tokenType: string; // "Bearer"
  expiresIn: number; // seconds
  user: UserDTO;
  refreshToken?: string;
}

export interface CreateUserPsicologoDTO {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  celular?: string | null;
  grado?: string | null;
  unidadMilitar?: string | null;
  especialidad?: string | null;
}

export interface CreateUserRequestDTO {
  username: string;
  email: string;
  password: string;
  roleId: number;
  active?: boolean;
  psicologo?: CreateUserPsicologoDTO;
}

export interface UpdateUserRequestDTO {
  username: string;
  email?: string;
  roleId?: number;
  active?: boolean;
  password?: string;
}

export interface ChangePasswordRequestDTO {
  username: string;
  password: string;
}

export interface RoleDTO {
  id: number;
  name: string;
}

export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface ErrorResponseDTO {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
}
