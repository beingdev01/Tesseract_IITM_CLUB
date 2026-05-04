export type ApiMeta = Record<string, unknown> | null;

export type EnvelopeResult<T> = {
  __envelope: true;
  data: T;
  meta: ApiMeta;
};

export function withMeta<T>(data: T, meta: ApiMeta): EnvelopeResult<T> {
  return { __envelope: true, data, meta };
}

export function paginationMeta(page: number, pageSize: number, total: number): Record<string, number> {
  return { page, pageSize, total, pages: Math.ceil(total / pageSize) || 1 };
}
