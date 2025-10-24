export function parseSort(sort?: string): { column: string; ascending: boolean } | undefined {
  if (!sort) return;
  const [col, dir] = sort.split(':');
  return { column: col, ascending: (dir ?? 'asc').toLowerCase() !== 'desc' };
}
