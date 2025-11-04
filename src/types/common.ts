export type Role = 'ADMIN' | 'EMPLOYEE' | 'CLIENT';

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: Role;
  clientId?: string | null; // Only set for CLIENT users; NULL for ADMIN/EMPLOYEE
}

export interface Pagination {
  limit: number;
  offset: number;
}

export const canEditStatus = (role: Role) => role === 'ADMIN' || role === 'EMPLOYEE';

// Authorization helpers
export const isInternalUser = (role: Role): boolean => role === 'ADMIN' || role === 'EMPLOYEE';
export const isClientUser = (role: Role): boolean => role === 'CLIENT';
