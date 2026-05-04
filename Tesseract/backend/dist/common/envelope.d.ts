export type ApiMeta = Record<string, unknown> | null;
export type EnvelopeResult<T> = {
    __envelope: true;
    data: T;
    meta: ApiMeta;
};
export declare function withMeta<T>(data: T, meta: ApiMeta): EnvelopeResult<T>;
export declare function paginationMeta(page: number, pageSize: number, total: number): Record<string, number>;
