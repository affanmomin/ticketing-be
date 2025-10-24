export type Role = 'ADMIN' | 'EMPLOYEE' | 'CLIENT';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: Role;
  clientId?: string | null;
}

export interface Pagination {
  limit: number;
  offset: number;
}

export const canEditStatus = (role: Role) => role === 'ADMIN' || role === 'EMPLOYEE';
