import type { Request } from "express";
import { FeatureService } from "../features/feature.service";
export declare class LeaderboardController {
    private readonly features;
    constructor(features: FeatureService);
    global(query: Record<string, unknown>, req: Request & {
        user?: {
            id: string;
        };
    }): Promise<import("../common/envelope").EnvelopeResult<never[]>>;
    game(_gameId: string, query: Record<string, unknown>): Promise<import("../common/envelope").EnvelopeResult<never[]>>;
}
