export type PasswordChangeStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface PasswordChangeRequestDTO {
  id: number;
  username: string;
  contactEmail?: string | null;
  motivo?: string | null;
  status: PasswordChangeStatus;
  requestedAt: string;
  processedAt?: string | null;
  processedBy?: string | null;
  adminNotes?: string | null;
  unlockAccount?: boolean | null;
}

export interface CreatePasswordChangeRequestDTO {
  username: string;
  contactEmail?: string;
  motivo?: string;
}

export interface CompletePasswordChangeRequestDTO {
  newPassword: string;
  adminNotes?: string;
  unlockAccount?: boolean;
}

export interface RejectPasswordChangeRequestDTO {
  adminNotes?: string;
}
