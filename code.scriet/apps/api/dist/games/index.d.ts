import type { Express } from 'express';
import { registry } from './registry.js';
export interface Game {
    /** URL-safe identifier — becomes the path segment under /api/games. */
    id: string;
    /** Human-readable label for admin UI / audit logs. */
    name: string;
    /** Mount the router under /api/games/<id>. */
    mountRouter(app: Express): void;
}
export declare function mountGames(app: Express): void;
export { registry };
