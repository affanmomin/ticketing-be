export function parseLimitOffset(q: any) {
  let l = Number(q?.limit ?? 50);
  if (!Number.isFinite(l) || l < 1) l = 50;
  if (l > 200) l = 200;
  let o = Number(q?.offset ?? 0);
  if (!Number.isFinite(o) || o < 0) o = 0;
  return { limit: l, offset: o };
}
