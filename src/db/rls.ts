import { PoolClient } from 'pg';
import { FastifyRequest } from 'fastify';

export async function withRlsTx<T>(
  req: FastifyRequest,
  fn: (tx: PoolClient) => Promise<T>
): Promise<T> {
  if (!req.user) throw new Error('Auth context required');
  const tx = req.db?.tx;
  if (!tx) throw new Error('Transaction context required');
  return fn(tx);
}

// SQL Query Builder helpers
export function inArray(ids: string[], cast: 'uuid' | 'text' = 'uuid'): { text: string; values: string[] } {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  return {
    text: `(${placeholders})${cast === 'uuid' ? '::uuid[]' : ''}`,
    values: ids,
  };
}

export interface PaginateSortInput {
  limit: number;
  offset: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  whitelist: string[];
}

export function paginateSortClause(input: PaginateSortInput): string {
  let clause = '';
  if (input.sortBy && input.whitelist.includes(input.sortBy)) {
    const dir = input.sortDir === 'DESC' ? 'DESC' : 'ASC';
    clause += ` ORDER BY ${input.sortBy} ${dir}`;
  }
  clause += ` LIMIT ${input.limit} OFFSET ${input.offset}`;
  return clause;
}

// Scope builders for auth context
export function orgScope(orgId: string): { where: string; params: [string] } {
  return {
    where: 'organization_id = $1',
    params: [orgId],
  };
}

export function clientScope(clientId: string): { where: string; params: [string] } {
  return {
    where: 'client_id = $1',
    params: [clientId],
  };
}
