import { PoolClient } from 'pg';

export interface PriorityResult {
  id: string;
  name: string;
  rank: number;
  colorHex: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusResult {
  id: string;
  name: string;
  isClosed: boolean;
  sequence: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function listPriorities(tx: PoolClient): Promise<PriorityResult[]> {
  const { rows } = await tx.query(
    `SELECT id, name, rank, color_hex, active, created_at, updated_at
     FROM priority
     WHERE active = true
     ORDER BY rank ASC`
  );

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    rank: r.rank,
    colorHex: r.color_hex,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function listStatuses(tx: PoolClient): Promise<StatusResult[]> {
  const { rows } = await tx.query(
    `SELECT id, name, is_closed, sequence, active, created_at, updated_at
     FROM status
     WHERE active = true
     ORDER BY sequence ASC`
  );

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    isClosed: r.is_closed,
    sequence: r.sequence,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
