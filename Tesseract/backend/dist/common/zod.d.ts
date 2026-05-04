import { z } from "zod";
export declare function parseBody<T>(schema: z.Schema<T>, value: unknown): T;
export declare function parseQueryInt(value: unknown, fallback: number, min: number, max: number): number;
